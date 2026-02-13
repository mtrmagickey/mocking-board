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
export const MODEL = 'gpt-4.1-nano';          // clarification pass (cheap)
export const GENERATION_MODEL = 'gpt-4.1-mini'; // generation pass (creative)

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
export const CLARIFY_SYSTEM_PROMPT = `You are a sign-design assistant. The user described the sign they need. Ask EXACTLY 3 short follow-up questions to make a great sign.

IMPORTANT: Your questions must be SPECIFIC to what the user actually asked for. Do NOT use generic templates. Read the request carefully and ask about the gaps.

Examples of GOOD questions (specific to the request):
- If they say "welcome sign for a bakery" → ask "What's the bakery name and any tagline?" not generic "what text goes on the sign?"
- If they mention a conference → ask "Single-day or multi-day? Should we include a hashtag or URL?"
- If the purpose is clear → skip asking about mood and instead ask about specific details like colors, timing, or layout preferences

Examples of BAD questions (too generic):
- "What text should go on the sign?" (when they already said)
- "What feeling should it evoke?" (a fixed template question)
- "Landscape or portrait?" (ask only if it actually matters)

Each question should fill in a REAL gap in the request. Be conversational and short (one sentence each).

IMPORTANT CAPABILITIES: This app can generate text, shapes, dividers, gradients, colors, and animations. It CANNOT fetch photos, add real images, apply glossy finishes, or use external assets. Avoid questions that imply those capabilities.

Respond with ONLY this JSON — no markdown, no commentary:

{
  "questions": [
    "<specific follow-up #1>",
    "<specific follow-up #2>",
    "<specific follow-up #3>"
  ]
}`;

/**
 * PASS 2: Generate.
 * The model receives the full conversation (initial request +
 * clarifications + user answers) and outputs the v2 signage JSON.
 */
