require('dotenv').config(); 
async function callGroq(messages, max_tokens = 250, temperature = 0.8) { 
  const apiKey = process.env.GROQ_API_KEY; 
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey }, 
    body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages, temperature, max_tokens }) 
  }); 
  if (!response.ok) { throw new Error(await response.text()); } 
  return response.json(); 
} 
async function test() { 
  try { 
    const messages = [
      {role: 'system', content: "You are a small, friendly character block living in a website. The user is filling out a contact form step by step. Engage conversationally with what they type, based on the field. Field contexts: 'name' = their personal name, 'email' = their email address, 'business' = their company name, 'requirements' = their project idea. Make a short reaction statement (max 6 words) about exactly what they typed. For example: name='John' -> 'John, welcome aboard!'. email='john@apple.com' -> 'Apple vibes detected!'. business='Samsung' -> 'Samsung is a legend!'. NEVER ask questions. Only make statements. Do not use quotes."}, 
      {role: 'user', content: 'User is typing in the name field: "mayank"'}
    ]; 
    const data = await callGroq(messages); 
    console.log(JSON.stringify(data.choices[0].message)); 
  } catch (e) { 
    console.error('ERROR:', e.message); 
  } 
} 
test();
