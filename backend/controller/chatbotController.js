const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const handleChatbotMessage = async (req, res) => {
  const { message } = req.body;

  try {
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tinyllama',
        messages: [
          {
            role: 'system',
            content: `You are GizmoBot, an AI chatbot for GizmoMart...`, // (your full instruction remains here)
          },
          { role: 'user', content: message },
        ],
        stream: false,
      }),
    });

    const data = await response.json();
    const reply = data.message?.content || 'Sorry, I could not understand.';
    res.json({ reply });
  } catch (error) {
    console.error('Ollama Chat Error:', error);
    res.status(500).json({ error: 'Something went wrong with Ollama.' });
  }
};

module.exports = { handleChatbotMessage };
