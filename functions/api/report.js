/**
 * POST /api/report
 * Create a new incident. Returns the reference number.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const {
      development_id,
      unit = '',
      reporter_name,
      reporter_contact,
      description,
      priority = 'normal'
    } = body;

    // Basic validation
    if (!development_id || !reporter_name || !reporter_contact || !description) {
      return json({ error: 'Missing required fields: development_id, reporter_name, reporter_contact, description' }, 400);
    }

    // Verify development exists
    const dev = await env.DB.prepare(
      'SELECT id, code FROM developments WHERE id = ?'
    ).bind(development_id).first();

    if (!dev) {
      return json({ error: 'Invalid development' }, 400);
    }

    // Generate reference: GC-YYMMDD-XXXX
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference = `GC-${datePart}-${randomPart}`;

    // Insert incident
    const result = await env.DB.prepare(`
      INSERT INTO incidents
        (reference, development_id, unit, reporter_name, reporter_contact, description, priority, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')
    `).bind(
      reference,
      development_id,
      unit,
      reporter_name.trim(),
      reporter_contact.trim(),
      description.trim(),
      priority
    ).run();

    const incidentId = result.meta.last_row_id;

    // First timeline entry
    await env.DB.prepare(`
      INSERT INTO updates (incident_id, status, note, created_by)
      VALUES (?, 'submitted', 'Incident logged by customer', 'customer')
    `).bind(incidentId).run();

    return json({
      success: true,
      reference,
      message: 'Incident logged successfully. Use the reference number to track progress.',
      track_url: `/track.html?ref=${reference}`
    });
  } catch (err) {
    console.error('Report error:', err);
    return json({ error: 'Failed to create incident', details: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
