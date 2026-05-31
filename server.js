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
async function callGroq(prompt, temperature = 0.7, maxTokens = 2048) {
  return callGroqChat([{ role: 'user', content: prompt }], temperature, maxTokens);
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

      const sys1 = academic
        ? 'Ты переписываешь академический текст живым, но научным языком — своими словами, без канцелярита и штампов. Пишешь на русском.'
        : 'Ты переписываешь текст простым живым языком — своими словами, как объяснил бы человек. Пишешь на русском.';
      const usr1 = `Перепиши текст, переформулировав мысли своими словами (не подменой синонимов): - Меняй структуру и чередуй длину предложений: где-то короткое, где-то длинное. - Убери канцелярит и клише («следует отметить», «таким образом», «играет ключевую роль») перестройкой фраз. - Сохрани смысл, факты и примерный объём. Ничего не выдумывай. Верни только текст.  ${userText}`;
      const p1 = await callGroqChat([{ role: 'system', content: sys1 }, { role: 'user', content: usr1 }], 0.85, 3000);
      if (!p1) return res.status(500).json({ error: 'AI не ответил, попробуй ещё раз' });

      const voiceHint = sampleText ? `\nПодстройся под манеру автора:\n"""${sampleText}"""` : '';
      const sys2 = 'Ты придаёшь тексту естественный человеческий голос, не меняя смысл. Пишешь на русском.';
      const usr2 = `Доработай текст, чтобы он читался как написанный человеком: - Сделай ритм неровным: после длинного предложения — короткое. - ${academic ? 'Сохрани научный стиль, добавь естественные переходы без штампов.' : 'Где уместно, добавь живые обороты речи, но без перебора.'} - Убери всё, что звучит шаблонно и «по-нейросетевому». - Сохрани смысл и объём.${voiceHint} Верни только текст.  ${p1}`;
      let p2 = null;
      try { p2 = await callGroqChat([{ role: 'system', content: sys2 }, { role: 'user', content: usr2 }], 0.9, 3000); }
      catch (e) { if (!e.friendly) throw e; } // если 2-й проход упёрся в лимит — отдадим 1-й

      result = cleanup(stripPreamble(p2 || p1));

    } else if (t === 'shorten') {
      const pct = options?.percent || 50;
      result = await callGroq(`Сократи текст до ${pct}% от исходного. Оставь главное, убери воду и повторы. Только результат:\n\n${userText}`);
      result = result && cleanup(stripPreamble(result));

    } else if (t === 'restyle') {
      const styles = {
        business: 'деловой и профессиональный — чётко, формально, без лишних слов',
        casual: 'живой разговорный — как объясняешь другу, просто и по-человечески',
        social: 'для соцсетей — цепляющий крючок в начале, короткие абзацы, динамично',
        student: 'студенческий — грамотно, но своими словами, без официоза',
      };
      const s = styles[options?.style] || styles.casual;
      result = await callGroq(`Перепиши текст в стиле: ${s}. Сохрани смысл. Только результат:\n\n${userText}`);
      result = result && cleanup(stripPreamble(result));

    } else {
      const prompts = {
        rewrite: `Перепиши этот текст — чище, грамотнее, профессиональнее. Только результат:\n\n${userText}`,
        resume: `Улучши резюме — убедительно и профессионально. Только результат:\n\n${userText}`,
        ideas: `Придумай 10 идей для контента на тему: "${userText}". Пронумеруй, каждая идея — одна строка.`,
      };
      const prompt = prompts[t];
      if (!prompt) return res.status(400).json({ error: 'Неизвестный инструмент' });
      result = await callGroq(prompt);
      if (result && t !== 'ideas') result = cleanup(stripPreamble(result));
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