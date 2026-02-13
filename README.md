# Mocking Board

Mocking Board is a browser-based visual tool for digital signage, storyboards, and fast UI mockups. Drag, style, animate, and present multi-frame scenes without a heavyweight design suite.

Live demo: https://www.mocking-board.com

## Highlights

- **Signage-first workflow**: present mode, fullscreen playback, and a streamlined edit/present toggle.
- **Multi-frame storyboards**: add frames, set per-frame durations, and play as a looping slideshow.
- **Create Signage for You**: AI-assisted signage generation (requires a proxy worker setup).
- **Rich editing**: drag, resize, rotate, group, lock, align, and use inline text tools.
- **Visual polish**: gradients (linear, radial, conic), animated color transitions, and motion presets.
- **Templates + library**: start from built-in templates or insert preset element blocks.
- **Import/export**: JSON-based scene export and import with animation state.

## Getting started

### Run locally

This is a static web app. You can open index.html directly, but ES modules work best when served.

From the project root:

```powershell
cd "c:\Users\MTRMK\Documents\GitHub\mocking-board"
python -m http.server 8000
```

Then open:

- http://localhost:8000/index.html

### Basic workflow

1. **Start designing**
   - Use **Create Signage for You** for an instant layout, or add elements from the sidebar.
2. **Arrange and style**
   - Drag, resize, rotate, and right-click for color, gradients, and animation tools.
3. **Add frames (optional)**
   - Use the frame bar to add frames and set durations for slideshow playback.
4. **Present**
   - Click **Present** for fullscreen signage playback.
5. **Save**
   - Export JSON to save and import later.

## AI signage setup (proxy worker)

The AI generator calls a server-side proxy so your API key stays private. This repo includes a Cloudflare Worker at [proxy/worker.js](proxy/worker.js).

1. Install Wrangler: `npm install -g wrangler`
2. Authenticate: `cd proxy; wrangler login`
3. Set your key: `wrangler secret put OPENAI_API_KEY`
4. Deploy: `wrangler deploy`
5. Set the deployed URL in [signageSchemaV2.js](signageSchemaV2.js) (`DEFAULT_PROXY_URL`) and append `/api/generate`

Local dev:

```powershell
cd proxy
wrangler dev
```

Then in the browser console:

```js
localStorage.setItem('mb_proxy_url', 'http://localhost:8787/api/generate')
```

Notes:

- The generator creates text, shapes, gradients, and animations. It does not fetch real photos or external assets.
- The proxy enforces rate limits and protects your key.

## Project structure (high level)

- [index.html](index.html) - Main UI and layout shell.
- [style.css](style.css) - Layout, canvas styling, and interaction visuals.
- [main.js](main.js) - Core controller: editing, frames, presentation, templates, and AI flows.
- [signageSchemaV2.js](signageSchemaV2.js) - Signage schema, prompt logic, validation, and layout resolver.
- [proxy/worker.js](proxy/worker.js) - Cloudflare Worker proxy for AI requests.
- [elementManager.js](elementManager.js) - Element DOM creation by type.
- [stateManager.js](stateManager.js) - Undo/redo state stack.
- [colorAnimationUtils.js](colorAnimationUtils.js) - Gradients and animation helpers.
- [popupManager.js](popupManager.js) - Popup lifecycle and accessibility.
- [dragResizeManager.js](dragResizeManager.js) - Drag/resize behavior.
- [mediaManager.js](mediaManager.js) - Media drop and Unsplash search wiring.

## Limitations

- **Unsplash search** requires your own key in [mediaManager.js](mediaManager.js).
- **Local-first**: no built-in persistence or collaboration.
- **Accessibility** is improving but not fully audited.

## License

See [LICENSE](LICENSE).

