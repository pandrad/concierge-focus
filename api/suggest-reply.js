import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { emailFrom, emailSubject, emailBody, instructions } = req.body;

  if (!instructions?.trim()) {
    return res.status(400).json({ error: 'Instructions are required' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are helping Pedro Andrade draft an email reply. Write only the reply body — no subject line, no "Here is a draft" preamble, no sign-off unless Pedro's instructions mention one.

Original email:
From: ${emailFrom}
Subject: ${emailSubject}
Body:
${emailBody || '(body not available)'}

Pedro's instructions: ${instructions}

Write the reply now:`,
    }],
  });

  res.json({ reply: message.content[0].text });
}
