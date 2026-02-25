// Netlify Serverless Function — Universal Broker Proxy
// Signing happens client-side — keys never leave the browser.
// This proxy only forwards pre-signed requests to bypass CORS.

const ALLOWED_HOSTS = [
  'api.bybit.com',
  'api.kraken.com',
  'api.kucoin.com',
  'www.okx.com',
  'open-api.bingx.com',
  'api.bitget.com',
  'api.mexc.com',
];

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const { url, method, headers: fwdHeaders, body } = await req.json();

    if (!url) return json({ error: 'Missing url' }, 400);

    // Security: only allow known exchange hosts
    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      return json({ error: `Host not allowed: ${parsed.hostname}` }, 403);
    }

    const fetchOpts = {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(fwdHeaders || {}),
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
      fetchOpts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const res = await fetch(url, fetchOpts);
    const text = await res.text();

    let responseBody = text;
    const contentType = res.headers.get('Content-Type') || '';
    if (!res.ok && !contentType.includes('application/json')) {
      responseBody = JSON.stringify({ error: text.trim() || `HTTP ${res.status}` });
    }

    return new Response(responseBody, {
      status: res.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': contentType.includes('application/json') ? 'application/json' : contentType || 'application/json',
      },
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

export const config = {
  path: '/api/broker-proxy',
};
