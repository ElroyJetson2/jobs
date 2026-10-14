/**
 * GET /api/admin/incidents
 * List incidents (optional filters: development_id, status)
 * Requires Authorization: Bearer <token>
 */
export async function onRequestGet(context) {
  const { request, env } = context;

  const auth = checkAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const developmentId = url.searchParams.get('development_id');
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  try {
    let query = `
      SELECT
        i.id, i.reference, i.unit, i.reporter_name, i.reporter_contact,
        i.description, i.status, i.priority, i.projected_finish, i.assigned_to,
        i.created_at, i.updated_at,
        d.name AS development_name, d.code AS development_code
      FROM incidents i
      JOIN developments d ON d.id = i.development_id
      WHERE 1=1
    `;
    const params = [];

    if (developmentId) {
      query += ' AND i.development_id = ?';
      params.push(developmentId);
    }
    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    query += ' ORDER BY i.created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...params).all();

    // Also return developments for filter dropdown
    const developments = await env.DB.prepare(
      'SELECT id, name, code FROM developments ORDER BY name'
    ).all();

    return json({
      success: true,
      incidents: result.results || [],
      developments: developments.results || []
    });
  } catch (err) {
    console.error('List incidents error:', err);
    return json({ error: 'Failed to list incidents', details: err.message }, 500);
  }
}

function checkAuth(request) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }
  // For demo we just check presence of token. Real app would verify.
  return { ok: true };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