export const GENERATE_SYSTEM_PROMPT = `You are an award-winning signage designer who creates DIVERSE, STUNNING digital signs across every aesthetic — from neon nightclubs to clean corporate, from warm rustic to playful kids' events. You adapt your style to match the sign's purpose and context. Output ONLY valid JSON, no markdown.

## WHAT YOU CAN ACTUALLY USE (ELEMENT CATALOG)
- element.type: "text", "shape", "divider", "image", "spacer"
- shape.shape: "rect", "circle", "triangle", "line", "arrow"
- text roles: "headline", "subhead", "body", "detail", "brand", "footer", "accent"
- divider role: "accent" (or any role)
- image: requires https URL, otherwise leave empty and the app will show a placeholder

### REQUIRED POSITIONING
Every element MUST include:
    "position": { "x": 0-95, "y": 0-95, "w": 10-100 }
These are percentages of the canvas. This is how you control layout.

## JSON STRUCTURE (MUST MATCH)
{
    "version": "2.0",
    "meta": { "title": "...", "intent": "quick-signage", "contrast": "high", "aspectRatio": "16:9" },
    "tokens": {
        "colors": { "primary":"#hex", "secondary":"#hex", "accent":"#hex", "bg":"#hex", "muted":"#hex" },
        "fonts": { "display": "FontName", "body": "FontName" },
        "spacing": { "sm": 16, "md": 44, "lg": 88 }
    },
    "frames": [
        {
            "duration": 30,
            "transition": { "type": "fade", "duration": 0.8 },
            "background": {
                "type": "gradient"|"solid",
                "gradient": { "type": "linear"|"radial"|"conic", "direction": "135deg", "stops": [{"color":"#hex","position":0},{"color":"#hex","position":100}] },
                "color": "#hex",
                "overlay": { "color": "#000000", "opacity": 0.2 }
            },
            "layout": { "type": "absolute", "children": ["el-1","el-2"] },
            "elements": [
                { "id": "el-1", "type": "text", "role": "headline", "position": {"x":5,"y":10,"w":60}, "runs":[{"text":"..."}], "blockStyle": { "fontFamily":"$display", "fontSize":120, "fontWeight":700, "color":"$primary", "align":"left" } },
                { "id": "el-2", "type": "shape", "shape": "circle", "position": {"x":70,"y":5,"w":20}, "style": { "color":"$accent", "opacity":0.2, "filter":"blur(12px)" } }
            ]
        }

        ## ANIMATION CHEAT-SHEET (element.animation)
        - type: "pulse" | "float" | "spin" | "glow-pulse" | "fade-pulse" | "gradient-rotate" | "gradient-shift" | "color-transition"
        - speed: number (10-5000) — higher = slower for gradients, lower = faster for pulses
        - startColor/endColor: "#hex" (required for gradient-rotate/gradient-shift/color-transition/glow-pulse)

        ## GRADIENT CHEAT-SHEET
        - Background gradient: background.type="gradient" with gradient.type "linear"|"radial"|"conic" and 2-4 stops
        - Shape gradient: element.style.gradient as CSS string (ex: "linear-gradient(135deg, #ff006e, #3b82f6)")
    ]
}

## YOUR DESIGN PHILOSOPHY
- **Match the mood.** A law firm's lobby sign should NOT look like a rave flyer. Read the request carefully and choose an appropriate visual direction.
- **Variety is key.** You know dozens of styles: neon, corporate, rustic, minimal, retro, playful, elegant, brutalist, organic, vintage, futuristic, hand-lettered, and more.
- **Every sign tells a story** through visual rhythm: big → small → accent → breathe → detail.
- **Animation brings signs to life.** Use it on 3-5 elements, not just 1-2. Motion creates energy.
- **Depth through layering:** translucent shapes behind text, glowing orbs, glass cards, floating accents.

## COMPOSITION — THIS IS CRITICAL
You MUST use ABSOLUTE positioning to place elements across the canvas. Do NOT center everything along the middle. Signs should feel like a designed poster, not a PowerPoint slide.

### Rule of Thirds
Imagine the canvas divided into a 3×3 grid. Place key elements at or near the INTERSECTIONS (at ~33% and ~66% of width/height). This creates dynamic, professional compositions.

### Composition Strategies (pick one per frame):
1. **Asymmetric split**: Headline top-left (x:5, y:8), body text bottom-right (x:45, y:65), shapes scattered in remaining space.
2. **Diagonal flow**: Elements arranged along a diagonal from top-left to bottom-right (or vice versa).
3. **L-shape**: Large headline along the top, supporting text down the left side, open space bottom-right filled with shapes.
4. **Z-pattern**: Eye flows top-left → top-right → bottom-left → bottom-right.
5. **Hero + scatter**: One big element dominates ~40% of the canvas, smaller elements scattered around it with breathing room.
6. **Thirds columns**: Content in the left or right third, decorative shapes filling the other two-thirds.

### Position Guidelines
- Headline: Place it prominently but NOT dead center. Try top-left, top-right, or offset from center.
- Body text: Offset from the headline — don't stack directly below. Use a different region of the canvas.
- Shapes: Scatter across the canvas! Place in corners, edges, and open space. Overlap text slightly for depth (use low opacity).
- Dividers: Can be diagonal, short accents, not just centered horizontal lines.
- Leave intentional OPEN SPACE — not every region needs filling. Whitespace is a design element.

Each element needs a "position" object with x, y, w values (percentages of canvas):
- x: 0-95 (left edge of element as % of canvas width)
- y: 0-95 (top edge of element as % of canvas height)
- w: 10-100 (width of element as % of canvas width)
- Text height is auto-calculated from content and font size.
- Shape height comes from the shape type.

## DESIGN GUIDELINES — Adapt these to the sign's mood

1. **Background** — Choose what fits: bold gradients for events/nightlife, solid or subtle gradients for corporate/institutional, warm tones for cafés/restaurants, pastels for kids/playful, dark+neon for tech/gaming. Solid backgrounds are fine when appropriate.
2. **At least 2-3 shape elements** — Decorative shapes create visual interest. Scale and style should match the aesthetic (geometric for modern, organic for natural, etc.)
3. **A divider** between text sections adds structure.
4. **Strong headline text**: 80-160px depending on content length. Use textShadow only when it fits the aesthetic (neon glow for nightlife, subtle drop-shadow for corporate, none for clean minimal).
5. **High contrast** and readable — this is non-negotiable. But palette warmth/coolness should match the context.
6. **6-10 elements per frame** for visual richness.
7. **At least 3 animated elements** per frame — even subtle animations (gentle pulse, slow float) keep signs alive.

## TEXT STYLING — Match the aesthetic

### For bold/neon/nightlife signs:
- textShadow with neon glow layers, uppercase, wide letterSpacing (0.15em-0.3em)
- Example: "0 0 7px #fff, 0 0 21px #ff00de, 0 0 82px #ff00de"

### For elegant/formal signs:
- Subtle textShadow (soft drop), title case or small caps, moderate letterSpacing (0.05em-0.12em)
- Example: "0 2px 10px rgba(0,0,0,0.15)"

### For clean/corporate/minimal signs:
- No textShadow or very subtle, no forced uppercase, normal letterSpacing
- Let the typography speak for itself

### For warm/rustic/organic signs:
- Warm soft shadows, comfortable sizing, lowercase or sentence case OK
- Example: "0 2px 8px rgba(80,40,0,0.2)"

### For playful/kids/colorful signs:
- Bright colors, fun shadows, mixed case OK, bouncy animations
- Example: "2px 2px 0 #ff6b6b, 4px 4px 0 #ffd93d"

## SHAPE & EFFECT TECHNIQUES

### Shape effects
- **Glowing orbs**: circle, opacity 0.15-0.4, boxShadow glow, animate with pulse — great for nightlife/tech
- **Glass cards**: rect, backdropFilter blur(20px), opacity 0.1-0.2 — great for modern/corporate
- **Accent bars**: rect with gradient fill — great for any style
- **Floating bubbles**: circle, small, opacity 0.2-0.5, float animation — great for playful/organic
- **Subtle panels**: rect, soft background, rounded corners — great for corporate/institutional
- **Textured shapes**: opacity 0.05-0.15 for depth without dominating

Shape style properties:
- "boxShadow": CSS shadow string — floating depth
- "borderRadius": "50%" for circles, "8px"-"24px" for rounded rects
- "opacity": 0.05-1.0
- "backdropFilter": "blur(8px)"-"blur(24px)" — glassmorphism
- "filter": "blur(8px)"-"blur(40px)" — soft glow blobs
- "gradient": CSS gradient string

### Divider styling
"boxShadow" for glow effect. "thickness": 2-3, "width": "30%"-"50%".

### Animation — USE ON 3-5 ELEMENTS PER FRAME
- { "type": "pulse", "speed": 2000-4000 } — breathing scale. Great on shapes, orbs.
- { "type": "float", "speed": 3000-6000 } — vertical float. Great on shapes, accent text.
- { "type": "spin", "speed": 8000-20000 } — slow rotation. Great on gradient shapes, abstract accents.
- { "type": "glow-pulse", "speed": 2000-4000, "startColor": "#hex", "endColor": "#hex" } — pulsating shadow.
- { "type": "fade-pulse", "speed": 3000-5000 } — opacity breathing. Great on background shapes.
- { "type": "gradient-rotate", "startColor": "#hex", "endColor": "#hex", "speed": 30-80 } — spinning gradient fill.
- { "type": "gradient-shift", "startColor": "#hex", "endColor": "#hex", "speed": 60-120 } — morphing colors.
- { "type": "color-transition", "startColor": "#hex", "endColor": "#hex", "speed": 2000-4000 } — bg color toggle.

Mix types per sign. Even corporate signs benefit from subtle pulse/float.

### Background options
- Linear gradient: various angles (135deg, 225deg, 160deg, 180deg)
- Radial gradient: spotlight effect
- Conic gradient: starburst/sweep
- Solid color: appropriate for clean/minimal/corporate designs
- Color stops: 2-4 stops for richness
- Overlay: {"color": "#000000", "opacity": 0.1-0.5} for tinted depth (optional, not mandatory)

### Multi-frame slideshows
For detailed signs, use 2-3 frames:
- Frame 1: Hero statement (big headline, dramatic)
- Frame 2: Details/info (structured, readable)
- Frame 3: Call to action or branding
Each frame gets unique background, layout, and animations. Frames auto-cycle with "fade" transition.

## FONT PAIRINGS — Choose based on mood

| Mood | Display Font | Body Font |
|------|-------------|-----------|
| Elegant/Classic | Playfair Display | Lora |
| Modern/Clean | Montserrat | Roboto |
| Bold/Impact | Bebas Neue | Roboto |
| Tech/Futuristic | Space Grotesk | Space Grotesk |
| Warm/Friendly | Poppins | Poppins |
| Editorial | Playfair Display | Roboto |
| Casual/Fun | Permanent Marker | Poppins |
| Condensed/Urban | Oswald | Roboto |
| Refined | Raleway | Lora |
| Traditional | Old Standard TT | Georgia |
| Handwritten accent | Caveat | Roboto |
| Corporate | Roboto | Roboto |
| Inviting | Poppins | Lora |

## ELEMENT TYPES

- **text**: "runs":[{"text":"..."}], "blockStyle": { fontFamily, fontSize (18-160), fontWeight (400/600/700/900), color, align, lineHeight (0.9-1.5), textShadow, letterSpacing, textTransform, opacity }
- **shape**: "shape": "rect"|"circle"|"triangle". "style": { color, boxShadow, borderRadius, opacity, backdropFilter, filter, gradient }
- **divider**: "style": { color, thickness (2-4), width ("30%"-"60%"), boxShadow }
- **spacer**: breathing room between sections

## JSON SCHEMA

{
  "version": "2.0",
  "meta": { "title": "string", "intent": "quick-signage", "contrast": "high", "aspectRatio": "16:9"|"9:16"|"4:3"|"1:1" },
  "branding": { "orgName": "", "logoUrl": "", "palette": "" },
  "tokens": {
    "colors": { "primary":"#hex", "secondary":"#hex", "accent":"#hex", "bg":"#hex", "muted":"#hex" },
    "fonts": { "display": "FontName", "body": "FontName" },
    "spacing": { "sm": 16, "md": 44, "lg": 88 }
  },
  "frames": [{
    "duration": 30,
    "transition": { "type": "fade", "duration": 0.8 },
    "background": {
      "type": "gradient"|"solid",
      "gradient": { "type": "linear"|"radial"|"conic", "direction": "135deg", "stops": [{"color":"#hex","position":0},{"color":"#hex","position":100}] },
      "color": "#hex",
      "overlay": { "color": "#000000", "opacity": 0.3 }
    },
    "layout": { "type": "absolute", "children": ["el-1","el-2",...] },
    "elements": [
      { "id": "el-1", "type": "shape", "position": { "x": 60, "y": 5, "w": 35 }, ... },
      { "id": "el-2", "type": "text", "role": "headline", "position": { "x": 5, "y": 12, "w": 55 }, "runs": [{"text":"..."}], "blockStyle": { ... } },
      { "id": "el-3", "type": "divider", "role": "accent", "position": { "x": 5, "y": 45, "w": 30 }, "style": { ... } },
      ...more elements
    ]
  }]
}

IMPORTANT: Every element MUST have a "position": { "x": number, "y": number, "w": number } object where x, y, w are PERCENTAGES (0-100) of the canvas dimensions. Place elements across the canvas using rule-of-thirds composition — do NOT clump everything in the center.

## blockStyle shorthand
fontFamily: "$display"|"$body". fontSize: 18-160. fontWeight: 400|600|700|900. color: "$primary"|"$secondary"|"$accent"|"$muted"|"#hex". align: "center"|"left"|"right". lineHeight: 0.9-1.5. textShadow: CSS string. letterSpacing: CSS string. textTransform: "uppercase"|"none"|"capitalize". opacity: 0-1.

## DESIGN RECIPES — Study these for RANGE, then create something UNIQUE for each request

**Neon Nightclub**: bg #0a0a1a→#1a0a2e (135deg), overlay 0.1. Glowing orb (circle, #ff006e, opacity:0.2, blur(30px), pulse). White headline 140px with triple neon glow. Gold divider. Pink subhead. Floating circle accents with gradient-rotate.

**Clean Corporate**: bg solid #FFFFFF or subtle gray gradient #f8fafc→#e2e8f0. Navy headline 100px, Montserrat, no textShadow. Thin #3b82f6 divider. Subtle rect panel (opacity 0.04) behind content. Roboto body in #334155. Gentle pulse on accent shape.

**Warm Café / Restaurant**: bg warm gradient #fef3c7→#fde68a→#f59e0b (radial). Dark brown headline 110px, Playfair Display, soft warm shadow. Cream divider. Poppins body in #78350f. Floating organic circle shapes in warm amber (opacity 0.15).

**Playful / Kids Event**: bg bright gradient #fbbf24→#f472b6→#818cf8 (135deg). White Permanent Marker headline 130px with colorful offset shadow (2px 2px #ff6b6b). Thick rainbow divider. Bouncing shapes with fast pulse. Poppins body. Bright saturated palette.

**Minimal Modern**: bg solid #0f172a (dark) or #ffffff (light). Single accent color. Large Raleway headline 120px, thin weight (400), wide letterSpacing (0.2em), no textShadow. Hair-thin divider. Lots of whitespace. Minimal shapes — one subtle glass panel. Fade-pulse on accent.

**Rustic / Handcrafted**: bg warm solid #faf5ef or subtle paper gradient #f5f0e8→#ede5d8. Dark heading in Caveat or Old Standard TT, 100px, subtle shadow. Earth-tone palette (#8b5e3c, #6b7c3f, #d4a574). Organic shape accents. Slow float animations.

**Retro Synthwave**: bg linear #2d1b69→#11001c→#0d0d2b (3 stops 160deg). Hot pink + cyan palette. Montserrat headline with neon pink glow. Horizontal rect accent bars. Gradient-shift shapes.

**Elegant Gala**: bg radial #1a1a2e→#0d0d1a, overlay 0.3. Gold headline 120px, Playfair Display, gold glow. Thin gold divider. Glass panel behind content. Subtle pulse. Lora body in cream.

**Professional / Wayfinding**: bg solid #1e293b or #ffffff. Clear, readable hierarchy. Roboto 90px headline in contrasting color, no glow. Color-coded accent bars for sections. Minimal animation (one slow pulse). High information density.

**Bold Event / Festival**: bg conic #ff006e→#3b82f6→#ff006e, overlay 0.2. White Bebas Neue headline 160px, uppercase, multi-color glow. Spinning gradient orb. Thick vibrant divider. High energy animations on 4+ elements.

**Nature / Botanical**: bg radial #064e3b→#022c22, overlay 0.1. Mint headline with soft glow. Emerald orbs (opacity 0.15, pulse). Poppins font. Organic shapes.

**Frosted Glass**: bg #667eea→#764ba2 (radial), overlay 0.2. Large glass card (backdropFilter blur(20px), opacity:0.08). White headline 120px with soft glow. Float animation.

**Seasonal Holiday**: bg festive gradient matching season. Seasonal color palette. Festive shapes. Playful but polished. Medium animations.

**Tech / Startup**: bg dark #09090b→#18181b. Space Grotesk throughout. Accent color (lime #84cc16 or cyan #22d3ee). Subtle grid shapes. Code-like precision. Clean hierarchy.

**Vintage / Retro Print**: bg warm #fefce8 or aged paper tone. Serif headlines (Old Standard TT), classic layout. Muted earth tones. Border accents instead of glow. Minimal animation.

## CRITICAL REMINDERS
- EVERY element needs a "position" object with x, y, w as percentages. Use ABSOLUTE layout.
- SCATTER elements across the canvas using rule-of-thirds. Do NOT center-stack everything.
- Shapes should be placed in different regions — corners, edges, overlapping text areas at low opacity.
- MATCH the visual style to the sign's PURPOSE and CONTEXT. Don't default to neon/dark for everything.
- textShadow glow is great for nightlife/events — but use subtle shadows or none for corporate/minimal.
- textTransform uppercase + letterSpacing is great for bold/modern — but sentence case and normal spacing works for warm/casual.
- ALWAYS use 3+ animated elements per frame — but animation intensity should match the tone (subtle for formal, energetic for events).
- ALWAYS use shapes for depth and visual interest — but shape style should match the aesthetic.
- VARY your designs dramatically between requests. Never produce the same look twice.
- USE the full element budget (6-10 elements).
- PICK a font pairing that matches the mood — don't default to one style.
- LIGHT BACKGROUNDS are completely valid for corporate, institutional, café, minimal, and many other contexts.
- SOLID BACKGROUNDS are fine when they serve the design.`;

