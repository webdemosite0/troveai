const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wjgkldnffszedndejojs.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_L654grsHppTWaZjmL6HlDA_8uUxgMXb';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      provider: 'supabase',
      configured: Boolean(SUPABASE_URL && SUPABASE_KEY)
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { type, name, email, company, role, link, interest, message, website } = body;

    // Honeypot: silently accept bot submissions.
    if (website) return res.status(200).json({ ok: true });

    if (!name || !email || !message || !['join', 'invest'].includes(type)) {
      return res.status(400).json({ error: 'Please complete the required fields.' });
    }

    const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
    const safeName = clean(name, 100);
    const safeEmail = clean(email, 200).toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const payload = {
      type,
      name: safeName,
      email: safeEmail,
      company: clean(company, 200) || null,
      role: clean(role, 200) || null,
      link: clean(link, 500) || null,
      interest: clean(interest, 200) || null,
      message: clean(message, 4000),
      status: 'new'
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Supabase application insert failed:', {
        status: response.status,
        code: result?.code,
        message: result?.message,
        details: result?.details,
        hint: result?.hint
      });
      return res.status(502).json({
        error: 'We could not save your application right now. Please try again.'
      });
    }

    return res.status(200).json({ ok: true, id: result?.[0]?.id || null });
  } catch (error) {
    console.error('Contact endpoint error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
