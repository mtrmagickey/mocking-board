// signageSchemaV2.js
// ─────────────────────────────────────────────────────────────
// Mocking Board — Signage Schema v2
// Two-pass conversational generation, token resolver,
// layout engine, schema validator/sanitizer, import pipeline.
// ─────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// 0. API PROXY CONFIG
// ═══════════════════════════════════════════════════════════════
// The API key MUST live server-side behind a proxy.
// In production, set this to your Cloudflare Worker / Vercel
// Edge Function / Netlify Function / etc. endpoint.
// The proxy receives { model, messages, ... } and forwards to
// OpenAI with the key attached, then returns the response.
//
// For local dev: set SIGNAGE_PROXY_URL in localStorage to your
// dev proxy, or run the bundled worker in /proxy.
//
// Default: '' (must be configured before first use).
// Set it in one of two ways:
//   1. localStorage: localStorage.setItem('mb_proxy_url', 'https://your-worker.workers.dev/api/generate')
//   2. Edit DEFAULT_PROXY_URL below to your deployed worker URL.
//
// GitHub Pages deployment:
//   The static site stays on GitHub Pages as-is.
//   Deploy the worker in /proxy to Cloudflare (free tier),
//   then set DEFAULT_PROXY_URL to that worker's URL.
// ─────────────────────────────────────────────────────────────

// ⚠️  Your deployed Cloudflare Worker URL:
const DEFAULT_PROXY_URL = 'https://mocking-board-proxy.mocking-board.workers.dev/api/generate';
export const MODEL = 'gpt-4o-mini'; // cheapest capable model

export function getProxyUrl() {
    try {
        return localStorage.getItem('mb_proxy_url') || DEFAULT_PROXY_URL;
    } catch {
        return DEFAULT_PROXY_URL;
    }
}

export function setProxyUrl(url) {
    try { localStorage.setItem('mb_proxy_url', url); } catch { /* noop */ }
}


// ═══════════════════════════════════════════════════════════════
// 1. SYSTEM PROMPTS — two-pass conversation
// ═══════════════════════════════════════════════════════════════

/**
 * PASS 1: Clarify.
 * The model reads the user's initial request and responds with
 * EXACTLY 3 short clarifying questions in a specific JSON shape.
 * These questions help nail down design intent cheaply before
 * the heavier generation pass.
 */
export const CLARIFY_SYSTEM_PROMPT = `You are the sign-design assistant for Mocking Board, a walk-up digital signage tool.
The user just told you what sign they need. Ask EXACTLY 3 short clarifying questions to improve the sign.

Focus your questions on:
- What text/content should appear (headline, details, times, names)
- What mood or visual style they want (bold, elegant, playful, minimal)
- Where/how it will be displayed (lobby screen, classroom, storefront, portrait/landscape)

Respond with ONLY this JSON — no markdown, no commentary:

{
  "questions": [
    "<question 1>",
    "<question 2>",
    "<question 3>"
  ]
}`;

/**
 * PASS 2: Generate.
 * The model receives the full conversation (initial request +
 * clarifications + user answers) and outputs the v2 signage JSON.
 */
export const GENERATE_SYSTEM_PROMPT = `You are a signage layout generator for Mocking Board.
You output ONLY valid JSON — no markdown fences, no commentary, no trailing commas.

## Schema (v2)

{
  "version": "2.0",
  "meta": {
    "title": "<string, required>",
    "intent": "quick-signage" | "storyboard" | "announcement" | "wayfinding" | "schedule",
    "contrast": "high" | "normal",
    "aspectRatio": "16:9" | "4:3" | "9:16" | "1:1"
  },
  "branding": {
    "orgName": "<string, optional>",
    "logoUrl": "<valid https URL or empty string>",
    "palette": "<string, optional — name hint for later theming>"
  },
  "tokens": {
    "colors": {
      "primary":    "<hex>",
      "secondary":  "<hex>",
      "accent":     "<hex>",
      "bg":         "<hex>",
      "muted":      "<hex>"
    },
    "fonts": {
      "display": "<from: Old Standard TT | Georgia | system-ui | Roboto>",
      "body":    "<from: system-ui | Roboto | Georgia>"
    },
    "spacing": {
      "sm": <12–24>,
      "md": <28–56>,
      "lg": <60–120>
    }
  },
  "frames": [
    {
      "duration": <1–120, seconds>,
      "transition": { "type": "fade" | "slide" | "cut", "duration": <0.2–2.0> },
      "background": {
        "type": "solid" | "gradient",
        "color": "<hex or $token>",
        "gradient": {
          "type": "linear" | "radial" | "conic",
          "direction": "<CSS direction string>",
          "stops": [ { "color": "<hex or $token>", "position": <0–100> } ]
        },
        "overlay": { "color": "<hex>", "opacity": <0–1> }
      },
      "layout": {
        "type": "stack",
        "direction": "vertical" | "horizontal",
        "align": "start" | "center" | "end",
        "justify": "start" | "center" | "end" | "space-between",
        "padding": "<$token or number>",
        "gap": "<$token or number>",
        "children": ["<element id>", ...]
      },
      "elements": [
        {
          "id": "<unique string, e.g. el-1>",
          "type": "text" | "divider" | "image" | "shape" | "spacer",
          "role": "headline" | "subhead" | "body" | "detail" | "brand" | "accent" | "media" | "spacer" | "footer",
          "runs": [
            {
              "text": "<string>",
              "style": {
                "fontSize": <18–180, optional — overrides blockStyle>,
                "fontWeight": <100–900, optional>,
                "fontFamily": "<$token ref like $display, optional>",
                "color": "<hex or $token, optional>"
              }
            }
          ],
          "blockStyle": {
            "fontFamily": "<$token ref like $display>",
            "fontSize": <18–180>,
            "fontWeight": <100–900>,
            "color": "<hex or $token>",
            "align": "left" | "center" | "right",
            "lineHeight": <0.8–3.0>
          },
          "style": {
            "color": "<hex or $token>",
            "thickness": <1–12>,
            "width": "<percentage string like 50%>"
          },
          "url": "<valid https URL — for image type>",
          "alt": "<string — accessibility text for images>",
          "shape": "rect" | "circle" | "line" | "arrow" | "triangle"
        }
      ]
    }
  ]
}

## Rules
1. Token references use $ prefix: "$primary", "$display", "$lg".
2. Font families MUST be from the whitelist: Old Standard TT, Georgia, system-ui, Roboto.
3. Font sizes are unitless numbers (px implied), clamped 18–180.
4. Spacing tokens: sm 12–24, md 28–56, lg 60–120.
5. Colors are 7-char hex (#RRGGBB) or $token references.
6. Maximum 3 frames per generation.
7. Maximum 8 elements per frame.
8. Use roles to convey hierarchy. The layout engine positions elements — you NEVER specify x/y/w/h.
9. For dividers, only set style.color, style.thickness, style.width.
10. For spacers, no style needed — the gap handles spacing.
11. All URLs must be https. No javascript:, data:, or blob: URIs.
12. Keep text concise and punchy — this is signage, not a document.
13. Choose high-contrast color pairings. If meta.contrast is "high", ensure WCAG AA (4.5:1) for body text.
14. Use the user's clarification answers to inform every design choice.`;

