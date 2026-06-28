require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();

// ---- Security: CORS закрыт на свои домены ----
const ALLOWED_ORIGINS = [
  'https://majourci.online',
  'https://www.majourci.online',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
app.use(cors({
  origin: function (origin, cb) {
    // разрешаем same-origin / curl / server-to-server (без Origin)
    if (!origin) return cb(null, true);
    return cb(null, ALLOWED_ORIGINS.includes(origin));
  }
}));

app.use(express.json({ limit: '8mb' }));
app.use(express.static('public'));

// ---- Реальный счётчик (персистится в stats.json) ----
const STATS_FILE = path.join(__dirname, 'stats.json');
const STATS_BASE = parseInt(process.env.STATS_BASE || '0', 10) || 0;
let statsCount = 0;
try { statsCount = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')).count || 0; } catch (e) {}
let statsDirty = false;
function bumpStats() { statsCount++; statsDirty = true; }
const flushTimer = setInterval(() => {
  if (!statsDirty) return;
  try { fs.writeFileSync(STATS_FILE, JSON.stringify({ count: statsCount })); statsDirty = false; } catch (e) {}
}, 5000);
if (flushTimer.unref) flushTimer.unref();

// Считаем каждый успешный AI-вызов (любой POST /api/* кроме /api/stats)
app.use((req, res, next) => {
  res.on('finish', () => {
    try {
      if (req.method === 'POST' && req.path.startsWith('/api/') && req.path !== '/api/stats' && res.statusCode < 400) bumpStats();
    } catch (e) {}
  });
  next();
});

// ---- Rate limiting (in-memory, по IP) ----
const rateBuckets = new Map();
function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = fwd || req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
    const now = Date.now();
    let b = rateBuckets.get(ip);
    if (!b || now > b.reset) { b = { count: 0, reset: now + windowMs }; rateBuckets.set(ip, b); }
    b.count++;
    if (b.count > max) {
      const wait = Math.max(1, Math.ceil((b.reset - now) / 1000));
      res.set('Retry-After', String(wait));
      return res.status(429).json({ error: `Слишком много запросов. Подожди ${wait} сек и попробуй снова 🙏` });
    }
    next();
  };
}
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateBuckets) if (now > v.reset) rateBuckets.delete(k);
}, 60000);
if (cleanupTimer.unref) cleanupTimer.unref();

// ---- Honeypot: отсекаем очевидных ботов (скрытое поле должно быть пустым) ----
function honeypot(req, res, next) {
  const hp = req.body && req.body.hp;
  if (typeof hp === 'string' && hp.trim()) return res.status(400).json({ error: 'Ошибка запроса' });
  next();
}

// Гарды на все API-роуты (вкл. те, что добавят модули ниже)
app.use('/api', rateLimit({ windowMs: 10 * 60 * 1000, max: 60 }));
app.use('/api', honeypot);

// Публичный счётчик
app.get('/api/stats', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ count: statsCount + STATS_BASE });
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';

async function callGroqChat(messages, temperature = 0.7, maxTokens = 2048) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature })
  });
  if (response.status === 429) {
    const e = new Error('Сейчас слишком много запросов к ИИ. Подожди 10–15 секунд и попробуй снова 🙏');
    e.friendly = true;
    throw e;
  }
  const data = await response.json();
  if (data.error) {
    console.log('Groq error:', data.error.message);
    if (/rate limit|too many|quota/i.test(data.error.message || '')) {
      const e = new Error('Сейчас слишком много запросов к ИИ. Подожди 10–15 секунд и попробуй снова 🙏');
      e.friendly = true;
      throw e;
    }
    return null;
  }
  return data.choices?.[0]?.message?.content?.trim() || null;
}

