const express = require('express');
const router = express.Router();

/**
 * Common fetch helper for Groq API
 */
async function callGroq(messages, max_tokens = 100, temperature = 0.7) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  // We use dynamic import for node-fetch if global fetch is missing, 
  // but Node 18+ has native fetch. We will just use global fetch.
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      temperature,
      max_tokens
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API Error: ${err}`);
  }

  return response.json();
}

/**
 * POST /api/chat/compliment
 * Used by the Contact form 3D blocks to generate random fun reactions
 */
router.post('/compliment', async (req, res) => {
  const { focusedField, currentText } = req.body;

  try {
    const messages = [
      {
        role: "system",
        content: "You are a small, friendly character block living in a website. The user is filling out a contact form step by step. Engage conversationally with what they type, based on the field. Field contexts: 'name' = their personal name, 'email' = their email address, 'business' = their company name, 'requirements' = their project idea. Make a short reaction statement (max 6 words) about exactly what they typed. For example: name='John' -> 'John, welcome aboard!'. email='john@apple.com' -> 'Apple vibes detected!'. business='Samsung' -> 'Samsung is a legend!'. NEVER ask questions. Only make statements. Do not use quotes."
      },
      {
        role: "user",
        content: `User is typing in the ${focusedField} field: "${currentText}"`
      }
    ];

    const data = await callGroq(messages, 15, 0.8);
    let compliment = "NICE ONE!";
    if (data.choices && data.choices[0]) {
      compliment = data.choices[0].message.content.trim().replace(/["']/g, "");
    }
    res.json({ compliment });
  } catch (error) {
    console.error("[chat] Compliment error:", error.message);
    res.json({ compliment: "COOL!" }); // Fallback
  }
});

/**
 * POST /api/chat/message
 * Used by the main AI Chatbot
 */
router.post('/message', async (req, res) => {
  const { history, userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const messages = [
      {
        role: "system",
        content: "You are ZenthBot, an advanced AI assistant for Zenth, a premium digital engineering agency. You help users understand Zenth's services (3D WebGL websites, AI integration, SEO, architecture, full-stack development). You are professional, confident, and very concise. Keep your answers brief (1-3 sentences max). Suggest they use the contact form to hire Zenth."
      }
    ];

    // Append history
    if (Array.isArray(history)) {
      history.forEach(msg => {
        messages.push({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.text
        });
      });
    }

    // Append new message
    messages.push({
      role: "user",
      content: userMessage
    });

    const data = await callGroq(messages, 150, 0.7);
    if (data.choices && data.choices[0]) {
      res.json({ reply: data.choices[0].message.content.trim() });
    } else {
      res.status(500).json({ error: "No response from AI" });
    }
  } catch (error) {
    console.error("[chat] Message error:", error.message);
    res.status(500).json({ error: "Failed to generate AI response." });
  }
});

module.exports = router;
