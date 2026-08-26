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
      model: "groq/compound-mini",
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
  const { focusedField, currentText, isEmailValid } = req.body;

  try {
    const messages = [
      {
        role: "system",
        content: `You are a smart, friendly AI assistant living inside a contact form on a web agency's website (Zenth). The user is filling out the form step by step. React to what they type in max 7 words — be sharp, helpful, and human. Rules per field:
- 'name': if too short (<3 chars) say something like "That's a short name!", otherwise welcome them warmly.
- 'email': you are told whether the email is valid (isEmailValid). If isEmailValid is false, warn them clearly: e.g. "Hmm, that email looks fake.", "That doesn't look like a real email.", "Please use a real email address.". If valid, react positively to the domain (e.g. gmail, outlook, a company domain).
- 'business': react to the company name creatively.
- 'requirements': react encouragingly to their project idea.
NEVER ask questions. Only make short statements. Do not use quotes or punctuation at the end.`
      },
      {
        role: "user",
        content: `Field: ${focusedField}. Text typed: "${currentText}". isEmailValid: ${isEmailValid ?? true}.`
      }
    ];

    const data = await callGroq(messages, 60, 0.7);
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

    const data = await callGroq(messages, 1024, 0.7);
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
