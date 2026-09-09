const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wjgkldnffszedndedjojs.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqZ2tsZG5mZnN6ZWRuZGVqb2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjE2MTIsImV4cCI6MjEwNDUzNzYxMn0.cNwYB7IjDdgK8lo8KCV74qgj7IHy6VjXBnJpfJMJHLs';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, provider: 'supabase', configured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { type, name, email, company, role, link, interest, message, website } = body;

    if (website) return res.status(200).json({ ok: true });

    if (!name || !email || !message || !['join', 'invest'].includes(type)) {
      return res.status(400).json({ error: 'Please complete the required fields.' });
    }

    const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
    const safeName = clean(name, 100);
    const safeEmail = clean(email, 200).toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail);

    if (!emailOk) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const payload = {
      type,
      name: safeName,
      email: safeEmail,
      company: clean(company, 200),
      role: clean(role, 200),
      link: clean(link, 500),
      interest: clean(interest, 200),
      message: clean(message, 4000),
      status: 'new'
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Supabase error:', response.status, result);
      return res.status(502).json({ error: 'We could not save your application right now. Please try again.' });
    }

    return res.status(200).json({ ok: true, id: result?.[0]?.id || null });
  } catch (error) {
    console.error('Contact endpoint error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
