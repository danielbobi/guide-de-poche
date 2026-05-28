/**
 * Guide de Poche — Anthropic API Proxy
 * Cloudflare Worker
 *
 * Deploy steps:
 *   1. Go to https://dash.cloudflare.com → Workers & Pages → Create
 *   2. Paste this entire file into the editor
 *   3. Click Settings → Variables → Add variable:
 *        Name:  ANTHROPIC_API_KEY
 *        Value: sk-ant-api03-...   (your key — mark as Secret)
 *   4. Deploy. Copy the worker URL, e.g.:
 *        https://gdp-proxy.YOUR-SUBDOMAIN.workers.dev
 *   5. Paste that URL into the admin console's PROXY_URL constant.
 *
 * The worker only accepts POST requests with a valid JSON body.
 * It forwards model/messages/max_tokens to Anthropic and returns the response.
 * Your API key never leaves Cloudflare's servers.
 */

const ALLOWED_ORIGINS = [
  'https://YOUR-GITHUB-USERNAME.github.io',  // ← update this
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'null',  // file:// origins appear as "null"
];

export default {
  async fetch(request, env) {

    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, origin);
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'POST only' }), 405, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON body' }), 400, origin);
    }

    // Only forward safe fields — never let the caller override the API key
    const payload = {
      model:      body.model      || 'claude-haiku-4-5-20251001',
      max_tokens: body.max_tokens || 600,
      messages:   body.messages,
    };

    if (!payload.messages?.length) {
      return corsResponse(JSON.stringify({ error: 'messages required' }), 400, origin);
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.text();
    return corsResponse(data, upstream.status, origin);
  }
};

function corsResponse(body, status, origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin === '' ? origin : ALLOWED_ORIGINS[0];
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': allowed || '*',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
  };
  return new Response(body, { status, headers });
}
