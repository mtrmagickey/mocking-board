/**
 * Cloudflare Worker — OpenAI API proxy for Mocking Board
 *
 * Keeps the API key server-side. The static site POSTs to this
 * worker, which attaches the key and forwards to OpenAI.
 *
 * The static site (GitHub Pages, etc.) calls this worker.
 * The worker holds the OpenAI key — it never touches the browser.
 *
 * Setup (one-time, ~2 minutes):
 *   1. `npm install -g wrangler`
 *   2. `cd proxy && wrangler login`
 *   3. `wrangler secret put OPENAI_API_KEY`  (paste your key)
 *   4. `wrangler deploy`
 *   5. Copy the deployed URL (e.g. https://mocking-board-proxy.you.workers.dev)
 *   6. Paste it into signageSchemaV2.js → DEFAULT_PROXY_URL
 *      (append /api/generate)
 *
 * For local dev:
 *   `wrangler dev`   → runs on http://localhost:8787
 *   Then in the browser console:
 *     localStorage.setItem('mb_proxy_url', 'http://localhost:8787/api/generate')
 *
 * Environment variables (set as Cloudflare secrets):
 *   OPENAI_API_KEY — your OpenAI API key
 *
 * Optional env vars:
 *   ALLOWED_ORIGIN — restrict CORS to your domain (default: *)
 *   MAX_TOKENS     — cap per request (default: 2048)
 *   RATE_LIMIT_RPM — requests per minute per IP (default: 20)
 */

// Simple in-memory rate limiter (resets on worker restart / edge eviction)
const rateLimitMap = new Map();

function checkRateLimit(ip, maxRpm = 20) {
    const now = Date.now();
    const windowMs = 60_000;
    const entry = rateLimitMap.get(ip) || { count: 0, windowStart: now };

    if (now - entry.windowStart > windowMs) {
        entry.count = 1;
        entry.windowStart = now;
    } else {
        entry.count++;
    }

    rateLimitMap.set(ip, entry);
    return entry.count <= maxRpm;
}

export default {
    async fetch(request, env) {
        const allowedOrigin = env.ALLOWED_ORIGIN || '*';

        // CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': allowedOrigin,
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        const corsHeaders = {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Content-Type': 'application/json',
        };

        // Only accept POST to /api/generate
        const url = new URL(request.url);
        if (request.method !== 'POST' || !url.pathname.endsWith('/api/generate')) {
            return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
        }

        // Rate limit
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const maxRpm = parseInt(env.RATE_LIMIT_RPM) || 20;
        if (!checkRateLimit(clientIP, maxRpm)) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }), {
                status: 429,
                headers: corsHeaders,
            });
        }

        // Validate API key is configured
        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Server misconfigured: missing API key.' }), {
                status: 500,
                headers: corsHeaders,
            });
        }

        // Parse the request body
        let body;
        try {
            body = await request.json();
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), { status: 400, headers: corsHeaders });
        }

        // Enforce limits
        const maxTokensCap = parseInt(env.MAX_TOKENS) || 2048;
        body.max_tokens = Math.min(body.max_tokens || maxTokensCap, maxTokensCap);

        // Allowlist only safe fields
        const safeBody = {
            model: body.model || 'gpt-4.1-nano',
            messages: body.messages,
            temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
            max_tokens: body.max_tokens,
        };

        // Validate messages array
        if (!Array.isArray(safeBody.messages) || safeBody.messages.length === 0) {
            return new Response(JSON.stringify({ error: 'messages array required.' }), { status: 400, headers: corsHeaders });
        }

        try {
            const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(safeBody),
            });

            const openaiBody = await openaiResp.text();
            return new Response(openaiBody, {
                status: openaiResp.status,
                headers: corsHeaders,
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: 'Upstream error: ' + err.message }), {
                status: 502,
                headers: corsHeaders,
            });
        }
    },
};