// Legacy alias for backward compat
export const SIGNAGE_SYSTEM_PROMPT = GENERATE_SYSTEM_PROMPT;

/**
 * Creative boost wrapper — wraps a user's plain description
 * with creative direction to push the AI toward bolder output.
 */
export function wrapUserPrompt(userDescription, userAnswers) {
    // Rotate through diverse style directions to avoid sameness
    const styleDirections = [
        'Consider a BOLD, dramatic look — neon glows, dark background, vibrant gradients, high energy.',
        'Consider a CLEAN, corporate look — light background, professional fonts, subtle animations, refined palette.',
        'Consider a WARM, inviting look — earthy tones, cozy fonts, organic shapes, gentle animations.',
        'Consider a PLAYFUL, colorful look — bright palette, fun fonts, bouncy animations, energetic shapes.',
        'Consider a MINIMAL, modern look — lots of whitespace, thin typography, one accent color, understated elegance.',
        'Consider a RETRO or VINTAGE look — warm tones, serif fonts, classic layout, textured feel.',
        'Consider an ELEGANT, luxurious look — dark + gold/silver, serif display font, glass effects, slow animations.',
        'Consider a TECH/FUTURISTIC look — dark background, monospace or geometric fonts, cyan/lime accents, precise layout.',
    ];
    const styleHint = styleDirections[Math.floor(Math.random() * styleDirections.length)];

    return `## SIGN REQUEST
${userDescription}

## USER PREFERENCES
${userAnswers}

## CREATIVE DIRECTION
Design a STUNNING, eye-catching sign that matches the tone and context of the request. This should look like professional digital signage.

${styleHint}
But ultimately, let the sign's PURPOSE guide your aesthetic choices. A café menu should feel different from a tech conference banner.

COMPOSITION:
- Use ABSOLUTE positioning with a "position" object on every element.
- Place elements using RULE OF THIRDS — scatter across the canvas, NOT centered in a stack.
- Headline should be prominent but offset (top-left, top-right, or asymmetric — NOT dead center).
- Shapes should be scattered in corners, behind text, at edges — create depth through overlap and placement.
- Leave intentional open space. Not every region needs content.

MUST-HAVES:
- Every element gets a "position": { "x": %, "y": %, "w": % } for absolute placement.
- At least 3-5 animations — choose from: pulse, float, spin, glow-pulse, fade-pulse, gradient-rotate, gradient-shift, color-transition.
- Use shapes (opacity 0.1-0.3) for depth and atmosphere.
- Strong headline (80-160px) with appropriate styling for the mood (glow for nightlife, clean for corporate, warm shadow for café, etc.)
- Background that fits the context — gradients for events, solids or subtle gradients for professional, warm tones for welcoming.
- 6-10 elements for visual richness.
- Pick an intentional font pairing that matches the mood.
- Vary palettes and font pairings across requests. Avoid repeating the same colors or font combos unless the user explicitly asks for it.
- IMPORTANT: Do NOT default to dark backgrounds with neon glow unless the sign's context calls for it. Match the aesthetic to the purpose.`;
}