// Legacy alias for backward compat
export const SIGNAGE_SYSTEM_PROMPT = GENERATE_SYSTEM_PROMPT;


// ═══════════════════════════════════════════════════════════════
// 2. CONSTANTS & ALLOW‑LISTS (security)
// ═══════════════════════════════════════════════════════════════

const ALLOWED_FONTS = new Set([
    'Old Standard TT',
    'Georgia',
    'system-ui',
    'Roboto',
    // CSS fallback stacks are resolved at render time
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Roboto, sans-serif',
    'Old Standard TT, serif',
    'Georgia, serif',
]);

const FONT_STACK = {
    'Old Standard TT': 'Old Standard TT, serif',
    'Georgia': 'Georgia, serif',
    'system-ui': "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'Roboto': 'Roboto, sans-serif',
};

const ALLOWED_ELEMENT_TYPES = new Set([
    'text', 'divider', 'image', 'shape', 'spacer',
]);

const ALLOWED_ROLES = new Set([
    'headline', 'subhead', 'body', 'detail', 'brand',
    'accent', 'media', 'spacer', 'footer',
]);

const ALLOWED_SHAPE_TYPES = new Set([
    'rect', 'circle', 'line', 'arrow', 'triangle',
]);

const ALLOWED_GRADIENT_TYPES = new Set(['linear', 'radial', 'conic']);
const ALLOWED_TRANSITION_TYPES = new Set(['fade', 'slide', 'cut']);
const ALLOWED_LAYOUT_DIRECTIONS = new Set(['vertical', 'horizontal']);
const ALLOWED_ALIGNS = new Set(['start', 'center', 'end']);
const ALLOWED_JUSTIFIES = new Set(['start', 'center', 'end', 'space-between']);
const ALLOWED_TEXT_ALIGNS = new Set(['left', 'center', 'right']);
const ALLOWED_INTENTS = new Set([
    'quick-signage', 'storyboard', 'announcement', 'wayfinding', 'schedule',
]);
const ALLOWED_ASPECT_RATIOS = new Set(['16:9', '4:3', '9:16', '1:1']);
const ALLOWED_CONTRASTS = new Set(['high', 'normal']);

const MAX_FRAMES = 3;
const MAX_ELEMENTS_PER_FRAME = 8;
const FONT_SIZE_MIN = 18;
const FONT_SIZE_MAX = 180;
const SPACING_BOUNDS = { sm: [12, 24], md: [28, 56], lg: [60, 120] };
const DURATION_MIN = 1;
const DURATION_MAX = 120;
const TRANSITION_DURATION_MIN = 0.2;
const TRANSITION_DURATION_MAX = 2.0;

// URL validation — only https, no script/data/blob
const SAFE_URL_RE = /^https:\/\/.+/i;
const DANGEROUS_URL_RE = /^(javascript|data|blob|vbscript):/i;

// Hex color pattern
const HEX_RE = /^#[0-9a-fA-F]{6}$/;


// ═══════════════════════════════════════════════════════════════
// 3. TOKEN RESOLVER
// ═══════════════════════════════════════════════════════════════

/**
 * Build a flat lookup from a tokens object.
 * Supports $primary, $display, $lg, etc.
 */
