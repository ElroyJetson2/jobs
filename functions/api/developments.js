/**
 * GET /api/developments
 * Public list of developments for the report form dropdown
 */
export async function onRequestGet(context) {
  const { env } = context;

  try {
    const result = await env.DB.prepare(
      'SELECT id, name, code FROM developments ORDER BY name'
    ).all();

    return new Response(JSON.stringify({
      success: true,
      developments: result.results || []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to load developments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
