# Mocking Board

Mocking Board is a browser‑based visual mockup and storyboard tool.

It lets you drag and drop text, media, and shapes onto a canvas, customize their appearance (colors, gradients, themes, fonts), add simple animations, and export/import your layouts as JSON. It’s ideal for quickly sketching UIs, storyboards, or screen arrangements without opening a full design suite.

## Features

- **Drag‑and‑drop canvas**
	- Freeform canvas with optional snap‑to‑grid overlay.
	- Move and resize elements with handles, plus interactive rotation.
	- Lock mode to prevent accidental edits.

- **Rich element palette**
	- Text: headers and paragraphs with inline text editing.
	- Media: images, video, audio, and YouTube embeds.
	- Shapes: rectangle, circle, line, arrow, triangle (SVG‑based).
	- Special: elements configured for **color transitions** and **color gradients**.

- **Contextual editing**
	- Right‑click (or long‑press on touch) an element for a context menu:
		- Color tools: change color, transparency, make transparent.
		- Text tools: font size, font color, alignment, font family.
		- Layout tools: move forward/backward (z‑index), toggle border, delete.
		- Media tools: change linked media URL, toggle looping for video/audio.
		- Effects: create color transitions, gradients, and motion animations.

- **Themes & styling**
	- Theme picker with multiple curated palettes (Material, Flat UI, Tailwind‑inspired, Dark, Solarized, Pastel, Nord, Monokai, etc.).
	- Option to **override all element backgrounds** or only fill in unset ones.
	- Automatic contrast adjustment for text based on background color.
	- Theme‑aware updates to SVG fills/strokes and button styles.

- **Color transitions & gradients**
	- Color transition popup: define start/end colors and duration, per element.
	- Gradient popup:
		- Start/end colors, direction, and gradient type (linear, radial, conic).
		- Optional gradient animation styles (e.g., rotate, color shift).
	- Per‑element animation state tracked via stable `data-uid` identifiers, so animations survive undo/redo and import/export.

- **Element animations**
	- Animation popup for **move**, **scale**, and **rotate**.
	- Duration presets with smooth, interval‑driven animation.
	- Transform composition so rotations, translations, and scaling play nicely together.

- **Import, export & history**
	- Export current layout as structured JSON (elements + canvas properties).
	- Import a saved JSON layout to restore the scene, including animation state.
	- Undo/redo support via `stateManager.js` and per‑element animation restoration.

## Getting started

### Run locally

This is a static web app. You can open `index.html` directly in a browser, but because it uses ES modules, it’s more reliable to serve it over a simple local web server.

From the project root:

```powershell
cd "c:\Users\cpkeena2\Documents\GitHub\mocking-board"
python -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`

in your browser.

### Basic workflow

1. **Add elements**
	 - Use the **Elements** sidebar to add headers, paragraphs, images, buttons, video, audio, YouTube, shapes, or color‑effect elements.

2. **Arrange on the canvas**
	 - Drag elements to position them; use resize and rotate handles as needed.
	 - Use **Toggle Grid** to show a 20px grid and enable snapping.

3. **Edit and style**
	 - Right‑click an element to open the context menu and:
		 - Change colors, fonts, borders, and alignment.
		 - Attach media via URL or Unsplash search (once you add an API key).
		 - Apply color transitions, gradients, or motion animations.

4. **Apply a theme**
	 - Click **Theme** in the toolbar, pick a palette, and optionally override all element backgrounds.

5. **Save and load**
	 - Click **Export** to download a JSON file capturing your layout.
	 - Click **Load** and select a JSON file to restore a saved layout.

## Project structure (high level)

- `index.html` – Main page, sidebar, canvas, toolbar, popups, and widget.
- `style.css` – Layout, canvas, element styling, grid, popups, basic animations.
- `main.js` – Current main controller wiring the UI together:
	- Element creation and event attachment.
	- Drag/resize/rotate logic and lock/grid behavior.
	- Context menu actions, color tools, gradients, animations.
	- Theme picker and theme application.
	- JSON export/import and animation restoration.
- `elementManager.js` – Encapsulates creation of element DOM fragments for each `data-type`.
- `stateManager.js` – Undo/redo and saved state handling.
- `colorAnimationUtils.js` – Helpers for colors, gradients, and animation state (e.g., `hexToRgba`, `getRandomColor`, `restoreElementAnimation`, `getElementAnimationState`).
- `popupManager.js` – Generic popup open/close and accessibility helpers.
- `dragResizeManager.js` – Shared drag/resize behaviors.
- `mediaManager.js` – Media drop handling and Unsplash search wiring.
- `exportFunctionality.js` – (Legacy/auxiliary) export logic.

## Current limitations & quirks

- **Unsplash integration** requires you to insert your own Unsplash Access Key (`YOUR_UNSPLASH_ACCESS_KEY`) in the search API URL.
- **File format** is JSON with a schema that has evolved; older exports may need manual adjustment if the model changes.
- **Single‑user, in‑browser only**: no backend persistence or collaboration yet.
- **Accessibility** has some ARIA roles and labels, but hasn’t been fully audited.

## Roadmap (high level)

1. **Stabilize the core editor**
	 - Unify around `main.js` as the single entrypoint (retire legacy `script.js`).
	 - Centralize state (canvas + elements + animations + theme) in one model.
	 - Make export/import work purely from this state model.

2. **Polish the UX**
	 - Improve selection visuals, keyboard shortcuts, snapping, and guides.
	 - Streamline context menus and popups, and add lightweight onboarding.

3. **Improve reliability**
	 - Autosave, versioned JSON format, better validation on import.
	 - Tests for key helpers and state transitions.

4. **Enhance design features**
	 - Component templates, reusable styles, more animation and gradient presets.

5. **Ship‑ready packaging**
	 - Build pipeline, docs site, demo gallery, optional backend for cloud saves.

