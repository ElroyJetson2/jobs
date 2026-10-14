/**
 * POST /api/admin/update
 * Update an incident: status, note, projected_finish, assigned_to
 * Requires Authorization: Bearer <token>
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  const auth = checkAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const {
      reference,
      status,
      note,
      projected_finish,
      assigned_to,
      priority
    } = body;

    if (!reference) {
      return json({ error: 'reference is required' }, 400);
    }

    // Find incident
    const incident = await env.DB.prepare(
      'SELECT id, status FROM incidents WHERE reference = ?'
    ).bind(reference.trim().toUpperCase()).first();

    if (!incident) {
      return json({ error: 'Incident not found' }, 404);
    }

    // Build dynamic update
    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (projected_finish !== undefined) {
      updates.push('projected_finish = ?');
      params.push(projected_finish || null);
    }
    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assigned_to || null);
    }
    if (priority) {
      updates.push('priority = ?');
      params.push(priority);
    }

    updates.push("updated_at = datetime('now')");
    params.push(incident.id);

    if (updates.length > 1) {
      await env.DB.prepare(
        `UPDATE incidents SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...params).run();
    }

    // Always add a timeline note if provided, or auto-note on status change
    const noteText = note || (status ? `Status changed to ${status.replace('_', ' ')}` : null);
    if (noteText) {
      await env.DB.prepare(`
        INSERT INTO updates (incident_id, status, note, created_by)
        VALUES (?, ?, ?, 'staff')
      `).bind(incident.id, status || null, noteText).run();
    }

    // Return updated incident
    const updated = await env.DB.prepare(`
      SELECT i.*, d.name AS development_name
      FROM incidents i
      JOIN developments d ON d.id = i.development_id
      WHERE i.id = ?
    `).bind(incident.id).first();

    return json({
      success: true,
      message: 'Incident updated',
      incident: updated
    });
  } catch (err) {
    console.error('Update error:', err);
    return json({ error: 'Failed to update incident', details: err.message }, 500);
  }
}

function checkAuth(request) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }
  return { ok: true };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
