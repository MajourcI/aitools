// OCR: извлечение текста с фото через зрение Groq (Llama 4 Scout)
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

async function ocrImage(dataUrl, hint) {
  const prompt = `Ты — точный OCR. Извлеки ВЕСЬ текст с этого изображения.

ПРАВИЛА:
- Перепиши текст дословно, на языке оригинала (обычно русский), кириллицей.
- Сохрани структуру: абзацы, переносы строк, списки.
- НЕ переводи, не пересказывай, не добавляй комментарии и markdown.
- Не вставляй случайные иностранные символы.
- Неразборчивое слово отметь [?], не выдумывай.
- Если текста нет — верни строго: НЕТ ТЕКСТА.${hint ? '\nКонтекст: ' + hint : ''}

Верни ТОЛЬКО извлечённый текст.`;

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0,
      max_tokens: 4000,
      messages: [
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
    console.log('Groq vision error:', JSON.stringify(data.error));
    throw new Error(data.error.message || 'Groq error');
  }
  return data.choices?.[0]?.message?.content?.trim() || null;
}

module.exports = function (app) {
  app.post('/api/ocr', async (req, res) => {
    try {
      const { image, hint } = req.body;
      if (!image || !/^data:image\//.test(image)) return res.status(400).json({ error: 'Нет изображения' });
      const b64 = (image.split(',')[1] || '');
      if (b64.length * 0.75 > 4 * 1024 * 1024) return res.status(400).json({ error: 'Фото слишком большое — сделай поменьше' });
      const text = await ocrImage(image, String(hint || '').slice(0, 200));
      if (!text) return res.status(500).json({ error: 'Пустой ответ от модели' });
      if (/^НЕТ ТЕКСТА$/i.test(text.trim())) return res.json({ result: '', empty: true });
      res.json({ result: text });
    } catch (e) {
      console.log('OCR error:', e.message);
      res.status(e.friendly ? 429 : 500).json({ error: e.friendly ? e.message : ('Ошибка: ' + e.message) });
    }
  });
};
