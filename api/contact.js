export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      provider: 'resend',
      configured: Boolean(process.env.RESEND_API_KEY),
      from: process.env.RESEND_FROM || 'official@troveai.site',
      to: process.env.RESEND_TO || 'official@troveai.site'
    });
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, GET, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is missing from Vercel environment variables.');
      return res.status(500).json({ error: 'Email service is not configured yet.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { type, name, email, company, role, link, interest, message, website } = body;

    // Honeypot: silently accept bot submissions without sending email.
    if (website) return res.status(200).json({ ok: true });

    if (!name || !email || !message || !['join', 'invest'].includes(type)) {
      return res.status(400).json({ error: 'Please complete the required fields.' });
    }

    const clean = (value, max = 2000) => String(value ?? '').trim().slice(0, max);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const safeName = clean(name, 100);
    const safeEmail = clean(email, 200);
    const subject = type === 'join'
      ? `New Trove talent application — ${safeName}`
      : `New Trove investor inquiry — ${safeName}`;

    const escapeHtml = (value) => clean(value).replace(/[&<>\"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>${type === 'join' ? 'New Trove talent application' : 'New Trove investor inquiry'}</h2>
        <p><strong>Name:</strong> ${escapeHtml(safeName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(safeEmail)}</p>
        ${company ? `<p><strong>Company:</strong> ${escapeHtml(company)}</p>` : ''}
        ${role ? `<p><strong>Role:</strong> ${escapeHtml(role)}</p>` : ''}
        ${link ? `<p><strong>Profile / Portfolio:</strong> ${escapeHtml(link)}</p>` : ''}
        ${interest ? `<p><strong>Investment interest:</strong> ${escapeHtml(interest)}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      </div>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Trove Website <official@troveai.site>',
        to: [process.env.RESEND_TO || 'official@troveai.site'],
        reply_to: safeEmail,
        subject,
        html
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Resend error:', response.status, result);
      return res.status(502).json({
        error: 'We could not send your message right now. Please try again.'
      });
    }

    return res.status(200).json({ ok: true, id: result.id || null });
  } catch (error) {
    console.error('Contact endpoint error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