function buildTokenMap(tokens) {
    const map = new Map();
    if (!tokens || typeof tokens !== 'object') return map;

    // colors
    if (tokens.colors && typeof tokens.colors === 'object') {
        for (const [k, v] of Object.entries(tokens.colors)) {
            map.set(`$${k}`, v);
        }
    }
    // fonts
    if (tokens.fonts && typeof tokens.fonts === 'object') {
        for (const [k, v] of Object.entries(tokens.fonts)) {
            map.set(`$${k}`, v);
        }
    }
    // spacing
    if (tokens.spacing && typeof tokens.spacing === 'object') {
        for (const [k, v] of Object.entries(tokens.spacing)) {
            map.set(`$${k}`, v);
        }
    }
    return map;
}

/**
 * Resolve a value that might be a $token reference.
 * Returns the resolved value, or the original if not a token.
 */
export function resolveToken(value, tokenMap) {
    if (typeof value === 'string' && value.startsWith('$') && tokenMap.has(value)) {
        return tokenMap.get(value);
    }
    return value;
}

/**
 * Resolve all token references in an element's styles recursively.
 */
function resolveElementTokens(element, tokenMap) {
    if (!element) return element;
    const resolved = { ...element };

    // blockStyle
    if (resolved.blockStyle) {
        const bs = { ...resolved.blockStyle };
        if (bs.fontFamily) bs.fontFamily = resolveToken(bs.fontFamily, tokenMap);
        if (bs.color) bs.color = resolveToken(bs.color, tokenMap);
        resolved.blockStyle = bs;
    }

    // runs
    if (Array.isArray(resolved.runs)) {
        resolved.runs = resolved.runs.map(run => {
            if (!run.style) return run;
            const rs = { ...run.style };
            if (rs.fontFamily) rs.fontFamily = resolveToken(rs.fontFamily, tokenMap);
            if (rs.color) rs.color = resolveToken(rs.color, tokenMap);
            return { ...run, style: rs };
        });
    }

    // style (divider, shape)
    if (resolved.style) {
        const s = { ...resolved.style };
        if (s.color) s.color = resolveToken(s.color, tokenMap);
        resolved.style = s;
    }

    return resolved;
}


// ═══════════════════════════════════════════════════════════════
// 4. SCHEMA VALIDATOR + SANITIZER
// ═══════════════════════════════════════════════════════════════

/**
 * Clamp a number to [min, max].
 */
