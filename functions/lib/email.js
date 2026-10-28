/**
 * Send email via Resend API (set RESEND_API_KEY in Pages env vars).
 * Staff inbox: STAFF_EMAIL or default eliteresortcare@gmail.com
 *
 * With from: onboarding@resend.dev, Resend only allows sending TO the
 * email address on your Resend account. To email anyone else, verify a
 * domain at resend.com/domains and set EMAIL_FROM to an address on that domain.
 */
const STAFF_EMAIL = 'eliteresortcare@gmail.com';

export function staffEmail(env) {
  return (env.STAFF_EMAIL || STAFF_EMAIL).trim().toLowerCase();
}

export function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export async function sendEmail(env, { to, subject, text, html }) {
  const key = env.RESEND_API_KEY;
  if (!key) {
    console.log('[email skipped – no RESEND_API_KEY]', { to, subject, text });
    return { ok: false, skipped: true, reason: 'RESEND_API_KEY not set' };
  }
  const from = env.EMAIL_FROM || 'Elite Resort Care <onboarding@resend.dev>';
  const recipients = (Array.isArray(to) ? to : [to]).map((a) => String(a).trim().toLowerCase());
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        text,
        html: html || `<pre style="font-family:sans-serif">${escapeHtml(text)}</pre>`
      })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Resend error', res.status, body);
      return { ok: false, error: body };
    }
    return { ok: true, id: body.id };
  } catch (err) {
    console.error('sendEmail failed', err);
    return { ok: false, error: String(err) };
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');
}

export async function notifyNewJob(env, incident) {
  const staff = staffEmail(env);
  const subject = `[New job] ${incident.reference} – ${incident.development_name || 'Property'}`;
  const text = [
    'A new incident has been logged.',
    '',
    `Reference: ${incident.reference}`,
    `Property: ${incident.development_name || '—'}`,
    `Unit: ${incident.unit || '—'}`,
    `Reporter: ${incident.reporter_name}`,
    `Contact: ${incident.reporter_contact}`,
    '',
    `Description:`,
    incident.description,
    '',
    `Staff portal: https://gc-jobs.pages.dev/admin.html`,
    `Track: https://gc-jobs.pages.dev/track.html?ref=${incident.reference}`
  ].join('\n');
  return sendEmail(env, { to: staff, subject, text });
}

export async function notifyStatusChange(env, incident, note) {
  const staff = staffEmail(env);
  const subject = `[${incident.status === 'closed' ? 'Closed' : 'Update'}] ${incident.reference}`;
  const text = [
    `Job ${incident.reference} is now: ${incident.status.toUpperCase()}`,
    '',
    `Property: ${incident.development_name || '—'}`,
    `Unit: ${incident.unit || '—'}`,
    note ? `Note: ${note}` : '',
    '',
    `Track: https://gc-jobs.pages.dev/track.html?ref=${incident.reference}`
  ].filter(Boolean).join('\n');

  const staffResult = await sendEmail(env, { to: staff, subject, text });

  let customerResult = null;
  if (isEmail(incident.reporter_contact)) {
    customerResult = await sendEmail(env, {
      to: incident.reporter_contact.trim(),
      subject: `Your job ${incident.reference} is ${incident.status}`,
      text: [
        `Hello ${incident.reporter_name},`,
        '',
        `Your maintenance request ${incident.reference} is now marked: ${incident.status.toUpperCase()}.`,
        note ? `\nUpdate from staff: ${note}` : '',
        '',
        `Track progress anytime:`,
        `https://gc-jobs.pages.dev/track.html?ref=${incident.reference}`,
        '',
        '— Elite Resort Care'
      ].join('\n')
    });
  }
  return { staff: staffResult, customer: customerResult };
}

export async function notifyReminder(env, incident) {
  const staff = staffEmail(env);
  const days = Math.floor(
    (Date.now() - new Date(incident.created_at.includes('T') ? incident.created_at : incident.created_at + 'Z').getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const subject = `[Reminder] Open job ${incident.reference} (${days}+ days)`;
  const text = [
    `This job is still OPEN after ${days} days.`,
    '',
    `Reference: ${incident.reference}`,
    `Property: ${incident.development_name || '—'}`,
    `Unit: ${incident.unit || '—'}`,
    `Reporter: ${incident.reporter_name} · ${incident.reporter_contact}`,
    `Logged: ${incident.created_at}`,
    '',
    incident.description,
    '',
    `Staff portal: https://gc-jobs.pages.dev/admin.html`
  ].join('\n');
  return sendEmail(env, { to: staff, subject, text });
}