// ═══════════════════════════════════════════════════════════════
// 2. CONSTANTS & ALLOW‑LISTS (security)
// ═══════════════════════════════════════════════════════════════

const ALLOWED_FONTS = new Set([
    'Old Standard TT',
    'Georgia',
    'system-ui',
    'Roboto',
    'Playfair Display',
    'Montserrat',
    'Oswald',
    'Raleway',
    'Poppins',
    'Bebas Neue',
    'Lora',
    'Space Grotesk',
    'Caveat',
    'Permanent Marker',
    // CSS fallback stacks are resolved at render time
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'Roboto, sans-serif',
    'Old Standard TT, serif',
    'Georgia, serif',
    'Playfair Display, serif',
    'Montserrat, sans-serif',
    'Oswald, sans-serif',
    'Raleway, sans-serif',
    'Poppins, sans-serif',
    'Bebas Neue, sans-serif',
    'Lora, serif',
    'Space Grotesk, sans-serif',
    'Caveat, cursive',
    'Permanent Marker, cursive',
]);

const FONT_STACK = {
    'Old Standard TT': 'Old Standard TT, serif',
    'Georgia': 'Georgia, serif',
    'system-ui': "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'Roboto': 'Roboto, sans-serif',
    'Playfair Display': 'Playfair Display, serif',
    'Montserrat': 'Montserrat, sans-serif',
    'Oswald': 'Oswald, sans-serif',
    'Raleway': 'Raleway, sans-serif',
    'Poppins': 'Poppins, sans-serif',
    'Bebas Neue': 'Bebas Neue, sans-serif',
    'Lora': 'Lora, serif',
    'Space Grotesk': 'Space Grotesk, sans-serif',
    'Caveat': 'Caveat, cursive',
    'Permanent Marker': 'Permanent Marker, cursive',
};