function cleanup(text) {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ')
    .replace(/ +([,.!?;:])/g, '$1').replace(/\n{3,}/g, '\n\n').trim();
}
function stripPreamble(text) {
  return text.replace(/^(вот|держи|конечно|готово|переписанный текст|результат)[^:\n]{0,40}:\s*/i, '')
    .replace(/^["'«»\s]+|["'«»\s]+$/g, '').trim();
}

app.post('/api/tool', async (req, res) => {
  const { toolType, userText, sampleText, options } = req.body;
  if (!userText?.trim()) return res.status(400).json({ error: 'Нет текста' });

  try {
    let result;
    const t = String(toolType || '').toLowerCase();
    const isHumanize = t.includes('human') || t.includes('akadem') || t.includes('академ') || t === 'academic';

    if (isHumanize) {
      const academic = t.includes('akadem') || t.includes('академ') || t === 'academic'
        || /acad|академ|науч/i.test(String(options?.mode || options?.level || ''));

      const sRaw = String(options?.strength || '').toLowerCase();
      const strength = /max|макс|жест|сил|hard|3/.test(sRaw) ? 'max'
        : /light|лёг|лег|мягк|слаб|1/.test(sRaw) ? 'light' : 'medium';

      const t1 = strength === 'max' ? 0.95 : strength === 'light' ? 0.75 : 0.88;
      const t2 = strength === 'max' ? 0.9 : strength === 'light' ? 0.78 : 0.85;

      // --- ПРОХОД 1: глубокий человеческий рерайт ---
      const sys1 = academic
        ? 'Ты — редактор научных текстов. Переписываешь академический текст живым человеческим языком, сохраняя научность и термины, но убирая всё, что выдаёт нейросеть. Пишешь на русском.'
        : 'Ты — редактор, который переписывает текст так, чтобы он звучал как живая речь реального человека, а не нейросети. Пишешь на русском.';

      const usr1 = `Перепиши текст заново, своими словами, как написал бы живой человек. Это критично:\n\n1. РИТМ: естественно чередуй длину предложений — где-то короткое, где-то среднее. Одинаковая длина всех предложений — главный признак ИИ, убери её.\n2. ЖИВЫЕ СЛОВА: избегай предсказуемых «средних» формулировок. Где можно — конкретика, простые слова и живые глаголы вместо канцелярских.\n3. УБЕРИ ШТАМПЫ ИИ (перестраивай фразу, не выкидывай смысл): «таким образом», «важно отметить», «следует подчеркнуть», «в заключение», «кроме того», «играет важную роль», «в современном мире», «данный», «является», «позволяет», «обеспечивает».\n4. СТРУКТУРА: меняй порядок мыслей и подачу, не повторяй схему абзац-в-абзац.\n5. ${academic ? 'Сохраняй научный стиль и терминологию, но формулируй по-человечески, без канцелярита.' : 'Пиши простым, живым, но грамотным языком — как объяснил бы умный человек, а не учебник.'}\n${strength === 'max' ? '6. РЕЖИМ МАКСИМУМ: перестраивай смелее и глубже, лишь бы смысл и факты остались.' : strength === 'light' ? '6. Меняй умеренно, держись ближе к оригиналу.' : ''}\n\nЖЁСТКО: сохрани смысл, все факты и примерный объём. Ничего не выдумывай. Не используй markdown. Верни ТОЛЬКО переписанный текст.\n\nИСХОДНЫЙ ТЕКСТ:\n${userText}`;

      const p1 = await callGroqChat([{ role: 'system', content: sys1 }, { role: 'user', content: usr1 }], t1, 3000);
      if (!p1) return res.status(500).json({ error: 'AI не ответил, попробуй ещё раз' });

      // --- ПРОХОД 2: живой ритм + читаемость (без рубленых обрывков) ---
      const voiceHint = sampleText ? `\n- Подстройся под манеру автора из образца:\n"""${sampleText}"""` : '';
      const sys2 = 'Ты — отличный редактор. Доводишь текст до живого, естественного и приятного для чтения вида, как написал бы умный человек. Смысл не меняешь. Пишешь на русском.';
      const usr2 = `Доработай текст так, чтобы он читался живо и естественно, без следов нейросети.\n\nГЛАВНОЕ — ЧИТАЕМОСТЬ И ЖИВОЙ РИТМ:\n- Сильно варьируй длину предложений — это самый заметный признак живого текста. Чередуй длинные, средние и иногда совсем короткие (в 3–6 слов). Но НЕ руби текст на телеграфные обрывки: каждое предложение должно читаться гладко само по себе.\n- Раздутые, перегруженные предложения (где склеено несколько мыслей через «и», «который», «что») раздели на два нормальных — но не на кучу обрубков.\n- Варьируй и длину абзацев: не делай их одинаковыми по размеру.\n- Убери канцелярит и штампы ИИ. Делай переходы естественными, а не через «таким образом» и «итак».\n- Немного живой текстуры, где уместно: иногда лёгкая оценка или короткий вопрос${academic ? ' (но без потери научности)' : ''}. Без перебора и без сленга, если текст серьёзный.\n\nВОТ КАК НАДО ПЕРЕДЕЛЫВАТЬ (учись на примерах — заметь, что получается ГЛАДКО, а не рвано):\n\nБыло (звучит как ИИ): «Тёмная материя занимает около двадцати семи процентов всей массы и энергии Вселенной и удерживает галактики от распада своей гравитацией.»\nСтало (живо и читаемо): «Около двадцати семи процентов всей массы и энергии Вселенной — это тёмная материя. Именно её гравитация удерживает галактики и не даёт им разлететься.»\n\nБыло: «Современная астрофизика рассматривает Вселенную как глобальную лабораторию, в которой законы физики формируют материю от простейших атомов до сложных структур.»\nСтало: «Астрофизики смотрят на Вселенную как на гигантскую лабораторию. В ней законы физики лепят материю — от простейших атомов до сложных структур.»\n${voiceHint}\n\nТеперь так же доработай весь следующий текст. Сохрани смысл, факты и примерный объём. Не используй markdown. Верни ТОЛЬКО готовый текст.\n\nТЕКСТ:\n${p1}`;

      let p2 = null;
      try { p2 = await callGroqChat([{ role: 'system', content: sys2 }, { role: 'user', content: usr2 }], t2, 3000); }
      catch (e) { if (!e.friendly) throw e; }

      result = cleanup(stripPreamble(p2 || p1));

    } else if (t === 'shorten') {
      const pct = options?.percent || 50;
      const sys = 'Ты опытный редактор. Сокращаешь текст на русском, сохраняя смысл, факты и логику изложения. Ничего не выдумываешь.';
      const usr = `Сократи текст примерно до ${pct}% от исходного объёма.\n- Сохрани все ключевые мысли, факты и выводы.\n- Убери воду, повторы, вводные обороты и второстепенные детали.\n- Сохрани исходную структуру и абзацы, если они есть.\n- Не добавляй ничего нового и не искажай смысл.\nВерни только сокращённый текст, без пояснений.\n\nТЕКСТ:\n${userText}`;
      result = await callGroqChat([{ role: 'system', content: sys }, { role: 'user', content: usr }], 0.4, 2048);
      result = result && cleanup(stripPreamble(result));

    } else if (t === 'restyle') {
      const styles = {
        business: 'деловой и профессиональный — чётко, формально, без лишних слов',
        casual: 'живой разговорный — как объясняешь другу, просто и по-человечески',
        social: 'для соцсетей — цепляющий крючок в начале, короткие абзацы, динамично',
        student: 'студенческий — грамотно, но своими словами, без официоза',
      };
      const s = styles[options?.style] || styles.casual;
      const sys = 'Ты редактор-копирайтер. Переписываешь текст в заданном стиле на русском, полностью сохраняя смысл и факты. Возвращаешь только готовый текст.';
      const usr = `Перепиши текст в стиле: ${s}.\n- Полностью сохрани смысл и все факты.\n- Измени подачу, тон, ритм и формулировки под этот стиль.\n- Не используй символы markdown (**, #, * и т.п.).\nВерни только переписанный текст.\n\nТЕКСТ:\n${userText}`;
      result = await callGroqChat([{ role: 'system', content: sys }, { role: 'user', content: usr }], 0.75, 2048);
      result = result && cleanup(stripPreamble(result));

    } else {
      const prompts = {
        rewrite: {
          sys: 'Ты опытный редактор. Улучшаешь текст на русском: грамотность, ясность, связность и стиль. Смысл и факты не меняешь.',
          usr: `Перепиши текст, сделав его чище, грамотнее и приятнее для чтения.\n- Исправь ошибки, тяжёлые конструкции и канцелярит.\n- Сохрани смысл, факты и примерный объём.\n- Не добавляй новой информации.\n- Без markdown.\nВерни только готовый текст.\n\nТЕКСТ:\n${userText}`,
          temp: 0.6
        },
        resume: {
          sys: 'Ты карьерный консультант и редактор резюме. Делаешь резюме на русском сильным и убедительным для работодателя.',
          usr: `Улучши это резюме (или его фрагмент):\n- Формулируй опыт и достижения сильными глаголами действия (разработал, увеличил, внедрил, запустил).\n- Делай акцент на конкретике и результате, где это возможно.\n- Убери воду и пустые штампы вроде «ответственный, коммуникабельный» без подтверждения.\n- Сохрани все реальные факты. НЕ выдумывай опыт, цифры, места работы и навыки, которых нет в тексте.\n- Пиши чётко и профессионально, без markdown.\nВерни только улучшенный текст резюме.\n\nИСХОДНОЕ РЕЗЮМЕ:\n${userText}`,
          temp: 0.6
        },
        ideas: {
          sys: 'Ты — опытный контент-стратег. Придумываешь сильные, конкретные и небанальные идеи контента на русском. Терпеть не можешь шаблоны уровня «Топ-10 советов» и общие фразы.',
          usr: `Тема или ниша: «${userText}».\n\nПридумай 10 идей для контента, которые реально захочется открыть и сделать.\n\nТРЕБОВАНИЯ:\n- Никаких банальностей: запрещены «Топ-5 советов», «Всё, что нужно знать», «Основы для новичков», «Как улучшить X». Каждая идея — со свежим углом.\n- Разные форматы и жанры: личная история или провал, разбор кейса, «миф против правды», пошаговый гайд, чек-лист, неожиданное мнение, разбор частой ошибки, сравнение, закулисье.\n- Конкретика вместо абстракций: не «как вести блог», а «3 ошибки в первом посте, из-за которых тебя не дочитывают».\n\nФОРМАТ ВЫВОДА (ровно так, без вступлений):\n1. Цепляющий заголовок — короткое пояснение, о чём и почему зайдёт. Формат: (Reels / карусель / лонгрид / видео / Stories).\n\nДай ровно 10 идей, пронумерованных 1–10.`,
          temp: 0.95,
          noClean: true
        },
      };
      const cfg = prompts[t];
      if (!cfg) return res.status(400).json({ error: 'Неизвестный инструмент' });
      result = await callGroqChat([{ role: 'system', content: cfg.sys }, { role: 'user', content: cfg.usr }], cfg.temp, 2048);
      if (result && !cfg.noClean) result = cleanup(stripPreamble(result));
    }

    if (!result) return res.status(500).json({ error: 'Нет ответа от AI' });
    console.log(`[${t}] OK ${result.length} chars`);
    res.json({ result });
  } catch (e) {
    console.log('Ошибка:', e.message);
    res.status(e.friendly ? 429 : 500).json({ error: e.friendly ? e.message : 'Ошибка сервера' });
  }
});

const PORT = process.env.PORT || 3000;
require('./routes_study')(app, callGroqChat);
require('./routes_ocr')(app);

// ---- 404: дружелюбная страница для сайта, JSON для API ----
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Не найдено' });
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => console.log(`Сервер на порту ${PORT}`));
