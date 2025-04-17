const express = require('express');
const router = express.Router();
const { handleChatbotMessage } = require('../controllers/chatbotController');

router.post('/ask', handleChatbotMessage);

module.exports = router;