/** All font families that need loading from Google Fonts */
export const GOOGLE_FONT_FAMILIES = [
    'Old Standard TT:wght@400;700',
    'Roboto:wght@400;600;700;900',
    'Playfair Display:wght@400;600;700;900',
    'Montserrat:wght@400;600;700;900',
    'Oswald:wght@400;600;700',
    'Raleway:wght@400;600;700',
    'Poppins:wght@400;600;700;900',
    'Bebas Neue',
    'Lora:wght@400;600;700',
    'Space Grotesk:wght@400;600;700',
    'Caveat:wght@400;700',
    'Permanent Marker',
];

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

const MAX_FRAMES = 5;
const MAX_ELEMENTS_PER_FRAME = 14;
const FONT_SIZE_MIN = 14;
const FONT_SIZE_MAX = 200;
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
const ALLOWED_TEXT_TRANSFORMS = new Set(['uppercase', 'lowercase', 'capitalize', 'none']);

function sanitizeBlockStyle(bs, tokenMap) {
    if (!bs || typeof bs !== 'object') return {};
    const out = {};
    if (bs.fontFamily) out.fontFamily = sanitizeFont(bs.fontFamily, tokenMap);
    if (bs.fontSize != null) out.fontSize = clamp(bs.fontSize, FONT_SIZE_MIN, FONT_SIZE_MAX);
    if (bs.fontWeight != null) out.fontWeight = clamp(bs.fontWeight, 100, 900);
    if (bs.color) out.color = sanitizeColor(bs.color, tokenMap);
    if (bs.align && ALLOWED_TEXT_ALIGNS.has(bs.align)) out.align = bs.align;
    if (bs.lineHeight != null) out.lineHeight = clamp(bs.lineHeight, 0.8, 3.0);
    // Neon glow / text-shadow
    if (typeof bs.textShadow === 'string') out.textShadow = bs.textShadow.slice(0, 200);
    // Letter-spacing
    if (typeof bs.letterSpacing === 'string') out.letterSpacing = bs.letterSpacing.slice(0, 20);
    else if (typeof bs.letterSpacing === 'number') out.letterSpacing = `${clamp(bs.letterSpacing, -5, 30)}px`;
    // Text-transform (uppercase, etc.)
    if (ALLOWED_TEXT_TRANSFORMS.has(bs.textTransform)) out.textTransform = bs.textTransform;
    // Per-element opacity
    if (bs.opacity != null) out.opacity = clamp(bs.opacity, 0, 1);
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

    if (el.position && typeof el.position === 'object') {
        const x = clamp(el.position.x, 0, 95);
        const y = clamp(el.position.y, 0, 95);
        const w = clamp(el.position.w, 10, 100);
        out.position = { x, y, w };
    }

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
        if (typeof el.style?.boxShadow === 'string') out.style.boxShadow = el.style.boxShadow.slice(0, 200);
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
        // Floating shadow
        if (typeof el.style?.boxShadow === 'string') out.style.boxShadow = el.style.boxShadow.slice(0, 200);
        // Rounded corners
        if (typeof el.style?.borderRadius === 'string') out.style.borderRadius = el.style.borderRadius.slice(0, 30);
        else if (typeof el.style?.borderRadius === 'number') out.style.borderRadius = `${clamp(el.style.borderRadius, 0, 999)}px`;
        // Opacity
        if (el.style?.opacity != null) out.style.opacity = clamp(el.style.opacity, 0, 1);
        // Glassmorphism
        if (typeof el.style?.backdropFilter === 'string') out.style.backdropFilter = el.style.backdropFilter.slice(0, 100);
        // CSS filter
        if (typeof el.style?.filter === 'string') out.style.filter = el.style.filter.slice(0, 100);
        // Gradient fill (linear-gradient / radial-gradient string)
        if (typeof el.style?.gradient === 'string') out.style.gradient = el.style.gradient.slice(0, 200);
    }

    // Animation config (any element type)
    if (el.animation && typeof el.animation === 'object') {
        const anim = el.animation;
        out.animation = {};
        if (['gradient-rotate','gradient-shift','color-transition','pulse','float','spin','glow-pulse','fade-pulse'].includes(anim.type)) {
            out.animation.type = anim.type;
        }
        if (typeof anim.speed === 'number') out.animation.speed = clamp(anim.speed, 10, 5000);
        if (typeof anim.startColor === 'string' && HEX_RE.test(anim.startColor)) out.animation.startColor = anim.startColor;
        if (typeof anim.endColor === 'string' && HEX_RE.test(anim.endColor)) out.animation.endColor = anim.endColor;
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
            type: l.type === 'absolute' ? 'absolute' : 'stack',
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

    raw.frames.slice(0, MAX_FRAMES).forEach((frame, frameIndex) => {
        if (frame && frame.layout && frame.layout.type && frame.layout.type !== 'absolute') {
            errors.push(`Frame ${frameIndex + 1}: layout.type should be "absolute" for designed compositions.`);
        }
        const elements = Array.isArray(frame?.elements) ? frame.elements : [];
        elements.forEach((el, elIndex) => {
            const pos = el?.position;
            const hasPos = pos && typeof pos.x === 'number' && typeof pos.y === 'number' && typeof pos.w === 'number';
            if (!hasPos) {
                const label = el?.id ? `"${el.id}"` : `#${elIndex + 1}`;
                errors.push(`Frame ${frameIndex + 1}: element ${label} is missing position {x,y,w}.`);
            }
        });
    });

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
 * Estimate shape height — shapes are significant visual elements, not tiny accents.
 * Large shapes create depth and visual impact through layering.
 */
function estimateShapeHeight(availableWidth, shape) {
    if (shape === 'circle') return Math.min(200, Math.round(availableWidth * 0.18));
    if (shape === 'rect') return Math.min(80, Math.round(availableWidth * 0.06));
    if (shape === 'triangle') return Math.min(120, Math.round(availableWidth * 0.1));
    return Math.min(150, Math.round(availableWidth * 0.12));
}

/**
 * Estimate shape cross-axis width — shapes should have visual presence.
 */
function estimateShapeCrossSize(availableWidth, shape) {
    if (shape === 'circle') return Math.min(200, Math.round(availableWidth * 0.18));
    if (shape === 'rect') return Math.round(availableWidth * 0.45);  // accent bar
    if (shape === 'triangle') return Math.min(120, Math.round(availableWidth * 0.1));
    return Math.round(availableWidth * 0.3);
}


/**
 * Resolve a single frame's layout into positioned elements.
 * Returns an array of { id, x, y, w, h, element } objects.
 *
 * Supports two layout modes:
 *   - "absolute": each element has a "position" { x, y, w } in percentages
 *   - "stack" (legacy): vertical/horizontal stack with centering
 */
export function resolveLayout(frame, canvasWidth, canvasHeight, tokenMap) {
    const layout = frame.layout || {};

    // Build element lookup
    const elementMap = new Map();
    (frame.elements || []).forEach(el => elementMap.set(el.id, el));

    // Ordered children
    const orderedIds = (layout.children || []).filter(id => elementMap.has(id));
    const orderedElements = orderedIds.map(id => elementMap.get(id));

    // ── Check if ANY element has a position object → use absolute mode ──
    const hasAbsolutePositions = orderedElements.some(el => el.position && typeof el.position.x === 'number');
    const isAbsolute = layout.type === 'absolute' || hasAbsolutePositions;
    if (isAbsolute) {
        applyFallbackPositions(orderedElements);
    }

    if (isAbsolute) {
        return resolveAbsoluteLayout(orderedElements, canvasWidth, canvasHeight, tokenMap);
    }

    // ── Legacy stack layout ──
    return resolveStackLayout(orderedElements, layout, canvasWidth, canvasHeight, tokenMap);
}

function applyFallbackPositions(elements) {
    if (!Array.isArray(elements) || elements.length === 0) return;

    const strategy = pickFallbackStrategy();

    const taken = [];
    const place = (el, pos) => {
        if (!el.position) el.position = {};
        el.position.x = typeof el.position.x === 'number' ? el.position.x : pos.x;
        el.position.y = typeof el.position.y === 'number' ? el.position.y : pos.y;
        el.position.w = typeof el.position.w === 'number' ? el.position.w : pos.w;
        taken.push({ x: el.position.x, y: el.position.y, w: el.position.w });
    };

    const roleDefaults = strategy.roleDefaults;
    const shapeSlots = strategy.shapeSlots;
    const dividerDefaults = strategy.dividerDefaults;
    const imageDefaults = strategy.imageDefaults;
    let shapeIndex = 0;

    elements.forEach(el => {
        const hasPos = el.position && typeof el.position.x === 'number' && typeof el.position.y === 'number' && typeof el.position.w === 'number';
        if (hasPos) {
            taken.push({ x: el.position.x, y: el.position.y, w: el.position.w });
            return;
        }

        if (el.type === 'text') {
            const role = el.role || 'body';
            const pos = roleDefaults[role] || roleDefaults.body;
            place(el, pos);
            return;
        }

        if (el.type === 'divider') {
            place(el, dividerDefaults);
            return;
        }

        if (el.type === 'image') {
            place(el, imageDefaults);
            return;
        }

        if (el.type === 'shape') {
            const pos = shapeSlots[Math.min(shapeIndex, shapeSlots.length - 1)];
            place(el, pos);
            shapeIndex += 1;
            return;
        }

        place(el, { x: 10, y: 10, w: 40 });
    });
}

function pickFallbackStrategy() {
    const strategies = [
        {
            name: 'asymmetric-left',
            roleDefaults: {
                headline: { x: 5, y: 10, w: 60 },
                subhead: { x: 8, y: 26, w: 52 },
                body: { x: 55, y: 56, w: 38 },
                detail: { x: 55, y: 70, w: 38 },
                brand: { x: 6, y: 78, w: 30 },
                footer: { x: 6, y: 86, w: 40 },
                accent: { x: 8, y: 46, w: 28 },
            },
            shapeSlots: [
                { x: 70, y: 6, w: 22 },
                { x: 76, y: 62, w: 18 },
                { x: 8, y: 64, w: 20 },
                { x: 40, y: 8, w: 16 },
                { x: 32, y: 74, w: 16 },
            ],
            dividerDefaults: { x: 8, y: 44, w: 30 },
            imageDefaults: { x: 62, y: 18, w: 32 },
        },
        {
            name: 'diagonal-flow',
            roleDefaults: {
                headline: { x: 6, y: 8, w: 52 },
                subhead: { x: 12, y: 24, w: 46 },
                body: { x: 58, y: 46, w: 36 },
                detail: { x: 60, y: 62, w: 34 },
                brand: { x: 12, y: 80, w: 26 },
                footer: { x: 62, y: 82, w: 32 },
                accent: { x: 10, y: 44, w: 26 },
            },
            shapeSlots: [
                { x: 72, y: 8, w: 20 },
                { x: 78, y: 52, w: 16 },
                { x: 18, y: 66, w: 18 },
                { x: 36, y: 18, w: 16 },
                { x: 48, y: 74, w: 14 },
            ],
            dividerDefaults: { x: 12, y: 40, w: 26 },
            imageDefaults: { x: 60, y: 16, w: 30 },
        },
        {
            name: 'right-column',
            roleDefaults: {
                headline: { x: 48, y: 10, w: 45 },
                subhead: { x: 52, y: 26, w: 40 },
                body: { x: 8, y: 56, w: 36 },
                detail: { x: 8, y: 70, w: 36 },
                brand: { x: 50, y: 78, w: 32 },
                footer: { x: 50, y: 86, w: 34 },
                accent: { x: 50, y: 44, w: 26 },
            },
            shapeSlots: [
                { x: 8, y: 8, w: 24 },
                { x: 14, y: 64, w: 18 },
                { x: 68, y: 6, w: 18 },
                { x: 72, y: 62, w: 14 },
                { x: 34, y: 76, w: 14 },
            ],
            dividerDefaults: { x: 52, y: 42, w: 26 },
            imageDefaults: { x: 10, y: 18, w: 32 },
        },
        {
            name: 'z-pattern',
            roleDefaults: {
                headline: { x: 6, y: 10, w: 58 },
                subhead: { x: 56, y: 24, w: 36 },
                body: { x: 10, y: 56, w: 40 },
                detail: { x: 58, y: 70, w: 34 },
                brand: { x: 10, y: 82, w: 26 },
                footer: { x: 58, y: 84, w: 34 },
                accent: { x: 36, y: 44, w: 28 },
            },
            shapeSlots: [
                { x: 72, y: 8, w: 20 },
                { x: 8, y: 68, w: 18 },
                { x: 72, y: 58, w: 16 },
                { x: 32, y: 14, w: 16 },
                { x: 46, y: 74, w: 14 },
            ],
            dividerDefaults: { x: 34, y: 40, w: 24 },
            imageDefaults: { x: 60, y: 14, w: 30 },
        }
    ];

    return strategies[Math.floor(Math.random() * strategies.length)];
}

/**
 * Absolute layout — each element has a "position" { x, y, w } in percentages.
 * Height is auto-estimated from content.
 */
function resolveAbsoluteLayout(elements, canvasWidth, canvasHeight, tokenMap) {
    const positioned = [];

    elements.forEach(el => {
        const resolved = resolveElementTokens(el, tokenMap);
        const pos = el.position || {};

        // Convert percentage positions to pixels (default to centered if missing)
        const xPct = typeof pos.x === 'number' ? pos.x : 50;
        const yPct = typeof pos.y === 'number' ? pos.y : 50;
        const wPct = typeof pos.w === 'number' ? pos.w : 80;

        const x = Math.round((xPct / 100) * canvasWidth);
        const y = Math.round((yPct / 100) * canvasHeight);
        const w = Math.round((wPct / 100) * canvasWidth);

        // Estimate height based on element type
        let h;
        if (el.type === 'text') {
            h = estimateTextHeight(resolved, w, tokenMap);
        } else if (el.type === 'divider') {
            h = estimateDividerHeight(resolved);
        } else if (el.type === 'spacer') {
            h = estimateSpacerHeight();
        } else if (el.type === 'image') {
            h = estimateImageHeight(w);
        } else if (el.type === 'shape') {
            const shape = el.shape || 'rect';
            h = estimateShapeHeight(w, shape);
        } else {
            h = 50;
        }

        positioned.push({
            id: resolved.id,
            x: Math.max(0, x),
            y: Math.max(0, y),
            w: Math.max(20, w),
            h: Math.max(10, Math.round(h)),
            element: resolved
        });
    });

    return positioned;
}

/**
 * Legacy stack layout — vertical/horizontal centered stacks.
 */
function resolveStackLayout(orderedElements, layout, canvasWidth, canvasHeight, tokenMap) {
    const direction = layout.direction || 'vertical';
    const align = layout.align || 'center';
    const justify = layout.justify || 'center';
    const padding = typeof layout.padding === 'number' ? layout.padding : 60;
    const gap = typeof layout.gap === 'number' ? layout.gap : 32;

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
            const shape = el.shape || 'rect';
            const h = estimateShapeHeight(availableCross, shape);
            const cSize = estimateShapeCrossSize(availableCross, shape);
            return { main: isVertical ? h : cSize, cross: isVertical ? cSize : h, el: resolved };
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
    let css;
    if (bg.type === 'gradient' && bg.gradient) {
        const g = bg.gradient;
        const stops = g.stops.map(s => `${s.color} ${s.position}%`).join(', ');
        if (g.type === 'radial') css = `radial-gradient(circle, ${stops})`;
        else if (g.type === 'conic') css = `conic-gradient(from 0deg, ${stops})`;
        else css = `linear-gradient(${g.direction || 'to bottom'}, ${stops})`;
    } else {
        css = bg.color || '#ffffff';
    }
    // Overlay (dark tint for readability)
    if (bg.overlay && bg.overlay.opacity > 0) {
        const oc = bg.overlay.color || '#000000';
        const oa = bg.overlay.opacity;
        // Layer overlay on top of the gradient/solid
        css = `linear-gradient(${oc}${Math.round(oa * 255).toString(16).padStart(2, '0')}, ${oc}${Math.round(oa * 255).toString(16).padStart(2, '0')}), ${css}`;
    }
    return css;
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
    div.className = 'element svg-container';
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

    // ── Initialize all dataset attrs for parity with elementCreation.js ──
    div.dataset.rotation = '0';
    div.dataset.colorGradient = '';
    div.dataset.colorTransition = '';
    div.dataset.gradientType = '';
    div.dataset.gradientDirection = '';
    div.dataset.gradientAnimStyle = '';
    div.dataset.gradientStartColor = '';
    div.dataset.gradientEndColor = '';
    div.dataset.gradientAngle = '';
    div.dataset.gradientPreset = '';
    div.dataset.gradientActive = 'false';
    div.dataset.colorAnimActive = 'false';
    div.dataset.colorAnimType = '';
    div.dataset.colorAnimInterval = '';
    div.dataset.gradientSpeed = '';
    div.dataset.gradientPause = 'false';
    div.dataset.gradientReverse = 'false';
    div.dataset.gradientLoop = 'false';
    div.dataset.gradientStep = '';
    div.dataset.gradientFrame = '';
    div.dataset.gradientLastUpdate = '';
    div.dataset.gradientCustomStops = '';
    div.dataset.gradientOpacity = '';
    div.dataset.gradientBlendMode = '';
    div.dataset.gradientMask = '';
    div.dataset.gradientClipPath = '';
    div.dataset.gradientZIndex = '';
    div.dataset.gradientFilter = '';
    div.dataset.gradientID = '';
    div.dataset.gradientUserPreset = '';
    div.dataset.gradientMeta = '';
    div.dataset.colorAnimSpeed = '';
    div.dataset.colorAnimPause = 'false';
    div.dataset.colorAnimReverse = 'false';
    div.dataset.colorAnimLoop = 'false';
    div.dataset.colorAnimStep = '';
    div.dataset.colorAnimFrame = '';
    div.dataset.colorAnimLastUpdate = '';
    div.dataset.colorAnimCustomStops = '';
    div.dataset.colorAnimOpacity = '';
    div.dataset.colorAnimBlendMode = '';
    div.dataset.colorAnimMask = '';
    div.dataset.colorAnimClipPath = '';
    div.dataset.colorAnimZIndex = '';
    div.dataset.colorAnimFilter = '';
    div.dataset.colorAnimID = '';
    div.dataset.colorAnimUserPreset = '';
    div.dataset.colorAnimMeta = '';

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
        // Text-shadow (neon glow)
        const textShadow = bs.textShadow || '';
        // Letter-spacing
        const letterSpacing = bs.letterSpacing || '';
        // Text-transform (uppercase)
        const textTransform = bs.textTransform || '';
        // Per-text opacity
        if (bs.opacity != null) div.style.opacity = bs.opacity;

        div.innerHTML = `<div class="editable" contenteditable="true" style="
            font-size:${fontSize}px;
            font-weight:${fontWeight};
            font-family:${fontFamily};
            color:${color};
            text-align:${textAlign};
            line-height:${lineHeight};
            ${textShadow ? `text-shadow:${textShadow};` : ''}
            ${letterSpacing ? `letter-spacing:${letterSpacing};` : ''}
            ${textTransform ? `text-transform:${textTransform};` : ''}
            margin:0;padding:0;
        "><div class="text-format-toolbar"></div><${tagName} style="margin:0;padding:0;font-size:inherit;font-weight:inherit;font-family:inherit;color:inherit;line-height:inherit;text-shadow:inherit;letter-spacing:inherit;text-transform:inherit;">${html}</${tagName}></div>`;
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
            box-shadow:${s.boxShadow || `0 0 12px ${color}44, 0 0 4px ${color}66`};
            border-radius:${thickness}px;
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
        // Glassmorphism
        if (el.style?.backdropFilter) {
            div.style.backdropFilter = el.style.backdropFilter;
            div.style.webkitBackdropFilter = el.style.backdropFilter;
            div.style.backgroundColor = el.style?.opacity != null
                ? `${color}${Math.round(el.style.opacity * 255).toString(16).padStart(2, '0')}`
                : color;
        }
        // Floating shadow
        if (el.style?.boxShadow) {
            div.style.boxShadow = el.style.boxShadow;
        }
        // Border-radius (rounded shapes / pill)
        if (el.style?.borderRadius) {
            div.style.borderRadius = el.style.borderRadius;
        }
        // Opacity
        if (el.style?.opacity != null && !el.style?.backdropFilter) {
            div.style.opacity = el.style.opacity;
        }
        // CSS filter (blur, brightness, etc.)
        if (el.style?.filter) {
            div.style.filter = el.style.filter;
        }
        // Overflow hidden for rounded SVG clipping
        div.style.overflow = 'hidden';
        // Gradient fill — use CSS background instead of SVG
        if (el.style?.gradient) {
            div.style.background = el.style.gradient;
            if (shape === 'circle') {
                div.style.borderRadius = '50%';
            }
            // No SVG needed
        } else if (shape === 'rect') {
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

    // ── Animation wiring ──
    // If the element has an animation config, store it in dataset so
    // restoreElementAnimations() in main.js can pick it up.
    if (el.animation && el.animation.type) {
        const anim = el.animation;
        if (anim.type === 'gradient-rotate') {
            div.dataset.gradientActive = 'true';
            div.dataset.colorGradient = JSON.stringify({
                startColor: anim.startColor || '#ffffff',
                endColor: anim.endColor || '#000000',
                direction: '0',
                gradientType: 'linear',
                animStyle: 'rotate',
            });
            div.dataset.gradientSpeed = String(anim.speed || 50);
            div.dataset.gradientAnimStyle = 'rotate';
            div.dataset.gradientType = 'linear';
            div.dataset.gradientStartColor = anim.startColor || '#ffffff';
            div.dataset.gradientEndColor = anim.endColor || '#000000';
            div.dataset.gradientLoop = 'true';
        } else if (anim.type === 'gradient-shift') {
            div.dataset.gradientActive = 'true';
            div.dataset.colorGradient = JSON.stringify({
                startColor: anim.startColor || '#ffffff',
                endColor: anim.endColor || '#000000',
                direction: '135deg',
                gradientType: 'linear',
                animStyle: 'color-shift',
            });
            div.dataset.gradientSpeed = String(anim.speed || 80);
            div.dataset.gradientAnimStyle = 'color-shift';
            div.dataset.gradientType = 'linear';
            div.dataset.gradientStartColor = anim.startColor || '#ffffff';
            div.dataset.gradientEndColor = anim.endColor || '#000000';
            div.dataset.gradientLoop = 'true';
        } else if (anim.type === 'color-transition') {
            div.dataset.colorAnimActive = 'true';
            div.dataset.colorTransition = JSON.stringify({
                startColor: anim.startColor || '#ffffff',
                endColor: anim.endColor || '#000000',
                transitionTime: (anim.speed || 1000) / 1000,
            });
            div.dataset.colorAnimSpeed = String(anim.speed || 1000);
            div.dataset.colorAnimLoop = 'true';
        } else if (anim.type === 'pulse') {
            div.dataset.elementAnimation = JSON.stringify({
                type: 'scale',
                preset: 'gentle',
                duration: (anim.speed || 2000) / 1000,
            });
        } else if (anim.type === 'float') {
            div.dataset.elementAnimation = JSON.stringify({
                type: 'move',
                preset: 'float',
                duration: (anim.speed || 4000) / 1000,
            });
        } else if (anim.type === 'spin') {
            div.dataset.elementAnimation = JSON.stringify({
                type: 'rotate',
                preset: 'slow',
                duration: (anim.speed || 12000) / 1000,
            });
        } else if (anim.type === 'glow-pulse') {
            div.dataset.elementAnimation = JSON.stringify({
                type: 'glow-pulse',
                duration: (anim.speed || 3000) / 1000,
                startColor: anim.startColor || '#ff006e',
                endColor: anim.endColor || '#ff006e',
            });
        } else if (anim.type === 'fade-pulse') {
            div.dataset.elementAnimation = JSON.stringify({
                type: 'fade-pulse',
                duration: (anim.speed || 4000) / 1000,
            });
        }
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
