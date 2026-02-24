// Netlify Serverless Function — Coinbase API Proxy
// The JWT is signed client-side (keys never leave the browser).
// This proxy just forwards the request to bypass CORS.

export default async (req) => {
  // Only allow POST (we send method/path/body in the JSON payload)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  try {
    const { method, path, body, jwt } = await req.json();

    if (!jwt || !path) {
      return json({ error: 'Missing jwt or path' }, 400);
    }

    // Allowlist: only Coinbase API
    const url = `https://api.coinbase.com${path}`;

    const fetchOpts = {
      method: method || 'GET',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOpts.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOpts);
    const contentType = res.headers.get('Content-Type') || '';
    const text = await res.text();

    // If Coinbase returns non-JSON error (e.g. "Unauthorized"), wrap it
    let responseBody = text;
    let responseContentType = contentType;
    if (!res.ok && !contentType.includes('application/json')) {
      responseBody = JSON.stringify({ error: text.trim() || `HTTP ${res.status}` });
      responseContentType = 'application/json';
    }

    return new Response(responseBody, {
      status: res.status,
      headers: {
        ...corsHeaders(),
        'Content-Type': responseContentType,
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
  path: '/api/coinbase-proxy',
};
