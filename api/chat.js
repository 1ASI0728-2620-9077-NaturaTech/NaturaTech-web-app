import https from 'https';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const GROQ_KEY = (process.env.GROQ_API_KEY || '').replace(/[\uFEFF\u200B\u00A0]/g, '').trim();
    if (!GROQ_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const { messages } = req.body || {};
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const payload = JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: messages,
      max_tokens: 400,
      temperature: 0.7,
    });

    const groqResponse = await makeRequest(
      'api.groq.com',
      '/openai/v1/chat/completions',
      GROQ_KEY,
      payload
    );

    if (groqResponse.status !== 200) {
      return res.status(502).json({
        error: 'AI service error',
        status: groqResponse.status,
        details: groqResponse.body.substring(0, 300),
      });
    }

    let reply = 'Sorry, I could not generate a response.';
    try {
      const data = JSON.parse(groqResponse.body);
      reply = data.choices?.[0]?.message?.content || reply;
    } catch {
      reply = groqResponse.body.substring(0, 500);
    }

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: 'Server error', details: String(error).substring(0, 300) });
  }
}

function makeRequest(hostname, path, token, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        resolve({ status: response.statusCode, body: data });
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}
