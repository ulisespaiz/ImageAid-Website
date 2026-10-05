// Cloudflare Pages Function: POST /api/contact
//
// Environment variables (Pages > Settings > Variables and Secrets):
//   TURNSTILE_SECRET  optional. When set, requests must carry a valid Turnstile token.
//   RESEND_API_KEY    optional. When set, submissions are emailed via Resend.
//   CONTACT_TO        inbox that receives submissions, e.g. hello@yourdomain.com
//   CONTACT_FROM      verified Resend sender, e.g. "Website <web@yourdomain.com>"
// Without RESEND_API_KEY the submission is only logged (visible in Pages logs).

const MAX = { name: 120, email: 200, organization: 200, role: 120, interest: 60, message: 4000 };

export async function onRequestPost({ request, env }) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  const reply = (ok, status = 200, error) =>
    wantsJson
      ? Response.json(ok ? { ok } : { ok, error }, { status })
      : ok
        ? Response.redirect(new URL('/thanks.html', request.url), 303)
        : new Response(error || 'Error', { status });

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(false, 400, 'Invalid form data');
  }

  // Honeypot: bots fill hidden fields. Pretend success.
  if (form.get('website')) return reply(true);

  const data = {};
  for (const [key, limit] of Object.entries(MAX)) {
    data[key] = String(form.get(key) || '').trim().slice(0, limit);
  }
  if (!data.name || !data.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return reply(false, 422, 'Name, a valid email, and a message are required');
  }

  if (env.TURNSTILE_SECRET) {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: String(form.get('cf-turnstile-response') || ''),
        remoteip: request.headers.get('CF-Connecting-IP') || '',
      }),
    }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!verify.success) return reply(false, 403, 'Verification failed');
  }

  const text = [
    `Interest: ${data.interest}`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Organization: ${data.organization}`,
    `Role: ${data.role}`,
    '',
    data.message,
  ].join('\n');

  if (!env.RESEND_API_KEY) {
    console.log('contact submission (email not configured):\n' + text);
    return reply(true);
  }

  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: data.email,
      subject: `Website inquiry: ${data.interest || 'General'} from ${data.name}`,
      text,
    }),
  });
  if (!sent.ok) {
    console.error('resend error', sent.status, await sent.text());
    return reply(false, 502, 'Could not send message');
  }
  return reply(true);
}
