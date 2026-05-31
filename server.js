require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

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

      // регулятор силы: light / medium / max
      const sRaw = String(options?.strength || '').toLowerCase();
      const strength = /max|макс|жест|сил|hard|3/.test(sRaw) ? 'max'
        : /light|лёг|лег|мягк|слаб|1/.test(sRaw) ? 'light' : 'medium';

      const t1 = strength === 'max' ? 0.95 : strength === 'light' ? 0.75 : 0.88;
      const t2 = strength === 'max' ? 0.97 : strength === 'light' ? 0.8 : 0.92;

      const sys1 = academic
        ? 'Ты — редактор научных текстов. Переписываешь академический текст живым человеческим языком, сохраняя научность и термины, но убирая всё, что выдаёт нейросеть. Пишешь на русском.'
        : 'Ты — редактор, который переписывает текст так, чтобы он звучал как живая речь реального человека, а не нейросети. Пишешь на русском.';

      const usr1 = `Перепиши текст заново, своими словами, как написал бы живой человек. Это критично:

1. РИТМ: сознательно чередуй длину предложений — рядом очень короткое (3–5 слов) и длинное. Одинаковая длина предложений — главный признак ИИ, убей его.
2. ЖИВЫЕ СЛОВА: избегай предсказуемых «средних» формулировок. Где можно — конкретика, простые слова и живые глаголы вместо канцелярских.
3. УБЕРИ ШТАМПЫ ИИ (перестраивай фразу, не выкидывай смысл): «таким образом», «важно отметить», «следует подчеркнуть», «в заключение», «кроме того», «играет важную роль», «в современном мире», «данный», «является», «позволяет», «обеспечивает».
4. СТРУКТУРА: меняй порядок мыслей и подачу, не повторяй схему абзац-в-абзац. Можно начинать предложение с союза (И, Но, А), задать риторический вопрос, вставить короткое пояснение в скобках.
5. ${academic ? 'Сохраняй научный стиль и терминологию, но формулируй по-человечески, без сухого канцелярита.' : 'Пиши простым, живым, но грамотным языком — как объяснил бы умный человек, а не учебник.'}
${strength === 'max' ? '6. РЕЖИМ МАКСИМУМ: перестраивай смелее и глубже, лишь бы смысл и факты остались.' : strength === 'light' ? '6. Меняй умеренно, держись ближе к оригиналу.' : ''}

ЖЁСТКО: сохрани смысл, все факты и примерный объём. Ничего не выдумывай. Не используй markdown. Верни ТОЛЬКО переписанный текст, без вступлений.

ИСХОДНЫЙ ТЕКСТ:
${userText}`;

      const p1 = await callGroqChat([{ role: 'system', content: sys1 }, { role: 'user', content: usr1 }], t1, 3000);
      if (!p1) return res.status(500).json({ error: 'AI не ответил, попробуй ещё раз' });

      const voiceHint = sampleText ? `\n- Подстройся под манеру автора из этого образца:\n"""${sampleText}"""` : '';
      const sys2 = 'Ты доводишь текст до состояния, когда его невозможно отличить от написанного живым человеком. Смысл не меняешь. Пишешь на русском.';
      const usr2 = `Доработай текст, чтобы он читался на 100% по-человечески:

- Пройдись и убери ВСЁ, что ещё звучит шаблонно или «по-нейросетевому»: ровные одинаковые предложения, безличные обороты, избыток вводных слов.
- Усиль неровность ритма: после длинного предложения — короткое, рубленое. Где-то поставь совсем короткую фразу из 2–3 слов.
- Сделай абзацы разной длины, переходы — естественными, без «таким образом» и «итак».
- ${academic ? 'Сохрани научность и точность терминов.' : 'Допускай живые разговорные обороты, где это уместно (без сленга, если текст серьёзный).'}${strength === 'max' ? '\n- Режим максимум: не бойся переписывать сильнее.' : ''}${voiceHint}

Сохрани смысл, факты и объём. Не используй markdown. Верни ТОЛЬКО финальный текст.

ТЕКСТ:
${p1}`;

      let p2 = null;
      try { p2 = await callGroqChat([{ role: 'system', content: sys2 }, { role: 'user', content: usr2 }], t2, 3000); }
      catch (e) { if (!e.friendly) throw e; } // если 2-й проход упёрся в лимит — отдаём 1-й

      result = cleanup(stripPreamble(p2 || p1));

    } else if (t === 'shorten') {
      const pct = options?.percent || 50;
      const sys = 'Ты опытный редактор. Сокращаешь текст на русском, сохраняя смысл, факты и логику изложения. Ничего не выдумываешь.';
      const usr = `Сократи текст примерно до ${pct}% от исходного объёма.
- Сохрани все ключевые мысли, факты и выводы.
- Убери воду, повторы, вводные обороты и второстепенные детали.
- Сохрани исходную структуру и абзацы, если они есть.
- Не добавляй ничего нового и не искажай смысл.
Верни только сокращённый текст, без пояснений.

ТЕКСТ:
${userText}`;
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
      const usr = `Перепиши текст в стиле: ${s}.
- Полностью сохрани смысл и все факты.
- Измени подачу, тон, ритм и формулировки под этот стиль.
- Не используй символы markdown (**, #, * и т.п.).
Верни только переписанный текст.

ТЕКСТ:
${userText}`;
      result = await callGroqChat([{ role: 'system', content: sys }, { role: 'user', content: usr }], 0.75, 2048);
      result = result && cleanup(stripPreamble(result));

    } else {
      const prompts = {
        rewrite: {
          sys: 'Ты опытный редактор. Улучшаешь текст на русском: грамотность, ясность, связность и стиль. Смысл и факты не меняешь.',
          usr: `Перепиши текст, сделав его чище, грамотнее и приятнее для чтения.
- Исправь ошибки, тяжёлые конструкции и канцелярит.
- Сохрани смысл, факты и примерный объём.
- Не добавляй новой информации.
- Без markdown.
Верни только готовый текст.

ТЕКСТ:
${userText}`,
          temp: 0.6
        },
        resume: {
          sys: 'Ты карьерный консультант и редактор резюме. Делаешь резюме на русском сильным и убедительным для работодателя.',
          usr: `Улучши это резюме (или его фрагмент):
- Формулируй опыт и достижения сильными глаголами действия (разработал, увеличил, внедрил, запустил).
- Делай акцент на конкретике и результате, где это возможно.
- Убери воду и пустые штампы вроде «ответственный, коммуникабельный» без подтверждения.
- Сохрани все реальные факты. НЕ выдумывай опыт, цифры, места работы и навыки, которых нет в тексте.
- Пиши чётко и профессионально, без markdown.
Верни только улучшенный текст резюме.

ИСХОДНОЕ РЕЗЮМЕ:
${userText}`,
          temp: 0.6
        },
        ideas: {
          sys: 'Ты креативный контент-стратег. Генерируешь идеи на русском — конкретные, разнообразные и применимые на практике.',
          usr: `Придумай 10 идей для контента на тему: «${userText}».
- Каждая идея с новой строки, пронумерована (1., 2., ... 10.).
- Формат идеи: цепляющий заголовок — одно предложение пояснения через тире.
- Идеи должны быть разными по углу и формату (список, история, разбор, гайд, личное мнение, мифы и т.п.).
Верни только список из 10 идей.`,
          temp: 0.9,
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
app.listen(PORT, () => console.log(`Сервер на порту ${PORT}`));
