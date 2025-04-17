import React, { useState } from 'react';
import axios from 'axios';
import './ChatBot.css';

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [show, setShow] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;

    const userMsg = { sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setText('');

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/chatbot/ask`,
        { message: text },
        { withCredentials: true }
      );

      const botMsg = { sender: 'bot', text: res.data.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const botMsg = { sender: 'bot', text: 'Error talking to chatbot.' };
      setMessages((prev) => [...prev, botMsg]);
    }
  };

  return (
    <div>
      <button className="chatbot-toggle" onClick={() => setShow(!show)}>
        🤖
      </button>

      {show && (
        <div className="chatbot-container">
          <div className="chatbot-header">GizmoBot</div>
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
          </div>
          <div className="chatbot-input">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask me anything..."
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
