/**
 * GET /api/track?ref=GC-XXXX
 * Public tracking endpoint – returns incident + timeline
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const ref = url.searchParams.get('ref')?.trim().toUpperCase();

  if (!ref) {
    return json({ error: 'Missing reference parameter ?ref=' }, 400);
  }

  try {
    const incident = await env.DB.prepare(`
      SELECT
        i.*,
        d.name AS development_name,
        d.code AS development_code,
        d.address AS development_address
      FROM incidents i
      JOIN developments d ON d.id = i.development_id
      WHERE i.reference = ?
    `).bind(ref).first();

    if (!incident) {
      return json({ error: 'Incident not found. Check the reference number.' }, 404);
    }

    const updates = await env.DB.prepare(`
      SELECT status, note, created_by, created_at
      FROM updates
      WHERE incident_id = ?
      ORDER BY created_at ASC
    `).bind(incident.id).all();

    // Hide internal fields if needed
    delete incident.id;

    return json({
      success: true,
      incident,
      updates: updates.results || []
    });
  } catch (err) {
    console.error('Track error:', err);
    return json({ error: 'Failed to fetch incident', details: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
