// OCR: извлечение текста с фото через зрение Groq (Llama 4)
const VISION_MODEL = 'meta-llama/llama-4-maverick-17b-128e-instruct';

async function ocrImage(dataUrl, hint) {
  const sys = 'Ты — точный OCR-движок. Дословно переписываешь весь текст с изображения, ничего не добавляя, не переводя и не выдумывая.';
  const prompt = `Извлеки ВЕСЬ текст с этого изображения.

ПРАВИЛА:
- Перепиши текст дословно, на том же языке, что на картинке (обычно русский).
- Сохрани структуру: абзацы, переносы строк, списки, заголовки.
- НЕ переводи, НЕ пересказывай, не добавляй своих комментариев и markdown.
- Не вставляй случайные иностранные символы. Русский текст пиши кириллицей.
- Неразборчивое слово отметь как [?], но не выдумывай.
- Если текста на изображении нет — верни строго: НЕТ ТЕКСТА.${hint ? '\nКонтекст от пользователя: ' + hint : ''}

Верни ТОЛЬКО извлечённый текст.`;

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ] }
      ]
    })
  });

  if (r.status === 429) { const e = new Error('Сейчас слишком много запросов к ИИ. Подожди 10–15 секунд и попробуй снова 🙏'); e.friendly = true; throw e; }
  const data = await r.json();
  if (data.error) {
    console.log('Groq vision error:', data.error.message);
    if (/rate limit|too many|quota/i.test(data.error.message || '')) { const e = new Error('Сейчас слишком много запросов к ИИ. Подожди 10–15 секунд и попробуй снова 🙏'); e.friendly = true; throw e; }
    return null;
  }
  return data.choices?.[0]?.message?.content?.trim() || null;
}

module.exports = function (app) {
  app.post('/api/ocr', async (req, res) => {
    try {
      const { image, hint } = req.body;
      if (!image || !/^data:image\//.test(image)) return res.status(400).json({ error: 'Нет изображения' });
      const b64 = (image.split(',')[1] || '');
      if (b64.length * 0.75 > 4 * 1024 * 1024) return res.status(400).json({ error: 'Фото слишком большое — сделай фото поменьше' });
      const text = await ocrImage(image, String(hint || '').slice(0, 200));
      if (!text) return res.status(500).json({ error: 'Не удалось распознать текст. Попробуй фото почётче.' });
      if (/^НЕТ ТЕКСТА$/i.test(text.trim())) return res.json({ result: '', empty: true });
      res.json({ result: text });
    } catch (e) {
      console.log('OCR error:', e.message);
      res.status(e.friendly ? 429 : 500).json({ error: e.friendly ? e.message : 'Ошибка сервера' });
    }
  });
};
