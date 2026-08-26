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
        content: `You are a sharp, witty AI living inside a dark-themed futuristic contact form for a premium web agency. 
Your ONLY job is to react to the single field the user just completed.
Respond with EXACTLY 1 to 7 words. Do not ask questions. Do not use quotes.

Rules by field:
- 'name': Greet them warmly. E.g., "Nice to meet you", "Welcome, [Name]", "Love that name".
- 'email': 
    - If isEmailValid is FALSE, you MUST warn them the email is invalid. E.g., "That email looks fake.", "Invalid email address.", "Check your email typo."
    - If isEmailValid is TRUE, react to their domain. E.g., "Gmail, classic.", "Pro email, nice.", "Got your email."
- 'business': Sound intrigued or impressed by their company name. E.g., "Great business name.", "Sounds like a solid company.", "Love the brand."
- 'requirements': React to their project idea. E.g., "Exciting project.", "We can definitely build that.", "Let's make it happen."

You must STRICTLY follow the isEmailValid boolean.`
      },
      {
        role: "user",
        content: `Field: ${focusedField}. Text typed: "${currentText}". isEmailValid: ${isEmailValid ?? true}.`
      }
    ];

    const data = await callGroq(messages, 60, 0.7);
    let compliment = "";
    if (data.choices && data.choices[0]) {
      compliment = data.choices[0].message.content.trim().replace(/["']/g, "");
    }
    res.json({ compliment });
  } catch (error) {
    console.error("[chat] Compliment error:", error.message);
    res.status(500).json({ error: "Failed to generate reaction" });
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
