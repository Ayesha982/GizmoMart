const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const handleChatbotMessage = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await fetch(process.env.OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are GizmoBot, an AI chatbot for GizmoMart. You help users with product recommendations, order tracking, and general questions related to the store.`,
          },
          { role: 'user', content: message },
        ],
      }),
    });

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || 'Sorry, I could not understand that.';

    // Format numbered lists
    reply = reply.replace(/(\d\.)\s*/g, '\n$1 ');

    res.json({ reply });

  } catch (error) {
    console.error('OpenAI Chatbot Error:', error.message);
    res.status(500).json({ error: 'Something went wrong while talking to the chatbot.' });
  }
};

module.exports = { handleChatbotMessage };