function clamp(val, min, max) {
    const n = typeof val === 'number' ? val : parseFloat(val);
    if (!isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
}

/**
 * Validate and sanitize a hex color. Returns fallback if invalid.
 */
function sanitizeColor(color, tokenMap, fallback = '#111111') {
    if (typeof color !== 'string') return fallback;
    const resolved = resolveToken(color, tokenMap);
    if (typeof resolved === 'string' && HEX_RE.test(resolved)) return resolved;
    return fallback;
}

/**
 * Validate a URL. Returns empty string if unsafe.
 */
function sanitizeUrl(url) {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (DANGEROUS_URL_RE.test(trimmed)) return '';
    if (!SAFE_URL_RE.test(trimmed)) return '';
    return trimmed;
}

/**
 * Sanitize a font family string.
 */
function sanitizeFont(font, tokenMap) {
    if (typeof font !== 'string') return FONT_STACK['system-ui'];
    const resolved = resolveToken(font, tokenMap);
    if (typeof resolved !== 'string') return FONT_STACK['system-ui'];
    // Check if it matches an allowed font (bare name or stack)
    if (ALLOWED_FONTS.has(resolved)) {
        return FONT_STACK[resolved] || resolved;
    }
    // Try bare‑name extraction
    const bare = resolved.split(',')[0].trim().replace(/['"]/g, '');
    if (ALLOWED_FONTS.has(bare)) {
        return FONT_STACK[bare] || resolved;
    }
    return FONT_STACK['system-ui'];
}

/**
 * Sanitize an entire text run.
 */
function sanitizeRun(run, tokenMap) {
    if (!run || typeof run !== 'object') return null;
    const text = typeof run.text === 'string' ? run.text : '';
    if (!text) return null;
    const sanitized = { text };
    if (run.style && typeof run.style === 'object') {
        const s = {};
        if (run.style.fontSize != null) s.fontSize = clamp(run.style.fontSize, FONT_SIZE_MIN, FONT_SIZE_MAX);
        if (run.style.fontWeight != null) s.fontWeight = clamp(run.style.fontWeight, 100, 900);
        if (run.style.fontFamily) s.fontFamily = sanitizeFont(run.style.fontFamily, tokenMap);
        if (run.style.color) s.color = sanitizeColor(run.style.color, tokenMap);
        if (Object.keys(s).length > 0) sanitized.style = s;
    }
    return sanitized;
}

/**
 * Sanitize a blockStyle object.
 */
function sanitizeBlockStyle(bs, tokenMap) {
    if (!bs || typeof bs !== 'object') return {};
    const out = {};
    if (bs.fontFamily) out.fontFamily = sanitizeFont(bs.fontFamily, tokenMap);
    if (bs.fontSize != null) out.fontSize = clamp(bs.fontSize, FONT_SIZE_MIN, FONT_SIZE_MAX);
    if (bs.fontWeight != null) out.fontWeight = clamp(bs.fontWeight, 100, 900);
    if (bs.color) out.color = sanitizeColor(bs.color, tokenMap);
    if (bs.align && ALLOWED_TEXT_ALIGNS.has(bs.align)) out.align = bs.align;
    if (bs.lineHeight != null) out.lineHeight = clamp(bs.lineHeight, 0.8, 3.0);
    return out;
}

/**
 * Sanitize a background object.
 */
function sanitizeBackground(bg, tokenMap) {
    if (!bg || typeof bg !== 'object') return { type: 'solid', color: '#ffffff' };
    const out = { type: 'solid' };

    if (bg.type === 'gradient' && bg.gradient && typeof bg.gradient === 'object') {
        out.type = 'gradient';
        const g = bg.gradient;
        out.gradient = {
            type: ALLOWED_GRADIENT_TYPES.has(g.type) ? g.type : 'linear',
            direction: typeof g.direction === 'string' ? g.direction : 'to bottom',
            stops: [],
        };
        if (Array.isArray(g.stops)) {
            out.gradient.stops = g.stops
                .slice(0, 8) // max 8 stops
                .map(stop => ({
                    color: sanitizeColor(stop.color, tokenMap),
                    position: clamp(stop.position, 0, 100),
                }));
        }
        if (out.gradient.stops.length < 2) {
            // Not enough stops — fall back to solid
            out.type = 'solid';
            out.color = sanitizeColor(bg.color, tokenMap, '#ffffff');
            delete out.gradient;
        }
    } else {
        out.color = sanitizeColor(bg.color, tokenMap, '#ffffff');
    }

    if (bg.overlay && typeof bg.overlay === 'object') {
        out.overlay = {
            color: sanitizeColor(bg.overlay.color, tokenMap, '#000000'),
            opacity: clamp(bg.overlay.opacity ?? 0, 0, 1),
        };
    }
    return out;
}

/**
 * Sanitize one element.
 */
function sanitizeElement(el, tokenMap) {
    if (!el || typeof el !== 'object') return null;
    const type = ALLOWED_ELEMENT_TYPES.has(el.type) ? el.type : 'text';
    const role = ALLOWED_ROLES.has(el.role) ? el.role : 'body';
    const id = typeof el.id === 'string' ? el.id.slice(0, 32) : `el-${Math.random().toString(36).slice(2, 8)}`;

    const out = { id, type, role };

    // Text elements
    if (type === 'text') {
        if (Array.isArray(el.runs)) {
            out.runs = el.runs.map(r => sanitizeRun(r, tokenMap)).filter(Boolean).slice(0, 20);
        }
        if (!out.runs || out.runs.length === 0) {
            out.runs = [{ text: el.text || 'Text' }];
        }
        out.blockStyle = sanitizeBlockStyle(el.blockStyle, tokenMap);
    }

    // Divider
    if (type === 'divider') {
        out.style = {
            color: sanitizeColor(el.style?.color, tokenMap, '#cccccc'),
            thickness: clamp(el.style?.thickness ?? 2, 1, 12),
            width: typeof el.style?.width === 'string' ? el.style.width : '60%',
        };
    }

    // Image
    if (type === 'image') {
        out.url = sanitizeUrl(el.url);
        out.alt = typeof el.alt === 'string' ? el.alt.slice(0, 200) : 'Image';
    }

    // Shape
    if (type === 'shape') {
        out.shape = ALLOWED_SHAPE_TYPES.has(el.shape) ? el.shape : 'rect';
        out.style = {
            color: sanitizeColor(el.style?.color, tokenMap, '#3498db'),
        };
    }

    // Spacer — no extra properties needed
    return out;
}

/**
 * Sanitize one frame.
 */
function sanitizeFrame(frame, tokenMap) {
    if (!frame || typeof frame !== 'object') return null;
    const out = {};
    out.duration = clamp(frame.duration ?? 15, DURATION_MIN, DURATION_MAX);

    // Transition
    if (frame.transition && typeof frame.transition === 'object') {
        out.transition = {
            type: ALLOWED_TRANSITION_TYPES.has(frame.transition.type) ? frame.transition.type : 'cut',
            duration: clamp(frame.transition.duration ?? 0.5, TRANSITION_DURATION_MIN, TRANSITION_DURATION_MAX),
        };
    } else {
        out.transition = { type: 'cut', duration: 0 };
    }

    // Background
    out.background = sanitizeBackground(frame.background, tokenMap);

    // Layout
    if (frame.layout && typeof frame.layout === 'object') {
        const l = frame.layout;
        out.layout = {
            type: 'stack', // only stack supported in v2
            direction: ALLOWED_LAYOUT_DIRECTIONS.has(l.direction) ? l.direction : 'vertical',
            align: ALLOWED_ALIGNS.has(l.align) ? l.align : 'center',
            justify: ALLOWED_JUSTIFIES.has(l.justify) ? l.justify : 'center',
            padding: resolveSpacingToken(l.padding, tokenMap, 60),
            gap: resolveSpacingToken(l.gap, tokenMap, 32),
            children: Array.isArray(l.children) ? l.children.map(c => String(c)) : [],
        };
    } else {
        out.layout = {
            type: 'stack', direction: 'vertical', align: 'center', justify: 'center',
            padding: 60, gap: 32, children: [],
        };
    }

    // Elements
    if (Array.isArray(frame.elements)) {
        out.elements = frame.elements
            .slice(0, MAX_ELEMENTS_PER_FRAME)
            .map(el => sanitizeElement(el, tokenMap))
            .filter(Boolean);
    } else {
        out.elements = [];
    }

    // If layout.children is empty, auto‑fill from elements order
    if (out.layout.children.length === 0) {
        out.layout.children = out.elements.map(el => el.id);
    }

    return out;
}

function resolveSpacingToken(val, tokenMap, fallback) {
    if (typeof val === 'number') return clamp(val, 0, 200);
    if (typeof val === 'string' && val.startsWith('$')) {
        const resolved = resolveToken(val, tokenMap);
        if (typeof resolved === 'number') return clamp(resolved, 0, 200);
    }
    return fallback;
}

/**
 * Sanitize tokens themselves.
 */
function sanitizeTokens(tokens) {
    const out = { colors: {}, fonts: {}, spacing: {} };
    if (!tokens || typeof tokens !== 'object') return out;

    // Colors
    if (tokens.colors && typeof tokens.colors === 'object') {
        for (const [k, v] of Object.entries(tokens.colors)) {
            const key = String(k).slice(0, 24);
            if (typeof v === 'string' && HEX_RE.test(v)) {
                out.colors[key] = v;
            }
        }
    }
    // Ensure defaults
    if (!out.colors.primary) out.colors.primary = '#2B2622';
    if (!out.colors.bg) out.colors.bg = '#FDFCF8';
    if (!out.colors.accent) out.colors.accent = '#B5A642';
    if (!out.colors.muted) out.colors.muted = '#6B6B6B';

    // Fonts
    if (tokens.fonts && typeof tokens.fonts === 'object') {
        out.fonts.display = sanitizeFont(tokens.fonts.display || 'Old Standard TT', new Map());
        out.fonts.body = sanitizeFont(tokens.fonts.body || 'system-ui', new Map());
    } else {
        out.fonts.display = FONT_STACK['Old Standard TT'];
        out.fonts.body = FONT_STACK['system-ui'];
    }

    // Spacing
    if (tokens.spacing && typeof tokens.spacing === 'object') {
        out.spacing.sm = clamp(tokens.spacing.sm ?? 16, ...SPACING_BOUNDS.sm);
        out.spacing.md = clamp(tokens.spacing.md ?? 40, ...SPACING_BOUNDS.md);
        out.spacing.lg = clamp(tokens.spacing.lg ?? 80, ...SPACING_BOUNDS.lg);
    } else {
        out.spacing.sm = 16;
        out.spacing.md = 40;
        out.spacing.lg = 80;
    }

    return out;
}

/**
 * Top‑level validate + sanitize.
 * Returns { valid: boolean, data: sanitizedObject|null, errors: string[] }
 */
export function validateAndSanitize(raw) {
    const errors = [];

    // ── Tier 1: Structural check ──
    if (!raw || typeof raw !== 'object') {
        return { valid: false, data: null, errors: ['Input is not an object.'] };
    }
    if (raw.version !== '2.0') {
        errors.push(`Unknown version "${raw.version}", treating as 2.0.`);
    }
    if (!raw.frames || !Array.isArray(raw.frames) || raw.frames.length === 0) {
        return { valid: false, data: null, errors: ['No frames array found.'] };
    }

    // ── Tier 2: Sanitize tokens first (everything else references them) ──
    const tokens = sanitizeTokens(raw.tokens);
    const tokenMap = buildTokenMap(tokens);

    // ── Meta ──
    const meta = {};
    if (raw.meta && typeof raw.meta === 'object') {
        meta.title = typeof raw.meta.title === 'string' ? raw.meta.title.slice(0, 100) : 'Untitled Sign';
        meta.intent = ALLOWED_INTENTS.has(raw.meta.intent) ? raw.meta.intent : 'quick-signage';
        meta.contrast = ALLOWED_CONTRASTS.has(raw.meta.contrast) ? raw.meta.contrast : 'normal';
        meta.aspectRatio = ALLOWED_ASPECT_RATIOS.has(raw.meta.aspectRatio) ? raw.meta.aspectRatio : '16:9';
    } else {
        meta.title = 'Untitled Sign';
        meta.intent = 'quick-signage';
        meta.contrast = 'normal';
        meta.aspectRatio = '16:9';
    }

    // ── Branding ──
    const branding = {};
    if (raw.branding && typeof raw.branding === 'object') {
        branding.orgName = typeof raw.branding.orgName === 'string' ? raw.branding.orgName.slice(0, 100) : '';
        branding.logoUrl = sanitizeUrl(raw.branding.logoUrl || '');
        branding.palette = typeof raw.branding.palette === 'string' ? raw.branding.palette.slice(0, 50) : '';
    }

    // ── Frames (max 3) ──
    const frames = raw.frames
        .slice(0, MAX_FRAMES)
        .map(f => sanitizeFrame(f, tokenMap))
        .filter(Boolean);

    if (frames.length === 0) {
        return { valid: false, data: null, errors: ['All frames were invalid.'] };
    }

    return {
        valid: true,
        data: { version: '2.0', meta, branding, tokens, frames },
        errors,
    };
}


// ═══════════════════════════════════════════════════════════════
// 5. LAYOUT RESOLVER — turns semantic layout into x/y/w/h
// ═══════════════════════════════════════════════════════════════

/**
 * Aspect ratio → pixel dimensions (targeting the canvas).
 */
export function aspectRatioToSize(ratio, maxWidth = 1920, maxHeight = 1080) {
    const map = {
        '16:9': [16, 9],
        '4:3': [4, 3],
        '9:16': [9, 16],
        '1:1': [1, 1],
    };
    const [rw, rh] = map[ratio] || [16, 9];
    let w = maxWidth;
    let h = Math.round(w * rh / rw);
    if (h > maxHeight) {
        h = maxHeight;
        w = Math.round(h * rw / rh);
    }
    return { width: w, height: h };
}

/**
 * Role → default font size mapping (px).
 */
const ROLE_DEFAULTS = {
    headline: { fontSize: 96, fontWeight: 700, fontFamily: '$display', lineHeight: 1.1 },
    subhead:  { fontSize: 56, fontWeight: 600, fontFamily: '$display', lineHeight: 1.2 },
    body:     { fontSize: 40, fontWeight: 400, fontFamily: '$body',    lineHeight: 1.4 },
    detail:   { fontSize: 32, fontWeight: 400, fontFamily: '$body',    lineHeight: 1.3 },
    brand:    { fontSize: 28, fontWeight: 600, fontFamily: '$display', lineHeight: 1.2 },
    footer:   { fontSize: 24, fontWeight: 400, fontFamily: '$body',    lineHeight: 1.3 },
    accent:   { fontSize: 24, fontWeight: 400, fontFamily: '$body',    lineHeight: 1.0 },
    media:    { fontSize: 24, fontWeight: 400, fontFamily: '$body',    lineHeight: 1.0 },
    spacer:   { fontSize: 24, fontWeight: 400, fontFamily: '$body',    lineHeight: 1.0 },
};

/**
 * Estimate the rendered height of a text element given its resolved styles
 * and the available width.
 */
function estimateTextHeight(element, availableWidth, tokenMap) {
    const bs = element.blockStyle || {};
    const role = element.role || 'body';
    const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.body;

    const fontSize = bs.fontSize || defaults.fontSize;
    const lineHeight = bs.lineHeight || defaults.lineHeight;

    // Build full text
    const fullText = (element.runs || []).map(r => r.text).join('');
    const lines = fullText.split('\n');

    // Very rough: assume avg char width ≈ fontSize * 0.52
    const charWidth = fontSize * 0.52;
    let totalLines = 0;
    for (const line of lines) {
        const lineChars = line.length || 1;
        const lineWidth = lineChars * charWidth;
        const wrappedLines = Math.max(1, Math.ceil(lineWidth / availableWidth));
        totalLines += wrappedLines;
    }
    return Math.ceil(totalLines * fontSize * lineHeight);
}

/**
 * Estimate divider height.
 */
function estimateDividerHeight(element) {
    return (element.style?.thickness || 2) + 8; // thickness + a bit of breathing room
}

/**
 * Estimate spacer height.
 */
function estimateSpacerHeight() {
    return 16;
}

/**
 * Estimate image height (default: square at half available width).
 */
function estimateImageHeight(availableWidth) {
    return Math.round(availableWidth * 0.5);
}

/**
 * Estimate shape height.
 */
function estimateShapeHeight(availableWidth) {
    return Math.round(availableWidth * 0.3);
}


/**
 * Resolve a single frame's layout into positioned elements.
 * Returns an array of { id, x, y, w, h, element } objects.
 */
export function resolveLayout(frame, canvasWidth, canvasHeight, tokenMap) {
    const layout = frame.layout || {};
    const direction = layout.direction || 'vertical';
    const align = layout.align || 'center';
    const justify = layout.justify || 'center';
    const padding = typeof layout.padding === 'number' ? layout.padding : 60;
    const gap = typeof layout.gap === 'number' ? layout.gap : 32;

    // Build element lookup
    const elementMap = new Map();
    (frame.elements || []).forEach(el => elementMap.set(el.id, el));

    // Ordered children
    const orderedIds = (layout.children || []).filter(id => elementMap.has(id));
    const orderedElements = orderedIds.map(id => elementMap.get(id));

    const isVertical = direction === 'vertical';
    const mainSize = isVertical ? canvasHeight : canvasWidth;
    const crossSize = isVertical ? canvasWidth : canvasHeight;
    const availableCross = crossSize - padding * 2;
    const availableMain = mainSize - padding * 2;

    // ── Measure each child along the main axis ──
    const childSizes = orderedElements.map(el => {
        const resolved = resolveElementTokens(el, tokenMap);
        if (el.type === 'text') {
            const h = estimateTextHeight(resolved, availableCross, tokenMap);
            return { main: isVertical ? h : availableCross, cross: isVertical ? availableCross : h, el: resolved };
        }
        if (el.type === 'divider') {
            const h = estimateDividerHeight(resolved);
            return { main: isVertical ? h : availableCross, cross: isVertical ? availableCross : h, el: resolved };
        }
        if (el.type === 'spacer') {
            return { main: estimateSpacerHeight(), cross: 0, el: resolved };
        }
        if (el.type === 'image') {
            const h = estimateImageHeight(availableCross);
            return { main: isVertical ? h : h, cross: isVertical ? availableCross : h, el: resolved };
        }
        if (el.type === 'shape') {
            const h = estimateShapeHeight(availableCross);
            return { main: isVertical ? h : h, cross: isVertical ? availableCross : h, el: resolved };
        }
        return { main: 50, cross: availableCross, el: resolved };
    });

    // Total main content size
    const totalMain = childSizes.reduce((sum, c) => sum + c.main, 0) + Math.max(0, childSizes.length - 1) * gap;

    // ── Justify: compute starting offset along main axis ──
    let mainOffset;
    if (justify === 'start') {
        mainOffset = padding;
    } else if (justify === 'end') {
        mainOffset = mainSize - padding - totalMain;
    } else if (justify === 'space-between' && childSizes.length > 1) {
        mainOffset = padding;
    } else {
        // center
        mainOffset = Math.max(padding, (mainSize - totalMain) / 2);
    }

    const spaceBetweenGap = (justify === 'space-between' && childSizes.length > 1)
        ? (availableMain - totalMain + (childSizes.length - 1) * gap) / (childSizes.length - 1)
        : gap;

    // ── Position each child ──
    const positioned = [];
    let cursor = mainOffset;

    childSizes.forEach(({ main: childMain, cross: childCross, el }) => {
        // Cross‑axis alignment
        let crossOffset;
        if (align === 'start') {
            crossOffset = padding;
        } else if (align === 'end') {
            crossOffset = crossSize - padding - childCross;
        } else {
            // center
            crossOffset = (crossSize - childCross) / 2;
        }

        const x = isVertical ? crossOffset : cursor;
        const y = isVertical ? cursor : crossOffset;
        const w = isVertical ? childCross : childMain;
        const h = isVertical ? childMain : childCross;

        positioned.push({ id: el.id, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), element: el });
        cursor += childMain + spaceBetweenGap;
    });

    return positioned;
}


// ═══════════════════════════════════════════════════════════════
// 6. RENDERER — v2 elements → Mocking Board DOM elements
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve a font reference to a CSS font‑family string.
 */
function resolveFontFamily(font, tokenMap) {
    if (!font) return FONT_STACK['system-ui'];
    const resolved = resolveToken(font, tokenMap);
    if (FONT_STACK[resolved]) return FONT_STACK[resolved];
    if (ALLOWED_FONTS.has(resolved)) return resolved;
    return FONT_STACK['system-ui'];
}

/**
 * Build CSS background string from a sanitized background object.
 */
export function buildBackgroundCSS(bg) {
    if (!bg) return '#ffffff';
    if (bg.type === 'gradient' && bg.gradient) {
        const g = bg.gradient;
        const stops = g.stops.map(s => `${s.color} ${s.position}%`).join(', ');
        if (g.type === 'radial') return `radial-gradient(circle, ${stops})`;
        if (g.type === 'conic') return `conic-gradient(from 0deg, ${stops})`;
        return `linear-gradient(${g.direction || 'to bottom'}, ${stops})`;
    }
    return bg.color || '#ffffff';
}

/**
 * Generate a UID for new elements.
 */
function generateUID(length = 9) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uid = '';
    for (let i = 0; i < length; i++) uid += chars.charAt(Math.floor(Math.random() * chars.length));
    return uid;
}

/**
 * Render a single resolved + positioned element as a Mocking Board DOM element.
 */
export function renderElementToDOM(positioned, tokenMap) {
    const { id, x, y, w, h, element } = positioned;
    const el = element;
    const role = el.role || 'body';
    const defaults = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.body;

    const div = document.createElement('div');
    div.className = 'element';
    div.style.position = 'absolute';
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.style.width = `${w}px`;
    div.style.height = `${h}px`;
    div.style.boxSizing = 'border-box';
    div.setAttribute('data-type', el.type === 'text' ? (role === 'headline' || role === 'subhead' ? 'header' : 'paragraph') : el.type);
    div.setAttribute('data-id', `el-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
    div.setAttribute('data-uid', generateUID());
    div.setAttribute('data-v2-id', id);
    div.setAttribute('data-v2-role', role);

    if (el.type === 'text') {
        const bs = el.blockStyle || {};
        const fontSize = bs.fontSize || defaults.fontSize;
        const fontWeight = bs.fontWeight || defaults.fontWeight;
        const fontFamily = resolveFontFamily(bs.fontFamily || defaults.fontFamily, tokenMap);
        const color = bs.color && HEX_RE.test(bs.color) ? bs.color : resolveToken(defaults.fontFamily === '$display' ? '$primary' : '$primary', tokenMap) || '#111111';
        const textAlign = bs.align || 'center';
        const lineHeight = bs.lineHeight || defaults.lineHeight;

        div.style.backgroundColor = 'transparent';
        div.style.border = 'none';
        div.style.boxShadow = 'none';

        // Build rich runs HTML
        let html = '';
        (el.runs || []).forEach(run => {
            const rs = run.style || {};
            const spanStyles = [];
            if (rs.fontSize) spanStyles.push(`font-size:${rs.fontSize}px`);
            if (rs.fontWeight) spanStyles.push(`font-weight:${rs.fontWeight}`);
            if (rs.fontFamily) spanStyles.push(`font-family:${resolveFontFamily(rs.fontFamily, tokenMap)}`);
            if (rs.color && HEX_RE.test(rs.color)) spanStyles.push(`color:${rs.color}`);

            const escapedText = escapeHtml(run.text);
            const textWithBreaks = escapedText.replace(/\n/g, '<br>');

            if (spanStyles.length > 0) {
                html += `<span style="${spanStyles.join(';')}">${textWithBreaks}</span>`;
            } else {
                html += textWithBreaks;
            }
        });

        const tagName = (role === 'headline' || role === 'subhead') ? 'h2' : 'p';
        div.innerHTML = `<div class="editable" contenteditable="true" style="
            font-size:${fontSize}px;
            font-weight:${fontWeight};
            font-family:${fontFamily};
            color:${color};
            text-align:${textAlign};
            line-height:${lineHeight};
            margin:0;padding:0;
        "><${tagName} style="margin:0;padding:0;font-size:inherit;font-weight:inherit;font-family:inherit;color:inherit;line-height:inherit;">${html}</${tagName}></div>`;
    }

    else if (el.type === 'divider') {
        const s = el.style || {};
        const color = s.color || '#cccccc';
        const thickness = s.thickness || 2;
        const width = s.width || '60%';
        div.style.backgroundColor = 'transparent';
        div.style.border = 'none';
        div.style.boxShadow = 'none';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.innerHTML = `<hr style="
            border:none;
            height:${thickness}px;
            background:${color};
            width:${width};
            margin:0;
        ">`;
    }

    else if (el.type === 'image') {
        const url = el.url || '';
        const alt = el.alt || 'Image';
        div.style.backgroundColor = 'transparent';
        div.style.border = 'none';
        div.style.boxShadow = 'none';
        if (url) {
            div.innerHTML = `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" style="width:100%;height:100%;object-fit:contain;">`;
        } else {
            div.innerHTML = `<div style="width:100%;height:100%;background:#eee;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">[Image]</div>`;
        }
    }

    else if (el.type === 'shape') {
        const shape = el.shape || 'rect';
        const color = el.style?.color || '#3498db';
        div.setAttribute('data-type', shape);
        if (shape === 'rect') {
            div.innerHTML = `<svg width="100%" height="100%"><rect width="100%" height="100%" fill="${color}"></rect></svg>`;
        } else if (shape === 'circle') {
            div.innerHTML = `<svg width="100%" height="100%"><circle cx="50%" cy="50%" r="50%" fill="${color}"></circle></svg>`;
        } else if (shape === 'line') {
            div.innerHTML = `<svg width="100%" height="100%"><line x1="0" y1="50%" x2="100%" y2="50%" stroke="${color}" stroke-width="2"></line></svg>`;
        } else if (shape === 'arrow') {
            div.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100"><line x1="0" y1="50" x2="70" y2="50" stroke="${color}" stroke-width="4"/><polygon points="70,40 70,60 100,50" fill="${color}"/></svg>`;
        } else if (shape === 'triangle') {
            div.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100"><polygon points="50,0 0,100 100,100" fill="${color}"/></svg>`;
        }
    }

    else if (el.type === 'spacer') {
        div.style.backgroundColor = 'transparent';
        div.style.border = 'none';
        div.style.boxShadow = 'none';
        div.style.pointerEvents = 'none';
    }

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    div.appendChild(resizeHandle);

    return div;
}


// ═══════════════════════════════════════════════════════════════
// 7. FULL IMPORT PIPELINE
// ═══════════════════════════════════════════════════════════════

/**
 * Parse raw JSON string → validate → sanitize → resolve layout → render.
 *
 * Returns {
 *   success: boolean,
 *   frames: Array<{ duration, transition, background, elements: HTMLElement[] }>,
 *   meta, branding, tokens, errors
 * }
 */
export function importSignageV2(jsonString, canvasWidth, canvasHeight) {
    // ── Parse ──
    let raw;
    try {
        raw = JSON.parse(jsonString);
    } catch (err) {
        return { success: false, frames: [], meta: null, branding: null, tokens: null, errors: [`JSON parse error: ${err.message}`] };
    }

    // ── Validate + sanitize ──
    const { valid, data, errors } = validateAndSanitize(raw);
    if (!valid || !data) {
        return { success: false, frames: [], meta: null, branding: null, tokens: null, errors };
    }

    const tokenMap = buildTokenMap(data.tokens);

    // ── Resolve canvas size from aspect ratio ──
    const { width: cw, height: ch } = aspectRatioToSize(
        data.meta.aspectRatio,
        canvasWidth || 1920,
        canvasHeight || 1080
    );

    // ── Process each frame ──
    const renderedFrames = data.frames.map(frame => {
        // Resolve layout
        const positioned = resolveLayout(frame, cw, ch, tokenMap);

        // Render each to DOM
        const domElements = positioned.map(pos => renderElementToDOM(pos, tokenMap));

        // Build background CSS
        const backgroundCSS = buildBackgroundCSS(frame.background);

        return {
            duration: frame.duration,
            transition: frame.transition,
            background: backgroundCSS,
            canvasWidth: cw,
            canvasHeight: ch,
            domElements,
            // Keep positioned data for potential re-layout
            _positioned: positioned,
        };
    });

    return {
        success: true,
        frames: renderedFrames,
        meta: data.meta,
        branding: data.branding,
        tokens: data.tokens,
        errors,
    };
}


// ═══════════════════════════════════════════════════════════════
// 8. UTILITY: HTML escaping (security)
// ═══════════════════════════════════════════════════════════════

function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    return escapeHtml(str);
}


// ═══════════════════════════════════════════════════════════════
// 9. EXPORTS SUMMARY
// ═══════════════════════════════════════════════════════════════
// Core exports at declaration site above:
//   getProxyUrl, setProxyUrl, MODEL,
//   CLARIFY_SYSTEM_PROMPT, GENERATE_SYSTEM_PROMPT,
//   SIGNAGE_SYSTEM_PROMPT (legacy alias),
//   importSignageV2, validateAndSanitize,
//   resolveLayout, resolveToken,
//   renderElementToDOM, buildBackgroundCSS, aspectRatioToSize
//
// Removed: buildQuickSignPrompt, PRESET_PROMPTS (no longer
// needed — the conversational flow replaces form-based presets).
