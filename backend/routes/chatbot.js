const express = require('express');
const router = express.Router();
const OrderModel = require('../models/orderProductModel');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

router.post('/ask', async (req, res) => {
  const { message } = req.body;

  try {
    // 1️⃣ Check for order status using MongoDB ObjectId or numeric ID
    const orderMatch = message.match(/order\s*#?([a-f0-9]{24}|\d+)/i);
    if (orderMatch) {
      const orderId = orderMatch[1];
      const order = await OrderModel.findById(orderId);

      if (order) {
        const status = order.paymentDetails?.payment_status || 'Processing';
        const totalAmount = order.totalAmount || 0;
        const products = order.productDetails?.map(p => p.name).join(', ') || 'N/A';

        return res.json({
          reply: `✅ Order Status for #${orderId}:\n\n📦 Products: ${products}\n💰 Total Amount: ₹${totalAmount}\n📍 Current Status: ${status}\n\nThank you for shopping with GizmoMart! 🎉`
        });
      } else {
        return res.json({
          reply: `❌ Sorry, I couldn't find order #${orderId}. Please double-check the order number or contact our support team.`
        });
      }
    }

    // 2️⃣ Quick keyword-based responses (FAQs and common queries)
    const lower = message.toLowerCase();

    if (lower.includes("return") && lower.includes("airpods")) {
      return res.json({ reply: "❌ No, sorry. Apple does not offer returns or exchanges for AirPods." });
    }

    if (lower.includes("iphone 14")) {
      return res.json({ reply: "📱 The iPhone 14 features an A15 chip, dual-camera system, and 5G support. Available now on GizmoMart." });
    }

    if (lower.includes("return policy")) {
      return res.json({ reply: "🔁 Most items can be returned within 7 days of delivery. Please read our return policy on the GizmoMart website for details." });
    }

    if (lower.includes("offers") && lower.includes("mobile")) {
      return res.json({ reply: "🎉 Yes! Mobiles are up to 20% off this week at GizmoMart! Don't miss out!" });
    }

    if (lower.includes("cameras under ₹50000") || lower.includes("camera under ₹50000")) {
      return res.json({
        reply: "📸 Here are a few popular cameras under ₹50,000:\n- Canon EOS 200D – ₹48,999\n- Nikon D3500 – ₹47,500"
      });
    }

    // 3️⃣ If no match found, forward to TinyLlama via Ollama
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tinyllama',
        messages: [
          {
            role: 'system',
            content: `You are GizmoBot, an AI chatbot for GizmoMart. Answer user queries politely and helpfully. Here are specific instructions:

- If the user asks about returning AirPods or AirPod: Always reply with: "No, sorry. Apple does not offer returns or exchanges for these products."
- For product queries like "Tell me about the iPhone 14", give short and clear basic info.
- For order status like "Where is my order #12345?", reply with: "Please check your account order history or contact support."
- For discount/offers like "Any offers on mobiles?", reply with: "Yes! Mobiles are up to 20% off this week at GizmoMart!"
- For category queries like "Show me cameras under ₹50,000", say: "Here are a few popular cameras under ₹50,000: Canon EOS 200D - ₹48,999, Nikon D3500 - ₹47,500."

Only answer what's asked. Don't mix topics. Keep responses short and easy to understand.`,
          },
          { role: 'user', content: message },
        ],
        stream: false,
      }),
    });

    const data = await response.json();
    const reply = data.message?.content || '❓ Sorry, I could not understand that. Can you rephrase?';
    res.json({ reply });

  } catch (error) {
    console.error('Chatbot Error:', error);
    res.status(500).json({ error: 'Something went wrong on the chatbot server.' });
  }
});

module.exports = router;
