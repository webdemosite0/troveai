export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, name, email, company, role, link, interest, message, website } = req.body || {};

    // Honeypot: silently accept bot submissions without sending email.
    if (website) return res.status(200).json({ ok: true });

    if (!name || !email || !message || !['join', 'invest'].includes(type)) {
      return res.status(400).json({ error: 'Please complete the required fields.' });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const clean = (value, max = 2000) => String(value || '').trim().slice(0, max);
    const subject = type === 'join' ? `New Trove talent application — ${clean(name, 100)}` : `New Trove investor inquiry — ${clean(name, 100)}`;

    const html = `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>${type === 'join' ? 'New Trove talent application' : 'New Trove investor inquiry'}</h2>
        <p><strong>Name:</strong> ${clean(name,100)}</p>
        <p><strong>Email:</strong> ${clean(email,200)}</p>
        ${company ? `<p><strong>Company:</strong> ${clean(company,200)}</p>` : ''}
        ${role ? `<p><strong>Role:</strong> ${clean(role,200)}</p>` : ''}
        ${link ? `<p><strong>Profile / Portfolio:</strong> ${clean(link,500)}</p>` : ''}
        ${interest ? `<p><strong>Investment interest:</strong> ${clean(interest,200)}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${clean(message,5000)}</p>
      </div>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Trove Website <official@troveai.site>',
        to: ['official@troveai.site'],
        reply_to: clean(email, 200),
        subject,
        html
      })
    });

    if (!response.ok) {
      console.error('Resend error:', await response.text());
      return res.status(502).json({ error: 'We could not send your message right now. Please try again.' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
