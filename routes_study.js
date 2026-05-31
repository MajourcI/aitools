const path = require('path');
const express = require('express');

module.exports = function (app, callGroqChat) {
  // Чистые ссылки: /chat откроет chat.html, /vopros → vopros.html и т.д.
  app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

  // 1. Вопросы по тексту
  app.post('/api/ask', async (req, res) => {
    try {
      const text = String((req.body && req.body.text) || '').trim();
      const question = String((req.body && req.body.question) || '').trim();
      if (!text) return res.status(400).json({ error: 'Вставьте текст' });
      if (!question) return res.status(400).json({ error: 'Введите вопрос' });
      const messages = [
        { role: 'system', content: 'Ты помощник, который отвечает на вопросы СТРОГО по предоставленному тексту. Отвечай на русском, ясно и по делу. Если в тексте нет ответа — честно напиши: «В тексте нет ответа на этот вопрос». Не выдумывай факты, которых нет в тексте.' },
        { role: 'user', content: 'ТЕКСТ:\n"""\n' + text.slice(0, 12000) + '\n"""\n\nВОПРОС: ' + question + '\n\nОтветь по тексту выше.' }
      ];
      const answer = await callGroqChat(messages, 0.3, 1500);
      res.json({ result: String(answer || '').trim() });
    } catch (e) { console.error('ask error', e); res.status(500).json({ error: 'Ошибка сервера, попробуйте ещё раз' }); }
  });

  // 2. Генератор текста
  app.post('/api/generate', async (req, res) => {
    try {
      const topic = String((req.body && req.body.topic) || '').trim();
      const type = String((req.body && req.body.type) || 'referat');
      const length = String((req.body && req.body.length) || 'medium');
      const extra = String((req.body && req.body.extra) || '').trim();
      if (!topic) return res.status(400).json({ error: 'Введите тему' });
      const typeMap = {
        referat: 'реферат: с введением, основной частью из нескольких разделов с подзаголовками и заключением',
        essay: 'эссе: связный авторский текст с чётким тезисом, аргументами и выводом',
        doklad: 'доклад для устного выступления: с понятной структурой и логичными переходами',
        konspekt: 'конспект: сжатое изложение темы по пунктам с ключевыми мыслями'
      };
      const lengthMap = { short: 'примерно 250-400 слов', medium: 'примерно 500-800 слов', long: 'примерно 1000-1500 слов' };
      const structure = typeMap[type] || typeMap.referat;
      const size = lengthMap[length] || lengthMap.medium;
      const messages = [
        { role: 'system', content: 'Ты помогаешь студентам писать учебные работы на русском языке. Пиши грамотно и по структуре, академическим, но живым языком. Не используй символы markdown (**, #, * и т.п.) — заголовки пиши обычным текстом на отдельной строке.' },
        { role: 'user', content: 'Напиши ' + structure + ' на тему: «' + topic + '». Объём: ' + size + '.' + (extra ? ' Дополнительные пожелания: ' + extra : '') }
      ];
      const result = await callGroqChat(messages, 0.7, 3500);
      res.json({ result: String(result || '').trim() });
    } catch (e) { console.error('generate error', e); res.status(500).json({ error: 'Ошибка сервера, попробуйте ещё раз' }); }
  });

  // 3. Свободный чат
  app.post('/api/chat', async (req, res) => {
    try {
      const raw = (req.body && req.body.messages) || [];
      if (!Array.isArray(raw) || raw.length === 0) return res.status(400).json({ error: 'Пустой запрос' });
      const history = raw.slice(-20).map(m => ({
        role: m && m.role === 'assistant' ? 'assistant' : 'user',
        content: String((m && m.content) || '').slice(0, 4000)
      }));
      const messages = [
        { role: 'system', content: 'Ты — дружелюбный и умный ИИ-ассистент, общаешься на русском языке. Помогаешь с любыми вопросами: объяснения, учёба, идеи, тексты, советы. Отвечай ясно, по делу и без воды.' },
        ...history
      ];
      const answer = await callGroqChat(messages, 0.7, 2000);
      res.json({ result: String(answer || '').trim() });
    } catch (e) { console.error('chat error', e); res.status(500).json({ error: 'Ошибка сервера, попробуйте ещё раз' }); }
  });
};