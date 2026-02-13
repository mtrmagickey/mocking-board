import { createElement as createElementFromManager } from './elementManager.js';
import { saveState, undo, redo } from './stateManager.js';
import { hexToRgba, rgbToHex, getRandomColor, startColorTransitionAnimation, startGradientAnimation, clearIntervalsForUID, restoreElementAnimation, getElementAnimationState, setElementAnimationState, validateAnimationState } from './colorAnimationUtils.js';
import { openPopup, closePopup, setupPopupEvents } from './popupManager.js';
import { startDragging, startResizing } from './dragResizeManager.js';
import { setupMediaDrop, setupUnsplashSearch } from './mediaManager.js';
import { CLARIFY_SYSTEM_PROMPT, GENERATE_SYSTEM_PROMPT, importSignageV2, getProxyUrl, MODEL, GENERATION_MODEL, wrapUserPrompt, GOOGLE_FONT_FAMILIES } from './signageSchemaV2.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Load Google Fonts for signage generation ---
    if (GOOGLE_FONT_FAMILIES && GOOGLE_FONT_FAMILIES.length) {
        const families = GOOGLE_FONT_FAMILIES.map(f => 'family=' + f.replace(/ /g, '+')).join('&');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
        document.head.appendChild(link);
    }

    // --- Global palette (Bright Amber / Black / Grey Olive / Old Gold / Olive Bark) ---
    const BASE_PALETTE = {
        brightAmber: '#F5C919'
    };
    const DEFAULT_FRAME_DURATION = 30;
    const FRAME_DURATION_MAX = 120;

    const canvas = document.getElementById('canvas');
    const canvasContainer = document.getElementById('canvas-container');
    const loadBtn = document.getElementById('load-btn');
    const clearBtn = document.getElementById('clear-btn');
    const exportBtn = document.getElementById('export-btn');
    const templatesBtn = document.getElementById('templates-btn');
    const libraryBtn = document.getElementById('library-btn');
    const resizeBtn = document.getElementById('resize-btn');
    const variationBtn = document.getElementById('variation-btn');
    const fileInput = document.getElementById('file-input');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const lockBtn = document.getElementById('lock-btn');
    const backgroundBtn = document.getElementById('background-btn');
    const hexInput = document.getElementById('hex-input');
    const colorPicker = document.getElementById('color-picker');
    const transparencyInput = document.getElementById('transparency-input');
    const applyColorBtn = document.getElementById('apply-color-btn');
    const colorPopup = document.getElementById('color-popup');
    const contextMenu = document.getElementById('contextMenu');
    const sidebar = document.getElementById('sidebar');
    const toolbar = document.getElementById('toolbar');
    const widget = document.getElementById('widget');
    const frameBar = document.getElementById('frame-bar');
    const framePrevBtn = document.getElementById('frame-prev-btn');
    const frameNextBtn = document.getElementById('frame-next-btn');
    const frameAddBtn = document.getElementById('frame-add-btn');
    const frameLabel = document.getElementById('frame-label');
    const frameDurationInput = document.getElementById('frame-duration');
    const playModeBtn = document.getElementById('frame-play-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomFitBtn = document.getElementById('zoom-fit-btn');
    const zoomLabel = document.getElementById('zoom-label');
    const groupBtn = document.getElementById('group-btn');
    const ungroupBtn = document.getElementById('ungroup-btn');
    const presentBtn = document.getElementById('present-btn');
    const editModeBtn = document.getElementById('edit-mode-btn');
    const advancedBtn = document.getElementById('advanced-btn');
    const advancedPanel = document.getElementById('advanced-panel');
    const signageExitBtn = document.getElementById('signage-exit-btn');
    const animationsPanel = null;
    const animationsList = null;
    const reduceMotionToggle = null;

    const fontColorPicker = document.createElement('input');
    fontColorPicker.type = 'color';
    fontColorPicker.style.display = 'none';
    document.body.appendChild(fontColorPicker);

    // Onboarding elements
    const onboardingOverlay = document.getElementById('onboarding-overlay');
    const onboardingBody = document.getElementById('onboarding-body');
    const onboardingStepIndicator = document.getElementById('onboarding-step-indicator');
    const onboardingSkipBtn = document.getElementById('onboarding-skip');
    const onboardingNextBtn = document.getElementById('onboarding-next');

    // Splash screen elements
    const splashScreen = document.getElementById('splash-screen');
    const splashStartBtn = document.getElementById('splash-start-btn');
    const splashSkipBtn = document.getElementById('splash-skip-btn');

    // Background mode indicator (color / gradient / none)
    const bgModeLabel = document.createElement('span');
    bgModeLabel.id = 'bg-mode-label';
    bgModeLabel.style.marginLeft = '12px';
    bgModeLabel.style.fontSize = '11px';
    bgModeLabel.style.opacity = '0.7';
    bgModeLabel.textContent = '';
    if (toolbar) toolbar.appendChild(bgModeLabel);

    const animationPopup = document.getElementById('animation-popup');
    const animationTypeSelect = document.getElementById('animation-type');
    const animationPresetSelect = document.getElementById('animation-preset');
    const animationDurationInput = document.getElementById('animation-duration');
    const applyAnimationBtn = document.getElementById('apply-animation-btn');

    const colorTransitionPopup = document.getElementById('color-transition-popup');
    const startColorInput = document.getElementById('start-color');
    const endColorInput = document.getElementById('end-color');
    const transitionTimeInput = document.getElementById('transition-time');
    const colorTransitionPreview = document.getElementById('color-transition-preview');
    const applyTransitionBtn = document.getElementById('apply-transition-btn');

    const mediaPopup = document.getElementById('media-popup');
    const mediaUrlInput = document.getElementById('media-url-input');
    const searchQueryInput = document.getElementById('search-query-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results');
    const applyMediaBtn = document.getElementById('apply-media-btn');

    const colorGradientPopup = document.getElementById('color-gradient-popup');
    const startGradientColorInput = document.getElementById('start-gradient-color');
    const endGradientColorInput = document.getElementById('end-gradient-color');
    const gradientDirectionSelect = document.getElementById('gradient-direction');
    const colorGradientPreview = document.getElementById('color-gradient-preview');
    const applyGradientBtn = document.getElementById('apply-gradient-btn');

    // Inline text toolbar (created dynamically)
    const inlineToolbar = document.createElement('div');
    inlineToolbar.className = 'inline-text-toolbar';
    inlineToolbar.innerHTML = `
        <button type="button" data-action="bold"><b>B</b></button>
        <button type="button" data-action="italic"><i>I</i></button>
        <button type="button" data-action="underline"><u>U</u></button>
        <button type="button" data-action="align-left">L</button>
        <button type="button" data-action="align-center">C</button>
        <button type="button" data-action="align-right">R</button>
        <button type="button" data-action="smaller">A-</button>
        <button type="button" data-action="larger">A+</button>
        <select data-action="preset">
            <option value="">Style</option>
            <option value="title">Title</option>
            <option value="subtitle">Subtitle</option>
            <option value="body">Body</option>
            <option value="caption">Caption</option>
        </select>
        <select data-action="font-family">
            <option value="">Font</option>
            <option value="Roboto, sans-serif">Roboto</option>
            <option value="Old Standard TT, serif">Old Standard</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="" disabled>────────</option>
            <option value="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System</option>
        </select>
        <label style="font-size:10px;margin-left:4px;">LH
            <input type="number" data-action="line-height" min="1" max="3" step="0.1" style="width:38px;" />
        </label>
        <div class="color-swatches" data-action="swatches"></div>
        <button type="button" data-action="pin-color" title="Pin current text color">★</button>
    `;
    document.body.appendChild(inlineToolbar);

    // --- Add gradient type selector if not present ---
    let gradientTypeSelect = document.getElementById('gradient-type');
    if (!gradientTypeSelect && colorGradientPopup) {
        gradientTypeSelect = document.createElement('select');
        gradientTypeSelect.id = 'gradient-type';
        gradientTypeSelect.style.marginBottom = '8px';
        gradientTypeSelect.setAttribute('aria-label', 'Gradient Type');
        [
            { value: 'linear', label: 'Linear' },
            { value: 'radial', label: 'Radial' },
            { value: 'conic', label: 'Conic (Swirl)' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            gradientTypeSelect.appendChild(option);
        });
        // Insert at the top of the popup
        colorGradientPopup.insertBefore(gradientTypeSelect, colorGradientPopup.firstChild);
    }

    // --- Add gradient animation style selector if not present ---
    let gradientAnimSelect = document.getElementById('gradient-anim-style');
    if (!gradientAnimSelect && colorGradientPopup) {
        gradientAnimSelect = document.createElement('select');
        gradientAnimSelect.id = 'gradient-anim-style';
        gradientAnimSelect.style.marginBottom = '8px';
        gradientAnimSelect.setAttribute('aria-label', 'Gradient Animation Style');
        [
            { value: 'none', label: 'No Animation' },
            { value: 'rotate', label: 'Rotate' },
            { value: 'color-shift', label: 'Color Shift' }
        ].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            gradientAnimSelect.appendChild(option);
        });
        // Insert after gradient type selector
        if (gradientTypeSelect && gradientTypeSelect.nextSibling) {
            colorGradientPopup.insertBefore(gradientAnimSelect, gradientTypeSelect.nextSibling);
        } else {
            colorGradientPopup.insertBefore(gradientAnimSelect, colorGradientPopup.firstChild);
        }
    }

    function updateColorTransitionPreview() {
        if (!colorTransitionPreview) return;
        const start = startColorInput ? startColorInput.value || '#F5C919' : '#F5C919';
        const end = endColorInput ? endColorInput.value || '#FFF9E5' : '#FFF9E5';
        colorTransitionPreview.style.background = `linear-gradient(135deg, ${start}, ${end})`;
        const seconds = parseFloat(transitionTimeInput && transitionTimeInput.value) || 1;
        colorTransitionPreview.title = `Transition over ${seconds.toFixed(1)}s`;
    }

    function updateColorGradientPreview() {
        if (!colorGradientPreview) return;
        const start = startGradientColorInput ? startGradientColorInput.value || '#F5C919' : '#F5C919';
        const end = endGradientColorInput ? endGradientColorInput.value || '#FFF9E5' : '#FFF9E5';
        const direction = gradientDirectionSelect ? gradientDirectionSelect.value || 'to right' : 'to right';
        const type = gradientTypeSelect ? gradientTypeSelect.value || 'linear' : 'linear';
        let gradient = '';
        if (type === 'radial') {
            gradient = `radial-gradient(circle, ${start}, ${end})`;
        } else if (type === 'conic') {
            gradient = `conic-gradient(from 0deg, ${start}, ${end})`;
        } else {
            gradient = `linear-gradient(${direction}, ${start}, ${end})`;
        }
        colorGradientPreview.style.background = gradient;
        const animStyle = gradientAnimSelect ? gradientAnimSelect.value : 'none';
        const animLabel = animStyle === 'rotate' ? 'Rotating' : animStyle === 'color-shift' ? 'Color shift' : 'Static';
        colorGradientPreview.title = `${type} gradient (${animLabel})`;
    }

    const transitionPreviewInputs = [startColorInput, endColorInput, transitionTimeInput];
    transitionPreviewInputs.forEach(input => {
        if (!input) return;
        const eventName = input.type === 'number' ? 'input' : 'input';
        input.addEventListener(eventName, updateColorTransitionPreview);
    });

    const gradientPreviewInputs = [startGradientColorInput, endGradientColorInput, gradientDirectionSelect];
    gradientPreviewInputs.forEach(input => {
        if (!input) return;
        input.addEventListener('input', updateColorGradientPreview);
        input.addEventListener('change', updateColorGradientPreview);
    });
    if (gradientTypeSelect) {
        gradientTypeSelect.addEventListener('change', updateColorGradientPreview);
    }
    if (gradientAnimSelect) {
        gradientAnimSelect.addEventListener('change', updateColorGradientPreview);
    }

    updateColorTransitionPreview();
    updateColorGradientPreview();


    let draggedElement = null;
    let offset = { x: 0, y: 0 };
    let selectedElement = null;
    let isResizing = false;
    let isLocked = false;
    let gridEnabled = false;
    const alignments = ['left', 'center', 'right'];
    let alignmentIndex = 0;
    const fonts = ['Roboto', 'Pacifico', 'Old Standard TT'];
    let fontIndex = 0;

    let activeEditable = null;
    let marquee = null;
    let marqueeStart = null;
    let hGuide = null;
    let vGuide = null;

    // --- Multi-frame / storyboard state ---
    let frames = [];
    let currentFrameIndex = 0;
    let savedProjectThemeIndex = null;
    let isPlayMode = false;
    let playModeIntervalId = null;
    let zoomLevel = 1;
    const signageReasons = new Set();
    let signageActive = false;
    let editModeTimeoutId = null;
    const EDIT_MODE_TIMEOUT_MS = 12000;

    // --- Canvas artboard dimensions (fixed design size) ---
    let canvasDesignWidth = 1920;
    let canvasDesignHeight = 1080;

    // --- Fullscreen panning state ---
    let panX = 0;   // px offset from centered position
    let panY = 0;
    let _panDragging = false;
    let _panStartX = 0;
    let _panStartY = 0;
    let _panStartOffsetX = 0;
    let _panStartOffsetY = 0;

    function getFrameDuration(frame) {
        if (!frame) return DEFAULT_FRAME_DURATION;
        const duration = parseInt(frame.duration, 10);
        if (!isFinite(duration) || duration <= 0) return DEFAULT_FRAME_DURATION;
        return Math.min(FRAME_DURATION_MAX, duration);
    }

    function ensureFrameDuration(frame) {
        if (!frame) return DEFAULT_FRAME_DURATION;
        const safeDuration = getFrameDuration(frame);
        frame.duration = safeDuration;
        return safeDuration;
    }

    function updateSignageModeState() {
        const isActive = signageReasons.size > 0;
        signageActive = isActive;
        const bodyEl = document.body;
        if (bodyEl) {
            bodyEl.classList.toggle('signage-mode-active', isActive);
        }
        if (presentBtn) {
            const label = presentBtn.querySelector('.hero-fab-label');
            const icon = presentBtn.querySelector('.hero-fab-icon');
            if (isActive) {
                if (label) label.textContent = 'Exit';
                if (icon) icon.textContent = '⏹';
            } else {
                if (label) label.textContent = 'Present';
                if (icon) icon.textContent = '▶';
            }
            presentBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
        if (signageExitBtn) {
            signageExitBtn.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        }
    }

    function updateFrameBarState() {
        const bodyEl = document.body;
        if (!bodyEl) return;
        bodyEl.classList.toggle('has-multiframe', frames.length > 1);
        bodyEl.classList.toggle('is-playing', isPlayMode);
        if (playModeBtn) {
            const canPlay = frames.length > 1;
            playModeBtn.disabled = !canPlay;
            playModeBtn.setAttribute('aria-disabled', canPlay ? 'false' : 'true');
            playModeBtn.title = canPlay ? 'Preview storyboard playback' : 'Add another frame to enable playback';
        }
    }

    function clearDemoOnEdit() {
        if (!demoModeActive) return;
        demoModeActive = false;
        frames = [
            {
                elements: [],
                canvas: {
                    background: '',
                    width: `${canvasDesignWidth}px`,
                    height: `${canvasDesignHeight}px`
                },
                duration: DEFAULT_FRAME_DURATION
            }
        ];
        currentFrameIndex = 0;
        savedProjectThemeIndex = null;
        loadFrame(0);
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    }

    function setEditMode(active) {
        const bodyEl = document.body;
        if (!bodyEl) return;
        if (active) clearDemoOnEdit();
        bodyEl.classList.toggle('edit-mode', active);
        if (editModeBtn) {
            const label = editModeBtn.querySelector('.hero-fab-label');
            if (label) label.textContent = active ? 'Customizing' : 'Customize';
            editModeBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        }
        if (!active && editModeTimeoutId) {
            clearTimeout(editModeTimeoutId);
            editModeTimeoutId = null;
        }
    }

    function scheduleEditModeTimeout() {
        if (editModeTimeoutId) clearTimeout(editModeTimeoutId);
        editModeTimeoutId = setTimeout(() => {
            if (signageActive) return;
            if (document.body.classList.contains('advanced-open')) return;
            setEditMode(false);
        }, EDIT_MODE_TIMEOUT_MS);
    }

    function toggleAdvancedPanel(active) {
        const bodyEl = document.body;
        if (!bodyEl) return;
        bodyEl.classList.toggle('advanced-open', active);
        if (advancedPanel) advancedPanel.setAttribute('aria-hidden', active ? 'false' : 'true');
        if (advancedBtn) advancedBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    function enterSignageMode(reason = 'manual') {
        signageReasons.add(reason);
        setEditMode(false);
        toggleAdvancedPanel(false);
        // Reset pan offset so canvas starts centered
        panX = 0;
        panY = 0;
        updateSignageModeState();
        // Transform will be applied by fullscreenchange handler after layout settles
        // Only apply immediately if we're already in fullscreen (re-enter case)
        if (document.fullscreenElement) {
            requestAnimationFrame(() => applySignageCenterTransform());
        }
    }

    function exitSignageMode(reason) {
        if (reason) {
            signageReasons.delete(reason);
        } else {
            signageReasons.clear();
        }
        updateSignageModeState();
        clearSignageCenterTransform();
    }

    updateSignageModeState();
    setEditMode(false);
    toggleAdvancedPanel(false);

    function applyAppPaletteToCSS() {
        const root = document.documentElement;
        if (!root) return;
        root.style.setProperty('--mb-amber', BASE_PALETTE.brightAmber);
    }

    function updateFrameLabel() {
        if (frameLabel) {
            frameLabel.textContent = `Frame ${currentFrameIndex + 1}`;
        }
        if (frameDurationInput) {
            const currentFrame = frames[currentFrameIndex];
            const duration = getFrameDuration(currentFrame);
            if (currentFrame) {
                currentFrame.duration = duration;
            }
            frameDurationInput.value = duration;
        }
        updateFrameBarState();
    }

    // --- Center point (auto-calculated, no manual marker) ---

    function updateCenterMarkerPosition() {
        // No-op: center point is now auto-calculated, no visual marker
    }

    // Legacy — kept in case other code references it, but no longer called on enter signage
    function calculateCenterOfWeight() {
        // No-op — replaced by direct pan/drag in fullscreen
    }

    // Center point is auto-calculated on enter signage — no drag UI needed

    // Apply scale-to-fit + pan transform for fullscreen/signage mode
    function applySignageCenterTransform() {
        if (!canvas || !canvasContainer) return;
        const containerW = canvasContainer.clientWidth || window.innerWidth;
        const containerH = canvasContainer.clientHeight || window.innerHeight;
        const cw = canvasDesignWidth || 1920;
        const ch = canvasDesignHeight || 1080;

        // Scale to fit
        const scale = Math.min(containerW / cw, containerH / ch, 2.0);

        // Center the canvas, then apply user pan offset
        const scaledW = cw * scale;
        const scaledH = ch * scale;
        const offsetX = (containerW - scaledW) / 2 + panX;
        const offsetY = (containerH - scaledH) / 2 + panY;

        canvas.style.transformOrigin = 'top left';
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        canvas.style.borderRadius = '0';
        canvas.style.boxShadow = 'none';

        // "Infinite background" — extend the canvas background onto the container
        const canvasBg = canvas.style.background || canvas.style.backgroundColor || '';
        if (canvasBg) {
            canvasContainer.style.background = canvasBg;
        } else {
            const computed = getComputedStyle(canvas);
            canvasContainer.style.background = computed.background || computed.backgroundColor || '#000';
        }
    }

    function clearSignageCenterTransform() {
        if (!canvas) return;
        // Reset pan state
        panX = 0;
        panY = 0;
        // Reset canvas transform directly — don't rely on fitCanvasToContainer
        // which may bail if fullscreen state hasn't fully cleared yet
        canvas.style.transformOrigin = 'center center';
        canvas.style.transform = '';
        canvas.style.borderRadius = '';
        canvas.style.boxShadow = '';
        // Also reset the infinite-background extension on the container
        if (canvasContainer) {
            canvasContainer.style.background = '';
        }
        // Re-fit after a tick so the DOM has settled
        requestAnimationFrame(() => fitCanvasToContainer());
    }

    /** Get the current CSS transform scale applied to the canvas (screen / canvas ratio) */
    function getCanvasScale() {
        if (!canvas) return 1;
        const rect = canvas.getBoundingClientRect();
        return rect.width / (canvas.offsetWidth || canvasDesignWidth || 1920);
    }

    /** Convert a screen-space point to canvas-coordinate-space point */
    function screenToCanvas(screenX, screenY) {
        const rect = canvas.getBoundingClientRect();
        const scale = getCanvasScale();
        return {
            x: (screenX - rect.left) / scale,
            y: (screenY - rect.top) / scale,
        };
    }

    function setCanvasDesignSize(w, h) {
        canvasDesignWidth = w || 1920;
        canvasDesignHeight = h || 1080;
        if (canvas) {
            canvas.style.width = canvasDesignWidth + 'px';
            canvas.style.height = canvasDesignHeight + 'px';
        }
        fitCanvasToContainer();
    }

    function fitCanvasToContainer() {
        if (!canvas || !canvasContainer) return;
        // In fullscreen or signage mode, the center transform handles scaling
        if (document.fullscreenElement || signageActive) return;
        const containerW = canvasContainer.clientWidth;
        const containerH = canvasContainer.clientHeight;
        if (!containerW || !containerH) return;
        const padding = 32; // visual breathing room
        const availW = containerW - padding;
        const availH = containerH - padding;
        const scale = Math.min(availW / canvasDesignWidth, availH / canvasDesignHeight, 1);
        canvas.style.transformOrigin = 'center center';
        canvas.style.transform = `scale(${scale})`;
    }

    function applyZoom(level) {
        zoomLevel = Math.min(3, Math.max(0.25, level));
        const inner = canvas;
        inner.style.transformOrigin = 'top left';
        inner.style.transform = `scale(${zoomLevel})`;
        if (zoomLabel) zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
    }

    updateCenterMarkerPosition();

    // --- Initialize canvas artboard and auto-fit ---
    setCanvasDesignSize(canvasDesignWidth, canvasDesignHeight);
    window.addEventListener('resize', () => {
        if (!document.fullscreenElement && !signageActive) {
            fitCanvasToContainer();
        }
    });

    // --- Onboarding tour logic ---
    const ONBOARDING_KEY = 'mockingBoard_seenOnboarding_v1';
    const SPLASH_KEY = 'mockingBoard_seenSplash_v1';
    const onboardingSteps = [
        {
            title: 'Create Signage for You',
            body: 'No sign-in required. Use Create Signage for You to get a unique layout in seconds, then customize only if you want.',
        },
        {
            title: 'Presentation First',
            body: 'Show Signage and Fullscreen are the primary actions. Use them when you are ready to present.',
        },
        {
            title: 'Customize Only When Needed',
            body: 'Tap Customize Signage to reveal editing tools. Right-click elements for color, gradients, and motion.',
        },
        {
            title: 'Multi-Frame When You Need It',
            body: 'Add frames for slideshows. Playback appears only when multiple frames exist.',
        }
    ];
    let onboardingIndex = 0;

    function renderOnboardingStep() {
        if (!onboardingOverlay || !onboardingBody || !onboardingStepIndicator) return;
        const step = onboardingSteps[onboardingIndex];
        onboardingOverlay.style.display = 'block';
        onboardingBody.textContent = step.body;
        const titleEl = document.getElementById('onboarding-title');
        if (titleEl) titleEl.textContent = step.title;
        onboardingStepIndicator.textContent = `Step ${onboardingIndex + 1} of ${onboardingSteps.length}`;
        onboardingNextBtn.textContent = onboardingIndex === onboardingSteps.length - 1 ? 'Done' : 'Next';
    }

    function startOnboardingIfNeeded() {
        try {
            if (window.localStorage && localStorage.getItem(ONBOARDING_KEY)) return;
        } catch (e) {
            // Ignore storage errors, just show once per session
        }
        onboardingIndex = 0;
        renderOnboardingStep();
    }

    function closeSplash(setSeen = true) {
        if (splashScreen) splashScreen.style.display = 'none';
        if (setSeen) {
            try {
                if (window.localStorage) localStorage.setItem(SPLASH_KEY, '1');
            } catch (e) {
                // Ignore
            }
        }
        startOnboardingIfNeeded();
    }

    function showSplashIfNeeded() {
        if (!splashScreen) {
            startOnboardingIfNeeded();
            return;
        }
        try {
            if (window.localStorage && localStorage.getItem(SPLASH_KEY)) {
                startOnboardingIfNeeded();
                return;
            }
        } catch (e) {
            // Ignore storage errors, just show once per session
        }
        splashScreen.style.display = 'block';
    }

    function finishOnboarding() {
        if (onboardingOverlay) onboardingOverlay.style.display = 'none';
        try {
            if (window.localStorage) localStorage.setItem(ONBOARDING_KEY, '1');
        } catch (e) {
            // Ignore
        }
    }

    if (onboardingSkipBtn) {
        onboardingSkipBtn.addEventListener('click', () => {
            finishOnboarding();
        });
    }
    if (onboardingNextBtn) {
        onboardingNextBtn.addEventListener('click', () => {
            onboardingIndex = Math.min(onboardingIndex + 1, onboardingSteps.length - 1);
            if (onboardingIndex === onboardingSteps.length - 1 && onboardingNextBtn.textContent === 'Done') {
                finishOnboarding();
            } else if (onboardingIndex === onboardingSteps.length - 1) {
                onboardingNextBtn.textContent = 'Done';
                renderOnboardingStep();
            } else {
                renderOnboardingStep();
            }
        });
    }

    if (splashStartBtn) {
        splashStartBtn.addEventListener('click', () => closeSplash(true));
    }
    if (splashSkipBtn) {
        splashSkipBtn.addEventListener('click', () => closeSplash(true));
    }
    if (splashScreen) {
        splashScreen.addEventListener('click', (e) => {
            const card = e.target.closest('.splash-card');
            if (!card) closeSplash(true);
        });
    }

    // --- Built-in templates ---
    const builtinTemplates = {
        filmStoryboard: {
            name: 'Film Storyboard',
            frames: 4,
            build(frameIndex) {
                const elements = [];
                const frameWidth = 800;
                const frameHeight = 450;
                const padding = 40;
                const shotWidth = (frameWidth - padding * 2);
                const shotHeight = 240;
                const yOffset = 40;
                const baseTop = yOffset;
                const baseLeft = padding;
                // Shot frame
                elements.push({
                    type: 'rectangle',
                    left: baseLeft + 'px',
                    top: baseTop + 'px',
                    width: shotWidth + 'px',
                    height: shotHeight + 'px',
                    backgroundColor: '#111',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontFamily: 'Roboto, sans-serif',
                    zIndex: 1,
                    border: '1px solid #555',
                    borderColor: '#555',
                    rotation: 0,
                    innerHTML: '<div class="editable" contenteditable="true">Shot image or frame here</div>',
                    dataset: { type: 'rectangle' }
                });
                // Header
                elements.push({
                    type: 'header',
                    left: padding + 'px',
                    top: baseTop + shotHeight + 20 + 'px',
                    width: (shotWidth / 2 - 10) + 'px',
                    height: '40px',
                    backgroundColor: 'transparent',
                    color: '#111',
                    fontSize: '20px',
                    fontFamily: 'Old Standard TT, serif',
                    zIndex: 2,
                    border: 'none',
                    borderColor: 'transparent',
                    rotation: 0,
                    innerHTML: '<div class="editable" contenteditable="true">Scene ' + (frameIndex + 1) + '</div>',
                    dataset: { type: 'header' }
                });
                // Description
                elements.push({
                    type: 'paragraph',
                    left: padding + 'px',
                    top: baseTop + shotHeight + 70 + 'px',
                    width: (shotWidth / 2 - 10) + 'px',
                    height: '80px',
                    backgroundColor: 'transparent',
                    color: '#333',
                    fontSize: '14px',
                    fontFamily: 'Roboto, sans-serif',
                    zIndex: 2,
                    border: 'none',
                    borderColor: 'transparent',
                    rotation: 0,
                    innerHTML: '<div class="editable" contenteditable="true">Describe action, dialogue, and camera notes.</div>',
                    dataset: { type: 'paragraph' }
                });
                // Timing / notes
                elements.push({
                    type: 'paragraph',
                    left: padding + shotWidth / 2 + 10 + 'px',
                    top: baseTop + shotHeight + 20 + 'px',
                    width: (shotWidth / 2 - 10) + 'px',
                    height: '130px',
                    backgroundColor: 'transparent',
                    color: '#333',
                    fontSize: '13px',
                    fontFamily: 'Roboto, sans-serif',
                    zIndex: 2,
                    border: 'none',
                    borderColor: 'transparent',
                    rotation: 0,
                    innerHTML: '<div class="editable" contenteditable="true">Timing, audio cues, transitions…</div>',
                    dataset: { type: 'paragraph' }
                });
                return {
                    elements,
                    canvas: {
                        background: '#f5f5f5',
                        width: frameWidth + 'px',
                        height: frameHeight + 'px'
                    }
                };
            }
        },
        eventWelcome: {
            name: 'Event Welcome Signboard',
            frames: 1,
            build() {
                const elements = [];
                const width = 900;
                const height = 500;
                elements.push({
                    type: 'header',
                    left: '80px',
                    top: '80px',
                    width: '740px',
                    height: '80px',
                    backgroundColor: 'transparent',
                    color: '#111',
                    fontSize: '40px',
                    fontFamily: 'Old Standard TT, serif',
                    zIndex: 2,
                    border: 'none',
                    borderColor: 'transparent',
                    rotation: 0,
                    innerHTML: '<div class="editable" contenteditable="true">Welcome to [Event Name]</div>',
                    dataset: { type: 'header' }
                });
                elements.push({
                    type: 'paragraph',
                    left: '80px',
                    top: '180px',
                    width: '500px',
                    height: '120px',
                    backgroundColor: 'transparent',
                    color: '#333',
                    fontSize: '18px',
                    fontFamily: 'Roboto, sans-serif',
                    zIndex: 2,
                    border: 'none',
                    borderColor: 'transparent',
                    rotation: 0,
                    innerHTML: '<div class="editable" contenteditable="true">Add date, time, and a short friendly message.</div>',
                    dataset: { type: 'paragraph' }
                });
                elements.push({
                    type: 'rectangle',
                    left: '80px',
                    top: '320px',
                    width: '300px',
                    height: '80px',
                    backgroundColor: '#2c3e50',
                    color: '#ffffff',
                    fontSize: '20px',
                    fontFamily: 'Roboto, sans-serif',
                    zIndex: 1,
                    border: 'none',
                    borderColor: 'transparent',
                    rotation: 0,
                    innerHTML: '<div class="editable" contenteditable="true" style="text-align:center;line-height:80px;">Start Here</div>',
                    dataset: { type: 'rectangle' }
                });
                return {
                    elements,
                    canvas: {
                        background: '#f9dea2',
                        width: width + 'px',
                        height: height + 'px'
                    }
                };
            }
        },
        groupPrototyping: {
            name: 'Group Prototyping',
            frames: 1,
            build() {
                const elements = [];
                const width = 1000;
                const height = 600;
                const cols = 3;
                const cardWidth = 260;
                const cardHeight = 220;
                const padding = 40;
                for (let i = 0; i < cols; i++) {
                    const left = padding + i * (cardWidth + 30);
                    elements.push({
                        type: 'rectangle',
                        left: left + 'px',
                        top: '120px',
                        width: cardWidth + 'px',
                        height: cardHeight + 'px',
                        backgroundColor: '#ffffff',
                        color: '#111',
                        fontSize: '14px',
                        fontFamily: 'Roboto, sans-serif',
                        zIndex: 1,
                        border: '1px solid #ddd',
                        borderColor: '#ddd',
                        rotation: 0,
                        innerHTML: '<div class="editable" contenteditable="true">Team ' + (i + 1) + ' concept</div>',
                        dataset: { type: 'rectangle' }
                    });
                }
                elements.push({
                    type: 'header',
                    left: '60px',
                    top: '40px',
                    width: '600px',
                    height: '60px',
                    backgroundColor: 'transparent',
                    color: '#111',
                    fontSize: '32px',
                    fontFamily: 'Old Standard TT, serif',
                    zIndex: 2,
                    border: 'none',
                    borderColor: 'transparent',
                    rotation: 0,
                    innerHTML: '<div class="editable" contenteditable="true">Group Prototyping Board</div>',
                    dataset: { type: 'header' }
                });
                return {
                    elements,
                    canvas: {
                        background: '#e2f0cb',
                        width: width + 'px',
                        height: height + 'px'
                    }
                };
            }
        },
        designThinking: {
            name: 'Design Thinking',
            frames: 1,
            build() {
                const elements = [];
                const width = 1100;
                const height = 600;
                const stages = ['Empathize', 'Define', 'Ideate', 'Prototype', 'Test'];
                const colors = ['#ffd6e0', '#e2f0cb', '#b5ead7', '#c7ceea', '#ffdac1'];
                const cardWidth = 190;
                const cardHeight = 260;
                const padding = 40;
                stages.forEach((stage, i) => {
                    const left = padding + i * (cardWidth + 15);
                    elements.push({
                        type: 'rectangle',
                        left: left + 'px',
                        top: '120px',
                        width: cardWidth + 'px',
                        height: cardHeight + 'px',
                        backgroundColor: colors[i % colors.length],
                        color: '#111',
                        fontSize: '16px',
                        fontFamily: 'Roboto, sans-serif',
                        zIndex: 1,
                        border: '1px solid #ccc',
                        borderColor: '#ccc',
                        rotation: 0,
                        innerHTML: '<div class="editable" contenteditable="true"><strong>' + stage + '</strong><br/><br/>Notes, insights, and ideas…</div>',
                        dataset: { type: 'rectangle' }
                    });
                });
                elements.push({
                    type: 'header',
                    left: '60px',
                    top: '40px',
                    width: '700px',
                    height: '60px',
                    backgroundColor: 'transparent',
                    color: '#111',
                    fontSize: '32px',
                    fontFamily: 'Old Standard TT, serif',
                    zIndex: 2,
                    border: 'none',
                    borderColor: 'transparent',
                    rotation: 0,
                    innerHTML: '<div class="editable" contenteditable="true">Design Thinking Journey</div>',
                    dataset: { type: 'header' }
                });
                return {
                    elements,
                    canvas: {
                        background: '#ffffff',
                        width: width + 'px',
                        height: height + 'px'
                    }
                };
            }
        },
        classroomCollab: {
            name: 'Classroom Collaboration',
            frames: 1,
            build() {
                const elements = [];
                const width = 1000;
                const height = 600;
                const cols = 2;
                const rows = 2;
                const cardWidth = 400;
                const cardHeight = 200;
                const paddingX = 80;
                const paddingY = 120;
                let team = 1;
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const left = paddingX + c * (cardWidth + 40);
                        const top = paddingY + r * (cardHeight + 40);
                        elements.push({
                            type: 'rectangle',
                            left: left + 'px',
                            top: top + 'px',
                            width: cardWidth + 'px',
                            height: cardHeight + 'px',
                            backgroundColor: '#ffffff',
                            color: '#111',
                            fontSize: '14px',
                            fontFamily: 'Roboto, sans-serif',
                            zIndex: 1,
                            border: '1px dashed #bbb',
                            borderColor: '#bbb',
                            rotation: 0,
                            innerHTML: '<div class="editable" contenteditable="true">Group ' + (team++) + ' space</div>',
                            dataset: { type: 'rectangle' }
                        });
                    }
                }
                elements.push({
                    type: 'header',
                    left: '60px',
                    top: '40px',
                    width: '700px',
                    height: '60px',
                    backgroundColor: 'transparent',
                    color: '#111',
                    fontSize: '32px',
                    fontFamily: 'Old Standard TT, serif',
                    zIndex: 2,
                    border: 'none',
                    borderColor: 'transparent',
                    rotation: 0,
                    innerHTML: '<div class="editable" contenteditable="true">Classroom Collaboration Board</div>',
                    dataset: { type: 'header' }
                });
                return {
                    elements,
                    canvas: {
                        background: '#c7ceea',
                        width: width + 'px',
                        height: height + 'px'
                    }
                };
            }
        }
    };

    // --- Element library presets ---
    const elementLibraryPresets = [
        {
            key: 'heroSplit',
            name: 'Hero Split',
            desc: 'Big headline left, details right.',
            elements: [
                { type: 'rectangle', x: 4, y: 8, w: 56, h: 70, shapeColor: '#ffffff', opacity: 0.85, borderRadius: '22px', boxShadow: '0 20px 50px rgba(15,23,42,0.16)', zIndex: 1 },
                { type: 'header', x: 8, y: 12, w: 40, h: 18, text: 'Grand Opening', color: '#0f172a', fontSize: '96px', fontFamily: 'Old Standard TT, serif', zIndex: 2 },
                { type: 'paragraph', x: 60, y: 26, w: 32, h: 14, text: 'Sat • 7 PM • Main Hall', color: '#1f2937', fontSize: '26px', fontFamily: 'Roboto, sans-serif', zIndex: 2 },
                { type: 'rectangle', x: 60, y: 20, w: 18, h: 2.5, shapeColor: '#f5c919', borderRadius: '999px', zIndex: 2 }
            ]
        },
        {
            key: 'glassCard',
            name: 'Glass Card',
            desc: 'Frosted panel with a clean stack.',
            elements: [
                { type: 'rectangle', x: 8, y: 12, w: 64, h: 62, shapeColor: '#ffffff', opacity: 0.2, borderRadius: '26px', backdropFilter: 'blur(18px)', webkitBackdropFilter: 'blur(18px)', boxShadow: '0 18px 45px rgba(15,23,42,0.22)', zIndex: 1 },
                { type: 'header', x: 14, y: 18, w: 52, h: 18, text: 'Winter Gala', color: '#f8fafc', fontSize: '86px', fontFamily: 'Playfair Display, serif', zIndex: 2 },
                { type: 'paragraph', x: 14, y: 36, w: 50, h: 12, text: 'Tickets • Live Jazz • 8 PM', color: '#e2e8f0', fontSize: '24px', fontFamily: 'Lora, serif', zIndex: 2 }
            ]
        },
        {
            key: 'lRail',
            name: 'Left Rail',
            desc: 'Bold rail with asym text.',
            elements: [
                { type: 'rectangle', x: 6, y: 6, w: 2.5, h: 78, shapeColor: '#0f172a', borderRadius: '8px', zIndex: 1 },
                { type: 'rectangle', x: 6, y: 74, w: 40, h: 2.5, shapeColor: '#f5c919', borderRadius: '8px', zIndex: 1 },
                { type: 'header', x: 12, y: 16, w: 52, h: 18, text: 'Design Week', color: '#0f172a', fontSize: '92px', fontFamily: 'Montserrat, sans-serif', zIndex: 2 },
                { type: 'paragraph', x: 12, y: 36, w: 40, h: 12, text: 'Workshops • Talks • Expo', color: '#334155', fontSize: '24px', fontFamily: 'Roboto, sans-serif', zIndex: 2 }
            ]
        },
        {
            key: 'stickerBurst',
            name: 'Sticker Burst',
            desc: 'Playful shapes with a punch.',
            elements: [
                { type: 'circle', x: 66, y: 6, w: 18, h: 18, shapeColor: '#f43f5e', opacity: 0.85, zIndex: 1 },
                { type: 'triangle', x: 62, y: 26, w: 12, h: 14, shapeColor: '#f59e0b', zIndex: 1, transform: 'rotate(-18deg)' },
                { type: 'rectangle', x: 8, y: 22, w: 44, h: 22, shapeColor: '#0ea5e9', borderRadius: '16px', zIndex: 1 },
                { type: 'header', x: 12, y: 24, w: 38, h: 14, text: 'Kids Fest', color: '#ffffff', fontSize: '82px', fontFamily: 'Permanent Marker, sans-serif', zIndex: 2 },
                { type: 'paragraph', x: 12, y: 38, w: 34, h: 10, text: 'Games • Music • Art', color: '#fef3c7', fontSize: '22px', fontFamily: 'Poppins, sans-serif', zIndex: 2 }
            ]
        },
        {
            key: 'ticketStack',
            name: 'Ticket Stack',
            desc: 'Retro card with badge.',
            elements: [
                { type: 'rectangle', x: 10, y: 14, w: 54, h: 56, shapeColor: '#fff7ed', borderRadius: '18px', border: '2px dashed #d97706', boxShadow: '0 16px 38px rgba(15,23,42,0.18)', zIndex: 1 },
                { type: 'header', x: 16, y: 20, w: 44, h: 16, text: 'Movie Night', color: '#7c2d12', fontSize: '76px', fontFamily: 'Old Standard TT, serif', zIndex: 2 },
                { type: 'paragraph', x: 16, y: 36, w: 40, h: 10, text: 'Fri • 8 PM • Rooftop', color: '#9a3412', fontSize: '22px', fontFamily: 'Roboto, sans-serif', zIndex: 2 },
                { type: 'circle', x: 60, y: 18, w: 12, h: 12, shapeColor: '#f59e0b', zIndex: 2 }
            ]
        },
        {
            key: 'cornerStack',
            name: 'Corner Stack',
            desc: 'Top-left hero, bottom-right details.',
            elements: [
                { type: 'header', x: 8, y: 10, w: 50, h: 18, text: 'Community Expo', color: '#0f172a', fontSize: '88px', fontFamily: 'Raleway, sans-serif', zIndex: 2 },
                { type: 'paragraph', x: 62, y: 66, w: 30, h: 12, text: 'Meet local makers and startups', color: '#334155', fontSize: '22px', fontFamily: 'Roboto, sans-serif', zIndex: 2 },
                { type: 'rectangle', x: 62, y: 60, w: 18, h: 2.5, shapeColor: '#0f172a', borderRadius: '999px', zIndex: 2 }
            ]
        }
    ];

    function snapshotCurrentCanvas() {
        const elements = Array.from(canvas.querySelectorAll('.element')).map(el => ({
            type: el.getAttribute('data-type') || null,
            left: el.style.left,
            top: el.style.top,
            width: el.style.width,
            height: el.style.height,
            backgroundColor: el.style.backgroundColor,
            background: el.style.background,
            color: el.style.color,
            fontSize: el.style.fontSize,
            fontFamily: el.style.fontFamily,
            zIndex: el.style.zIndex,
            border: el.style.border,
            borderColor: el.style.borderColor,
            borderRadius: el.style.borderRadius,
            opacity: el.style.opacity,
            boxShadow: el.style.boxShadow,
            backdropFilter: el.style.backdropFilter,
            webkitBackdropFilter: el.style.webkitBackdropFilter || '',
            filter: el.style.filter,
            overflow: el.style.overflow,
            display: el.style.display,
            alignItems: el.style.alignItems,
            justifyContent: el.style.justifyContent,
            transform: el.style.transform,
            transformOrigin: el.style.transformOrigin,
            transition: el.style.transition,
            mixBlendMode: el.style.mixBlendMode,
            rotation: el.dataset.rotation || 0,
            innerHTML: el.innerHTML,
            dataset: { ...el.dataset },
        }));
        return {
            elements,
            canvas: {
                background: canvas.style.background,
                width: canvas.style.width,
                height: canvas.style.height,
            },
            duration: getFrameDuration(frames[currentFrameIndex]),
        };
    }

    function loadFrame(index) {
        const frame = frames[index];
        canvas.innerHTML = '<div id="grid" class="grid"></div>';
        if (frame) {
            ensureFrameDuration(frame);
            // (center point no longer saved — pan resets each present)
        }
        if (!frame || !frame.elements) {
            reattachEventListeners();
            updateFrameLabel();
            return;
        }
        frame.elements.forEach(elData => {
            const element = document.createElement('div');
            element.className = 'element svg-container';
            element.style.left = elData.left;
            element.style.top = elData.top;
            element.style.width = elData.width;
            element.style.height = elData.height;
            element.style.backgroundColor = elData.backgroundColor;
            if (elData.background) element.style.background = elData.background;
            element.style.color = elData.color;
            element.style.fontSize = elData.fontSize;
            element.style.fontFamily = elData.fontFamily;
            element.style.zIndex = elData.zIndex;
            element.style.border = elData.border;
            element.style.borderColor = elData.borderColor;
            if (elData.borderRadius) element.style.borderRadius = elData.borderRadius;
            if (elData.opacity) element.style.opacity = elData.opacity;
            if (elData.boxShadow) element.style.boxShadow = elData.boxShadow;
            if (elData.backdropFilter) element.style.backdropFilter = elData.backdropFilter;
            if (elData.webkitBackdropFilter) element.style.webkitBackdropFilter = elData.webkitBackdropFilter;
            if (elData.filter) element.style.filter = elData.filter;
            if (elData.overflow) element.style.overflow = elData.overflow;
            if (elData.display) element.style.display = elData.display;
            if (elData.alignItems) element.style.alignItems = elData.alignItems;
            if (elData.justifyContent) element.style.justifyContent = elData.justifyContent;
            if (elData.transform) element.style.transform = elData.transform;
            if (elData.transformOrigin) element.style.transformOrigin = elData.transformOrigin;
            if (elData.transition) element.style.transition = elData.transition;
            if (elData.mixBlendMode) element.style.mixBlendMode = elData.mixBlendMode;
            element.innerHTML = elData.innerHTML;
            if (elData.dataset) {
                Object.keys(elData.dataset).forEach(key => {
                    element.dataset[key] = elData.dataset[key];
                });
            }
            ensureElementUID(element);
            if (elData.rotation) {
                element.style.transform = `rotate(${elData.rotation}deg)`;
            }
            if (!element.querySelector('.resize-handle')) {
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle';
                element.appendChild(resizeHandle);
            }
            canvas.appendChild(element);
            attachElementInteractions(element);
        });
        canvas.style.background = frame.canvas && frame.canvas.background ? frame.canvas.background : canvas.style.background;
        // Restore canvas artboard dimensions from frame
        if (frame.canvas && frame.canvas.width && frame.canvas.height) {
            setCanvasDesignSize(parseInt(frame.canvas.width, 10), parseInt(frame.canvas.height, 10));
        }
        reattachEventListeners();
        if (typeof restoreElementAnimations === 'function') restoreElementAnimations();
        updateFrameLabel();
    }

    function attachElementInteractions(element) {
        if (!element) return;
        const resizeHandle = element.querySelector('.resize-handle');
        const rotateHandle = element.querySelector('.rotate-handle');
        element.addEventListener('pointerdown', startDragging);
        element.addEventListener('contextmenu', showContextMenu);
        if (resizeHandle) {
            resizeHandle.addEventListener('pointerdown', startResizing);
        }
        if (rotateHandle) {
            rotateHandle.addEventListener('pointerdown', startRotating);
        }
        const iframeElement = element.querySelector('iframe');
        if (iframeElement) {
            iframeElement.addEventListener('pointerdown', (e) => e.stopPropagation());
        }
        const mediaElements = element.querySelectorAll('video, audio');
        mediaElements.forEach(media => {
            media.addEventListener('pointerdown', (e) => e.stopPropagation());
        });

        const editables = element.querySelectorAll('.editable');
        editables.forEach(editable => {
            editable.addEventListener('focus', (e) => showInlineToolbar(e.target));
            editable.addEventListener('blur', () => {
                activeEditable = null;
                hideInlineToolbar();
            });
        });
    }

    function reattachEventListeners() {
        const elements = canvas.querySelectorAll('.element');
        elements.forEach(el => attachElementInteractions(el));
    }

    function finalizeInitialLayout() {
        if (!frames.length) {
            frames[0] = snapshotCurrentCanvas();
        }
        updateFrameLabel();
        updateFrameBarState();
        applyAppPaletteToCSS();
        showSplashIfNeeded();
    }

    let demoModeActive = false;
    function loadDemoProject() {
        if (!window.fetch) return null;
        return fetch('Mocking-Board-Demo.json')
            .then((resp) => {
                if (!resp.ok) throw new Error('Demo load failed');
                return resp.json();
            })
            .then((imported) => {
                if (applyImportedData(imported, { alertOnSuccess: false, isDemo: true })) {
                    demoModeActive = true;
                }
            })
            .catch(() => {
                // Ignore demo load failures and fall back to empty canvas.
            });
    }

    const demoLoadPromise = loadDemoProject();
    if (demoLoadPromise && typeof demoLoadPromise.finally === 'function') {
        demoLoadPromise.finally(() => {
            finalizeInitialLayout();
        });
    } else {
        finalizeInitialLayout();
    }

    // --- Zoom controls ---
    if (zoomOutBtn && zoomInBtn && zoomFitBtn) {
        applyZoom(1);
        zoomOutBtn.addEventListener('click', () => {
            applyZoom(zoomLevel - 0.1);
        });
        zoomInBtn.addEventListener('click', () => {
            applyZoom(zoomLevel + 0.1);
        });
        zoomFitBtn.addEventListener('click', () => {
            const containerRect = canvasContainer.getBoundingClientRect();
            const contentRect = canvas.getBoundingClientRect();
            const scaleX = containerRect.width / contentRect.width;
            const scaleY = containerRect.height / contentRect.height;
            const target = Math.min(scaleX, scaleY, 1.5);
            applyZoom(target);
        });
    }

    if (presentBtn && canvasContainer) {
        presentBtn.addEventListener('click', async () => {
            if (signageActive || document.fullscreenElement) {
                // Exit: leave fullscreen and signage
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
                exitSignageMode('manual');
                if (isPlayMode) exitPlayMode();
            } else {
                // Enter: signage + fullscreen together
                enterSignageMode('manual');
                try {
                    await canvasContainer.requestFullscreen();
                } catch (_) { /* ignore if denied */ }
            }
        });
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && signageActive) {
                // User pressed Escape or exited fullscreen externally
                exitSignageMode('manual');
                if (isPlayMode) exitPlayMode();
                return; // exitSignageMode already calls clearSignageCenterTransform
            }
            if (document.fullscreenElement && signageActive) {
                // Entered fullscreen — apply transform after layout settles
                setTimeout(() => applySignageCenterTransform(), 150);
            } else if (!document.fullscreenElement) {
                // Fully exited — ensure canvas is restored
                clearSignageCenterTransform();
            }
        });
    }

    if (editModeBtn) {
        editModeBtn.addEventListener('click', () => {
            const isActive = document.body.classList.contains('edit-mode');
            setEditMode(!isActive);
            if (!isActive) scheduleEditModeTimeout();
        });
    }

    if (advancedBtn) {
        advancedBtn.addEventListener('click', () => {
            const isOpen = document.body.classList.contains('advanced-open');
            toggleAdvancedPanel(!isOpen);
        });
    }

    // ── Drag-to-pan canvas in fullscreen/signage mode ──
    if (canvasContainer) {
        canvasContainer.addEventListener('pointerdown', (e) => {
            if (!signageActive) return;
            // Don't interfere with the exit button
            if (e.target.closest('.signage-exit-btn')) return;
            _panDragging = true;
            _panStartX = e.clientX;
            _panStartY = e.clientY;
            _panStartOffsetX = panX;
            _panStartOffsetY = panY;
            canvasContainer.setPointerCapture(e.pointerId);
            canvasContainer.style.cursor = 'grabbing';
            e.preventDefault();
        });
        canvasContainer.addEventListener('pointermove', (e) => {
            if (!_panDragging) return;
            panX = _panStartOffsetX + (e.clientX - _panStartX);
            panY = _panStartOffsetY + (e.clientY - _panStartY);
            applySignageCenterTransform();
        });
        const endPan = (e) => {
            if (!_panDragging) return;
            _panDragging = false;
            canvasContainer.style.cursor = '';
        };
        canvasContainer.addEventListener('pointerup', endPan);
        canvasContainer.addEventListener('pointercancel', endPan);
    }

    // Auto-enter edit mode on canvas interaction, then fade back out
    if (canvasContainer) {
        canvasContainer.addEventListener('pointerdown', () => {
            if (signageActive) return;
            setEditMode(true);
            scheduleEditModeTimeout();
        });
        canvasContainer.addEventListener('keydown', () => {
            if (signageActive) return;
            setEditMode(true);
            scheduleEditModeTimeout();
        });
    }

    if (signageExitBtn) {
        signageExitBtn.addEventListener('click', () => {
            exitSignageMode();
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
            }
            if (isPlayMode) exitPlayMode();
        });
    }

    if (framePrevBtn) {
        framePrevBtn.addEventListener('click', () => {
            frames[currentFrameIndex] = snapshotCurrentCanvas();
            const nextIndex = Math.max(0, currentFrameIndex - 1);
            currentFrameIndex = nextIndex;
            loadFrame(currentFrameIndex);
            updateFrameBarState();
        });
    }
    if (frameNextBtn) {
        frameNextBtn.addEventListener('click', () => {
            frames[currentFrameIndex] = snapshotCurrentCanvas();
            const nextIndex = Math.min(frames.length - 1, currentFrameIndex + 1);
            currentFrameIndex = nextIndex;
            loadFrame(currentFrameIndex);
            updateFrameBarState();
        });
    }
    if (frameAddBtn) {
        frameAddBtn.addEventListener('click', () => {
            frames[currentFrameIndex] = snapshotCurrentCanvas();
            const emptyFrame = {
                elements: [],
                canvas: { background: canvas.style.background, width: canvas.style.width, height: canvas.style.height },
                duration: DEFAULT_FRAME_DURATION
            };
            frames.push(emptyFrame);
            currentFrameIndex = frames.length - 1;
            loadFrame(currentFrameIndex);
            updateFrameBarState();
        });
    }

    if (frameDurationInput) {
        frameDurationInput.addEventListener('change', () => {
            const val = parseInt(frameDurationInput.value, 10);
            const clamped = isFinite(val) ? Math.max(1, Math.min(FRAME_DURATION_MAX, val)) : DEFAULT_FRAME_DURATION;
            frameDurationInput.value = clamped;
            if (!frames[currentFrameIndex]) {
                frames[currentFrameIndex] = snapshotCurrentCanvas();
            }
            frames[currentFrameIndex].duration = clamped;
        });
    }

    function enterPlayMode() {
        if (frames.length < 2) return;
        if (isPlayMode) return;
        // Commit current canvas into the current frame before starting playback
        frames[currentFrameIndex] = snapshotCurrentCanvas();
        ensureFrameDuration(frames[currentFrameIndex]);
        isPlayMode = true;
        enterSignageMode('play');
        canvasContainer.classList.add('play-mode');
        updateFrameBarState();
        if (playModeBtn) {
            playModeBtn.textContent = 'Pause';
            playModeBtn.classList.add('is-playing');
            playModeBtn.setAttribute('aria-pressed', 'true');
        }
        let index = currentFrameIndex;
        const scheduleNext = () => {
            if (!isPlayMode || !frames.length) return;
            const frame = frames[index] || {};
            const durationSeconds = getFrameDuration(frame);
            playModeIntervalId = setTimeout(() => {
                if (!isPlayMode) return;
                index = (index + 1) % frames.length;
                currentFrameIndex = index;
                loadFrame(currentFrameIndex);
                scheduleNext();
            }, durationSeconds * 1000);
        };
        scheduleNext();
    }

    function exitPlayMode() {
        if (!isPlayMode) return;
        isPlayMode = false;
        canvasContainer.classList.remove('play-mode');
        exitSignageMode('play');
        updateFrameBarState();
        if (playModeBtn) {
            playModeBtn.textContent = 'Play';
            playModeBtn.classList.remove('is-playing');
            playModeBtn.setAttribute('aria-pressed', 'false');
        }
        if (playModeIntervalId) {
            clearTimeout(playModeIntervalId);
            playModeIntervalId = null;
        }
    }

    // --- Toolbar buttons: Templates, Grid toggle, Play/Stop ---
    if (templatesBtn) {
        templatesBtn.addEventListener('click', () => {
            // Simple templates popup listing built-in templates
            const keys = Object.keys(builtinTemplates);
            if (!keys.length) return;
            const choice = window.prompt(
                'Templates:\n' + keys.map((k, i) => `${i + 1}. ${builtinTemplates[k].name}`).join('\n') + '\n\nType a number to apply:',
                '1'
            );
            const idx = parseInt(choice, 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= keys.length) return;
            const key = keys[idx];
            const tpl = builtinTemplates[key];
            if (!tpl) return;
            frames = [];
            for (let i = 0; i < (tpl.frames || 1); i++) {
                const builtFrame = tpl.build(i) || { elements: [], canvas: {} };
                ensureFrameDuration(builtFrame);
                frames.push(builtFrame);
            }
            currentFrameIndex = 0;
            loadFrame(currentFrameIndex);
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        });
    }

    if (libraryBtn) {
        libraryBtn.addEventListener('click', () => {
            openElementLibraryPopup();
        });
    }

    if (resizeBtn) {
        resizeBtn.addEventListener('click', () => {
            openResizePopup();
        });
    }

    if (variationBtn) {
        variationBtn.addEventListener('click', () => {
            openVariationPopup();
        });
    }

    if (backgroundBtn) {
        backgroundBtn.addEventListener('click', () => {
            gridEnabled = !gridEnabled;
            const gridEl = document.getElementById('grid');
            if (gridEl) {
                gridEl.style.display = gridEnabled ? 'block' : 'none';
            }
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        });
    }

    if (playModeBtn) {
        playModeBtn.setAttribute('aria-pressed', 'false');
        playModeBtn.addEventListener('click', () => {
            if (playModeBtn.disabled) return;
            if (isPlayMode) {
                exitPlayMode();
            } else {
                enterPlayMode();
            }
        });
    }

    // Sidebar event delegation for element creation
    sidebar.addEventListener('click', (e) => {
        const button = e.target.closest('.element-button');
        if (button && !isLocked) {
            const type = button.getAttribute('data-type');
            const element = createElementFromManager(type);
            canvas.appendChild(element);
            attachElementInteractions(element);
            setSelectedElement(element);
            // --- Always open color selection popups for colorTransition and colorGradient ---
            if (type === 'colorTransition') {
                openColorTransitionPopup();
            } else if (type === 'colorGradient') {
                openColorGradientPopup();
            }
            if (typeof saveState === 'function' && canvas) {
                saveState(canvas);
            }
        }
    });

    // Canvas event delegation for dragging, resizing, and context menu
    if (canvas) {
        canvas.addEventListener('pointerdown', (e) => {
            const element = e.target.closest('.element');
            if (!element || isLocked) return;
            if (e.target.classList.contains('resize-handle')) {
                startResizing(e, () => isLocked, setSelected);
            } else {
                startDragging(e, () => isLocked, setDragged, setOffset);
            }
        });

        canvas.addEventListener('contextmenu', (e) => {
            const element = e.target.closest('.element');
            if (!element || isLocked) return;
            e.preventDefault();
            setSelectedElement(element);
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.top = `${e.clientY}px`;
        });
    } else {
        console.error('main.js: Canvas element is undefined!');
    }

    // Context menu event delegation
    contextMenu.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.id;
        if (id === 'changeColor') {
            if (selectedElement) openColorPopup();
        } else if (id === 'rotateElement') {
            if (selectedElement) {
                const currentRotation = selectedElement.dataset.rotation || 0;
                const newRotation = (parseInt(currentRotation) + 5) % 360;
                selectedElement.style.transform = `rotate(${newRotation}deg)`;
                selectedElement.dataset.rotation = newRotation;
            }
        } else if (id === 'rotate90Element') {
            if (selectedElement) {
                const currentRotation = selectedElement.dataset.rotation || 0;
                const newRotation = (parseInt(currentRotation) + 90) % 360;
                selectedElement.style.transform = `rotate(${newRotation}deg)`;
                selectedElement.dataset.rotation = newRotation;
            }
        } else if (id === 'changeLinkedMedia') {
            if (selectedElement) openMediaPopup();
        } else if (id === 'fontSize') {
            if (selectedElement) {
                const newSize = prompt("Enter the new font size (e.g., 16px, 2em, 150%):");
                if (newSize) {
                    selectedElement.style.fontSize = newSize;
                    if (typeof saveState === 'function' && canvas) saveState(canvas);
                }
            }
        } else if (id === 'fontColor') {
            fontColorPicker.click();
        } else if (id === 'textAlign') {
            if (selectedElement) {
                alignmentIndex = (alignmentIndex + 1) % alignments.length;
                const editableElements = selectedElement.querySelectorAll('.editable');
                editableElements.forEach(el => {
                    el.style.textAlign = alignments[alignmentIndex];
                });
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            }
        } else if (id === 'changeFont') {
            if (selectedElement) {
                fontIndex = (fontIndex + 1) % fonts.length;
                const editableElements = selectedElement.querySelectorAll('.editable');
                editableElements.forEach(el => {
                    el.style.fontFamily = fonts[fontIndex];
                });
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            }
        } else if (id === 'makeTransparent') {
            if (selectedElement) {
                selectedElement.style.backgroundColor = 'rgba(43, 38, 34, 0)';
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            }
        } else if (id === 'createColorTransition') {
            if (selectedElement) openColorTransitionPopup();
        } else if (id === 'createColorGradient') {
            if (selectedElement) openColorGradientPopup();
        } else if (id === 'createAnimation') {
            if (selectedElement) openAnimationPopup();
        } else if (id === 'toggleLoop') {
            if (selectedElement) {
                const mediaElement = selectedElement.querySelector('video, audio');
                if (mediaElement) {
                    mediaElement.loop = !mediaElement.loop;
                    alert(`Looping ${mediaElement.loop ? 'enabled' : 'disabled'} for this element.`);
                }
            }
        } else if (id === 'toggleBorder') {
            if (selectedElement) {
                const currentBorder = selectedElement.style.border;
                selectedElement.style.border = currentBorder === '1px solid #bdc3c7' ? 'none' : '1px solid #bdc3c7';
            }
        } else if (id === 'moveForward') {
            if (selectedElement) {
                selectedElement.style.zIndex = (parseInt(selectedElement.style.zIndex) || 0) + 1;
            }
        } else if (id === 'moveBackward') {
            if (selectedElement) {
                selectedElement.style.zIndex = (parseInt(selectedElement.style.zIndex) || 0) - 1;
            }
        } else if (id === 'groupSelection') {
            groupSelection();
        } else if (id === 'ungroupSelection') {
            ungroupSelection();
        } else if (id === 'alignLeft') {
            alignSelection('left');
        } else if (id === 'alignCenter') {
            alignSelection('h-center');
        } else if (id === 'alignTop') {
            alignSelection('top');
        } else if (id === 'alignMiddle') {
            alignSelection('v-center');
        } else if (id === 'deleteElement') {
            if (selectedElement) {
                clearAllIntervalsForElement(selectedElement);
                selectedElement.remove();
                clearSelection();
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            }
        }
        contextMenu.style.display = 'none';
    });

    // Legacy generateUID/createElement logic has been replaced by elementManager.createElement

    // --- Compose CSS transform from rotate / scale / translateX ---
    function setElementTransform(el, { rotate, scale, translateX } = {}) {
        const parts = [];
        if (typeof translateX === 'number' && translateX !== 0) parts.push(`translateX(${translateX}px)`);
        if (typeof scale === 'number' && scale !== 1) parts.push(`scale(${scale})`);
        if (typeof rotate === 'number' && rotate !== 0) parts.push(`rotate(${rotate}deg)`);
        el.style.transform = parts.length ? parts.join(' ') : '';
    }

    // --- Interactive rotation logic ---
    let rotatingElement = null;
    let initialAngle = 0;
    let startAngle = 0;
    function startRotating(e) {
        if (isLocked) return;
        e.stopPropagation();
        rotatingElement = e.target.closest('.element');
        const rect = rotatingElement.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pointerAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
        startAngle = pointerAngle;
        initialAngle = parseFloat(rotatingElement.dataset.rotation || 0);
        document.body.style.cursor = 'grabbing';
        document.addEventListener('pointermove', rotateMove);
        document.addEventListener('pointerup', stopRotating);
    }
    function rotateMove(e) {
        if (!rotatingElement) return;
        const rect = rotatingElement.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pointerAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
        let newAngle = initialAngle + (pointerAngle - startAngle);
        newAngle = ((newAngle % 360) + 360) % 360;
        rotatingElement.dataset.rotation = newAngle;
        // Compose with any scale/move
        setElementTransform(rotatingElement, {
            rotate: newAngle,
            scale: rotatingElement.dataset.scale ? parseFloat(rotatingElement.dataset.scale) : undefined,
            translateX: rotatingElement.dataset.translateX ? parseFloat(rotatingElement.dataset.translateX) : undefined
        });
    }
    function stopRotating() {
        if (rotatingElement) {
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
        rotatingElement = null;
        document.body.style.cursor = '';
        document.removeEventListener('pointermove', rotateMove);
        document.removeEventListener('pointerup', stopRotating);
    }

    // --- Update rotate handle visibility on lock/unlock ---
    function updateRotateHandles() {
        const handles = canvas.querySelectorAll('.rotate-handle');
        handles.forEach(handle => {
            handle.style.display = isLocked ? 'none' : '';
        });
    }

    function startDragging(e) {
        if (e.target.className === 'resize-handle' || isLocked) return;
        const targetElement = e.target.closest('.element');
        if (!targetElement) {
            if (e.target === canvas || e.target.id === 'grid') {
                startMarquee(e);
            }
            return;
        }
        draggedElement = targetElement;
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        offset = {
            x: canvasPos.x - draggedElement.offsetLeft,
            y: canvasPos.y - draggedElement.offsetTop
        };

        // Long press detection for touch screens
        let longPressTimer;
        const longPressDuration = 500; // Duration in ms for detecting a long press

        const startLongPressTimer = () => {
            longPressTimer = setTimeout(() => {
                showContextMenu(e);
            }, longPressDuration);
        };

        const clearLongPressTimer = () => {
            clearTimeout(longPressTimer);
        };

        if (e.pointerType === 'touch') {
            startLongPressTimer();
            document.addEventListener('pointermove', clearLongPressTimer);
            document.addEventListener('pointerup', clearLongPressTimer);
        }

        document.addEventListener('pointermove', drag);
        document.addEventListener('pointerup', stopDragging);
    }

    let lastPointerMoveTime = 0;
    function drag(e) {
        if (!draggedElement) return;
        const now = Date.now();
        if (now - lastPointerMoveTime > 50) { // Throttle to 20 FPS
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            let newLeft = canvasPos.x - offset.x;
            let newTop = canvasPos.y - offset.y;

            const canvasRect = canvas.getBoundingClientRect();
            const scale = getCanvasScale();
            const elRect = draggedElement.getBoundingClientRect();
            const elWidth = elRect.width / scale;
            const elHeight = elRect.height / scale;
            const snapThreshold = 6;

            // Grid snapping
            if (gridEnabled) {
                const gridSize = 20;
                newLeft = Math.round(newLeft / gridSize) * gridSize;
                newTop = Math.round(newTop / gridSize) * gridSize;
            }

            // Clear previous guides
            if (hGuide) hGuide.remove();
            if (vGuide) vGuide.remove();
            hGuide = null;
            vGuide = null;

            // Collect candidate snap lines from other elements
            const others = Array.from(canvas.querySelectorAll('.element')).filter(el => el !== draggedElement);
            const target = {
                left: newLeft,
                right: newLeft + elWidth,
                hCenter: newLeft + elWidth / 2,
                top: newTop,
                bottom: newTop + elHeight,
                vCenter: newTop + elHeight / 2
            };

            let snapLeft = newLeft;
            let snapTop = newTop;

            others.forEach(el => {
                const r = el.getBoundingClientRect();
                const oLeft = (r.left - canvasRect.left) / scale;
                const oRight = oLeft + r.width / scale;
                const oHCenter = oLeft + r.width / (2 * scale);
                const oTop = (r.top - canvasRect.top) / scale;
                const oBottom = oTop + r.height / scale;
                const oVCenter = oTop + r.height / (2 * scale);

                // Vertical snapping (x-axis): left, center, right
                if (Math.abs(target.left - oLeft) <= snapThreshold) {
                    snapLeft = oLeft;
                    vGuide = vGuide || createVGuide(oLeft);
                } else if (Math.abs(target.hCenter - oHCenter) <= snapThreshold) {
                    snapLeft = oHCenter - elWidth / 2;
                    vGuide = vGuide || createVGuide(oHCenter);
                } else if (Math.abs(target.right - oRight) <= snapThreshold) {
                    snapLeft = oRight - elWidth;
                    vGuide = vGuide || createVGuide(oRight);
                }

                // Horizontal snapping (y-axis): top, center, bottom
                if (Math.abs(target.top - oTop) <= snapThreshold) {
                    snapTop = oTop;
                    hGuide = hGuide || createHGuide(oTop);
                } else if (Math.abs(target.vCenter - oVCenter) <= snapThreshold) {
                    snapTop = oVCenter - elHeight / 2;
                    hGuide = hGuide || createHGuide(oVCenter);
                } else if (Math.abs(target.bottom - oBottom) <= snapThreshold) {
                    snapTop = oBottom - elHeight;
                    hGuide = hGuide || createHGuide(oBottom);
                }
            });

            draggedElement.style.left = `${snapLeft}px`;
            draggedElement.style.top = `${snapTop}px`;
            lastPointerMoveTime = now;
        }
    }

    function stopDragging() {
        draggedElement = null;
        document.removeEventListener('pointermove', drag);
        document.removeEventListener('pointerup', stopDragging);
        if (hGuide) hGuide.remove();
        if (vGuide) vGuide.remove();
        hGuide = null;
        vGuide = null;
    }

    function createHGuide(y) {
        const g = document.createElement('div');
        g.className = 'snap-guide horizontal';
        g.style.top = y + 'px';
        g.style.left = '0px';
        canvas.appendChild(g);
        return g;
    }

    function createVGuide(x) {
        const g = document.createElement('div');
        g.className = 'snap-guide vertical';
        g.style.left = x + 'px';
        g.style.top = '0px';
        canvas.appendChild(g);
        return g;
    }

    function startMarquee(e) {
        if (marquee) return;
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        marqueeStart = { x: canvasPos.x, y: canvasPos.y };
        marquee = document.createElement('div');
        marquee.className = 'marquee-selection';
        canvas.appendChild(marquee);
        document.addEventListener('pointermove', updateMarquee);
        document.addEventListener('pointerup', finishMarquee);
        clearSelection();
    }

    function updateMarquee(e) {
        if (!marquee || !marqueeStart) return;
        const scale = getCanvasScale();
        const rect = canvas.getBoundingClientRect();
        const curPos = screenToCanvas(e.clientX, e.clientY);
        const x1 = Math.min(marqueeStart.x, curPos.x);
        const y1 = Math.min(marqueeStart.y, curPos.y);
        const x2 = Math.max(marqueeStart.x, curPos.x);
        const y2 = Math.max(marqueeStart.y, curPos.y);
        marquee.style.left = x1 + 'px';
        marquee.style.top = y1 + 'px';
        marquee.style.width = (x2 - x1) + 'px';
        marquee.style.height = (y2 - y1) + 'px';

        const mRect = { left: x1, top: y1, right: x2, bottom: y2 };
        canvas.querySelectorAll('.element').forEach(el => {
            const elRect = el.getBoundingClientRect();
            const ex1 = (elRect.left - rect.left) / scale;
            const ey1 = (elRect.top - rect.top) / scale;
            const ex2 = ex1 + elRect.width / scale;
            const ey2 = ey1 + elRect.height / scale;
            const intersects = !(ex2 < mRect.left || ex1 > mRect.right || ey2 < mRect.top || ey1 > mRect.bottom);
            if (intersects) {
                el.classList.add('element--selected');
            } else {
                el.classList.remove('element--selected');
            }
        });
    }

    function finishMarquee() {
        if (marquee) {
            marquee.remove();
            marquee = null;
            marqueeStart = null;
        }
        document.removeEventListener('pointermove', updateMarquee);
        document.removeEventListener('pointerup', finishMarquee);
        const selectedEls = canvas.querySelectorAll('.element.element--selected');
        applySelectionReference(selectedEls.length === 1 ? selectedEls[0] : null);
    }

    function startResizing(e) {
        if (isLocked) return;
        e.stopPropagation();
        isResizing = true;
        applySelectionReference(e.target.parentElement);
        document.addEventListener('pointermove', resize);
        document.addEventListener('pointerup', stopResizing);
    }

    function resize(e) {
        if (!isResizing) return;
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        const newWidth = canvasPos.x - selectedElement.offsetLeft;
        const newHeight = canvasPos.y - selectedElement.offsetTop;
        selectedElement.style.width = `${newWidth}px`;
        selectedElement.style.height = `${newHeight}px`;

        if (gridEnabled) {
            const gridSize = 20;
            const width = Math.round(newWidth / gridSize) * gridSize;
            const height = Math.round(newHeight / gridSize) * gridSize;
            selectedElement.style.width = `${width}px`;
            selectedElement.style.height = `${height}px`;
        }
    }

    function stopResizing() {
        isResizing = false;
        document.removeEventListener('pointermove', resize);
        document.removeEventListener('pointerup', stopResizing);
    }

    function alignSelection(mode) {
        const selectedEls = Array.from(canvas.querySelectorAll('.element.element--selected'));
        if (selectedEls.length < 2) return;
        const rects = selectedEls.map(el => el.getBoundingClientRect());
        const canvasRect = canvas.getBoundingClientRect();
        const scale = getCanvasScale();

        if (mode === 'left' || mode === 'h-center' || mode === 'right') {
            const base = mode === 'left'
                ? Math.min(...rects.map(r => r.left))
                : mode === 'right'
                ? Math.max(...rects.map(r => r.right))
                : (Math.min(...rects.map(r => r.left)) + Math.max(...rects.map(r => r.right))) / 2;
            selectedEls.forEach((el, idx) => {
                const r = rects[idx];
                let newLeft;
                if (mode === 'left') newLeft = base;
                else if (mode === 'right') newLeft = base - r.width;
                else newLeft = base - r.width / 2;
                el.style.left = ((newLeft - canvasRect.left) / scale) + 'px';
            });
        } else if (mode === 'top' || mode === 'v-center' || mode === 'bottom') {
            const base = mode === 'top'
                ? Math.min(...rects.map(r => r.top))
                : mode === 'bottom'
                ? Math.max(...rects.map(r => r.bottom))
                : (Math.min(...rects.map(r => r.top)) + Math.max(...rects.map(r => r.bottom))) / 2;
            selectedEls.forEach((el, idx) => {
                const r = rects[idx];
                let newTop;
                if (mode === 'top') newTop = base;
                else if (mode === 'bottom') newTop = base - r.height;
                else newTop = base - r.height / 2;
                el.style.top = ((newTop - canvasRect.top) / scale) + 'px';
            });
        }
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    }

    function groupSelection() {
        const selectedEls = Array.from(canvas.querySelectorAll('.element.element--selected'));
        if (selectedEls.length < 2) return;

        const rects = selectedEls.map(el => el.getBoundingClientRect());
        const canvasRect = canvas.getBoundingClientRect();
        const scale = getCanvasScale();
        const minLeft = Math.min(...rects.map(r => r.left));
        const minTop = Math.min(...rects.map(r => r.top));
        const maxRight = Math.max(...rects.map(r => r.right));
        const maxBottom = Math.max(...rects.map(r => r.bottom));

        const group = document.createElement('div');
        group.className = 'element group-element';
        group.style.position = 'absolute';
        group.style.left = ((minLeft - canvasRect.left) / scale) + 'px';
        group.style.top = ((minTop - canvasRect.top) / scale) + 'px';
        group.style.width = ((maxRight - minLeft) / scale) + 'px';
        group.style.height = ((maxBottom - minTop) / scale) + 'px';
        group.style.background = 'transparent';
        group.style.border = '1px dashed rgba(0,0,0,0.2)';
        group.dataset.group = 'true';

        ensureElementUID(group);

        selectedEls.forEach(el => {
            const elRect = el.getBoundingClientRect();
            const offsetLeft = elRect.left - minLeft;
            const offsetTop = elRect.top - minTop;
            el.style.left = offsetLeft + 'px';
            el.style.top = offsetTop + 'px';
            group.appendChild(el);
        });

        canvas.appendChild(group);
        attachElementInteractions(group);
        clearSelection();
        selectElement(group, false);
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    }

    function ungroupSelection() {
        const target = selectedElement;
        if (!target || !target.dataset.group) return;
        const canvasRect = canvas.getBoundingClientRect();
        const scale = getCanvasScale();
        const children = Array.from(target.querySelectorAll('.element'));
        children.forEach(child => {
            const childRect = child.getBoundingClientRect();
            const newLeft = (childRect.left - canvasRect.left) / scale;
            const newTop = (childRect.top - canvasRect.top) / scale;
            child.style.left = newLeft + 'px';
            child.style.top = newTop + 'px';
            canvas.appendChild(child);
            attachElementInteractions(child);
        });
        target.remove();
        clearSelection();
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    }

    const BOOL_ANIMATION_KEYS = new Set([
        'colorAnimActive',
        'colorAnimPause',
        'colorAnimReverse',
        'colorAnimLoop',
        'gradientAnimActive',
        'gradientPause',
        'gradientReverse',
        'gradientLoop'
    ]);

    const NUM_ANIMATION_KEYS = new Set([
        'colorAnimTransitionTime',
        'colorAnimSpeed',
        'gradientSpeed'
    ]);

    function deriveAnimationStateFromDataset(el) {
        if (!el || !el.dataset) return null;
        const state = {};
        let hasData = false;
        Object.keys(el.dataset).forEach(key => {
            if (!key.startsWith('colorAnim') && !key.startsWith('gradient')) return;
            hasData = true;
            const raw = el.dataset[key];
            if (BOOL_ANIMATION_KEYS.has(key)) {
                state[key] = raw === 'true';
            } else if (NUM_ANIMATION_KEYS.has(key)) {
                const num = parseFloat(raw);
                state[key] = isFinite(num) ? num : raw;
            } else {
                state[key] = raw;
            }
        });
        return hasData ? state : null;
    }

    function ensureAnimationStateForElement(el) {
        if (!el) return null;
        const uid = getElementUID(el);
        if (!uid) return null;
        let state = getElementAnimationState(uid);
        if (state) return state;
        const derived = deriveAnimationStateFromDataset(el);
        if (derived) {
            setElementAnimationState(uid, derived);
            return derived;
        }
        return null;
    }

    function applySelectionReference(el) {
        selectedElement = el || null;
        updateBgModeLabel();
    }

    function setSelectedElement(el) {
        if (selectedElement === el) return;
        if (selectedElement) {
            selectedElement.classList.remove('element--selected');
        }
        if (el) {
            el.classList.add('element--selected');
        }
        applySelectionReference(el || null);
    }

    function clearSelection() {
        canvas.querySelectorAll('.element.element--selected').forEach(el => {
            el.classList.remove('element--selected');
        });
        applySelectionReference(null);
    }

    function selectElement(el, additive = false) {
        if (!additive) {
            clearSelection();
        }
        if (el) {
            el.classList.add('element--selected');
            selectedElement = el;
        } else {
            selectedElement = null;
        }
        applySelectionReference(selectedElement);
    }

    function updateBgModeLabel() {
        if (!bgModeLabel) return;
        if (!selectedElement) {
            bgModeLabel.textContent = '';
            return;
        }
        const uid = getElementUID(selectedElement);
        const state = uid ? getElementAnimationState(uid) || {} : {};
        let mode = 'none';
        if (state.gradientAnimActive) {
            mode = 'gradient';
        } else if (state.colorAnimActive) {
            mode = 'color';
        }
        bgModeLabel.textContent = `Background mode: ${mode}`;
    }

    const textPresets = {
        title: {
            fontSize: '28px',
            fontWeight: '700',
            lineHeight: '1.2'
        },
        subtitle: {
            fontSize: '20px',
            fontWeight: '600',
            lineHeight: '1.3'
        },
        body: {
            fontSize: '16px',
            fontWeight: '400',
            lineHeight: '1.5'
        },
        caption: {
            fontSize: '12px',
            fontWeight: '400',
            lineHeight: '1.4'
        }
    };

    function showInlineToolbar(target) {
        activeEditable = target;
        const rect = target.getBoundingClientRect();
        inlineToolbar.style.left = `${rect.left + window.scrollX}px`;
        inlineToolbar.style.top = `${rect.top + window.scrollY - inlineToolbar.offsetHeight - 4}px`;
        inlineToolbar.style.display = 'flex';
    }

    function hideInlineToolbar() {
        inlineToolbar.style.display = 'none';
    }

    inlineToolbar.addEventListener('mousedown', (e) => {
        e.preventDefault();
    });

    inlineToolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.dataset.action;
        if (!activeEditable && action !== 'pin-color') return;
        const style = activeEditable ? activeEditable.style : null;
        if (action === 'bold') {
            style.fontWeight = style.fontWeight === '700' ? '400' : '700';
        } else if (action === 'italic') {
            style.fontStyle = style.fontStyle === 'italic' ? 'normal' : 'italic';
        } else if (action === 'underline') {
            style.textDecoration = style.textDecoration === 'underline' ? 'none' : 'underline';
        } else if (action === 'align-left') {
            style.textAlign = 'left';
        } else if (action === 'align-center') {
            style.textAlign = 'center';
        } else if (action === 'align-right') {
            style.textAlign = 'right';
        } else if (action === 'smaller') {
            const current = parseInt(window.getComputedStyle(activeEditable).fontSize || '16', 10);
            style.fontSize = `${Math.max(8, current - 2)}px`;
        } else if (action === 'larger') {
            const current = parseInt(window.getComputedStyle(activeEditable).fontSize || '16', 10);
            style.fontSize = `${current + 2}px`;
        } else if (action === 'pin-color') {
            // Pin the current text color of the active editable into swatches
            if (!activeEditable) return;
            const currentColor = window.getComputedStyle(activeEditable).color;
            const swatchContainer = inlineToolbar.querySelector('.color-swatches');
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = currentColor;
            swatch.title = currentColor;
            swatch.addEventListener('click', () => {
                if (!activeEditable) return;
                activeEditable.style.color = currentColor;
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            });
            swatchContainer.appendChild(swatch);
        }
        if (action !== 'pin-color' && typeof saveState === 'function' && canvas && activeEditable) saveState(canvas);
    });

    inlineToolbar.querySelector('select[data-action="preset"]').addEventListener('change', (e) => {
        if (!activeEditable) return;
        const preset = textPresets[e.target.value];
        if (preset) {
            Object.assign(activeEditable.style, preset);
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
    });

    inlineToolbar.querySelector('select[data-action="font-family"]').addEventListener('change', (e) => {
        if (!activeEditable) return;
        const value = e.target.value;
        if (value) {
            activeEditable.style.fontFamily = value;
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
    });

    inlineToolbar.querySelector('input[data-action="line-height"]').addEventListener('change', (e) => {
        if (!activeEditable) return;
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v > 0) {
            activeEditable.style.lineHeight = v.toString();
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
    });

    // Seed inline text toolbar with a few light/yellow swatches
    (function seedInlineSwatches() {
        const swatchContainer = inlineToolbar.querySelector('.color-swatches');
        if (!swatchContainer) return;
        const swatches = [
            { name: 'Amber', hex: '#F5C919' },
            { name: 'Soft Amber', hex: '#FFEFA8' },
            { name: 'Warm White', hex: '#FFF9E5' },
            { name: 'Black', hex: '#111111' }
        ];
        swatches.forEach(({ name, hex }) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = hex;
            swatch.title = name;
            swatch.addEventListener('click', () => {
                if (!activeEditable) return;
                activeEditable.style.color = swatch.style.backgroundColor;
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            });
            swatchContainer.appendChild(swatch);
        });
    })();

    function showContextMenu(e) {
        e.preventDefault();
        if (isLocked) return;
        const el = e.target.closest('.element');
        if (el) {
            if (!el.classList.contains('element--selected')) {
                selectElement(el, false);
            } else {
                applySelectionReference(el);
            }
        }
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
    }

    document.addEventListener('click', (e) => {
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
        const clickedElement = e.target.closest('.element');
        const clickedContextMenu = e.target.closest('#contextMenu');
        const clickedPopup = e.target.closest('.popup');
        const clickedToolbar = e.target.closest('#toolbar');
        const clickedInlineToolbar = e.target.closest('.inline-text-toolbar');
        // Keep the current selection when interacting with menus/toolbars/popups
        if (!clickedElement && !clickedContextMenu && !clickedPopup && !clickedToolbar && !clickedInlineToolbar) {
            clearSelection();
        }
    });

    document.getElementById('changeColor').addEventListener('click', () => {
        if (selectedElement) {
            openColorPopup();
        }
    });

    applyColorBtn.addEventListener('click', () => {
        if (selectedElement) {
            const hex = hexInput.value;
            const transparency = 100 - transparencyInput.value;  // Correct transparency handling
            if (/^#[0-9A-F]{6}$/i.test(hex) && transparency >= 0 && transparency <= 100) {
                const rgba = hexToRgba(hex, transparency);
                changeElementColor(selectedElement, rgba);
            }
        }
        closeColorPopup();
    });

    // Seed main color popup with a few quick swatches if a container exists
    (function seedPopupSwatches() {
        if (!colorPopup) return;
        const swatchContainerId = 'brand-color-swatches';
        let swatchContainer = colorPopup.querySelector('#' + swatchContainerId);
        if (!swatchContainer) {
            swatchContainer = document.createElement('div');
            swatchContainer.id = swatchContainerId;
            swatchContainer.style.display = 'flex';
            swatchContainer.style.flexWrap = 'wrap';
            swatchContainer.style.gap = '4px';
            swatchContainer.style.marginTop = '8px';
            const label = document.createElement('div');
            label.textContent = 'Quick colors';
            label.style.fontSize = '11px';
            label.style.opacity = '0.7';
            colorPopup.appendChild(label);
            colorPopup.appendChild(swatchContainer);
        }

        const swatches = [
            { name: 'Amber', hex: '#F5C919' },
            { name: 'Soft Amber', hex: '#FFEFA8' },
            { name: 'Warm White', hex: '#FFF9E5' },
            { name: 'White', hex: '#FFFFFF' }
        ];
        swatches.forEach(({ name, hex }) => {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.style.width = '18px';
            swatch.style.height = '18px';
            swatch.style.borderRadius = '4px';
            swatch.style.border = '1px solid rgba(0,0,0,0.2)';
            swatch.style.padding = '0';
            swatch.style.cursor = 'pointer';
            swatch.style.backgroundColor = hex;
            swatch.title = name;
            swatch.addEventListener('click', () => {
                if (!selectedElement) return;
                const color = swatch.style.backgroundColor;
                changeElementColor(selectedElement, color);
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            });
            swatchContainer.appendChild(swatch);
        });
    })();

    function changeElementColor(element, color) {
        const svg = element.querySelector('svg');
        if (svg) {
            const shapes = svg.querySelectorAll('rect, circle, line, polygon');
            shapes.forEach(shape => {
                if (shape.tagName === 'line') {
                    shape.setAttribute('stroke', color);
                } else {
                    shape.setAttribute('fill', color);
                }
            });
        } else {
            element.style.backgroundColor = color;
        }
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    }

    document.getElementById('rotateElement').addEventListener('click', () => {
        if (selectedElement) {
            const currentRotation = selectedElement.dataset.rotation || 0;
            const newRotation = (parseInt(currentRotation) + 5) % 360;
            selectedElement.style.transform = `rotate(${newRotation}deg)`;
            selectedElement.dataset.rotation = newRotation;
        }
    });

    document.getElementById('rotate90Element').addEventListener('click', () => {
        if (selectedElement) {
            const currentRotation = selectedElement.dataset.rotation || 0;
            const newRotation = (parseInt(currentRotation) + 90) % 360;
            selectedElement.style.transform = `rotate(${newRotation}deg)`;
            selectedElement.dataset.rotation = newRotation;
        }
    });

    document.getElementById('changeLinkedMedia').addEventListener('click', () => {
        if (selectedElement) {
            openMediaPopup();
        }
    });

    applyMediaBtn.addEventListener('click', () => {
        if (selectedElement) {
            const mediaUrl = mediaUrlInput.value;
            if (mediaUrl) {
                if (selectedElement.querySelector('button')) {
                    const buttonElement = selectedElement.querySelector('button');
                    buttonElement.addEventListener('click', () => {
                        if (buttonElement.dataset.toggled === 'true') {
                            const imgElement = selectedElement.querySelector('img');
                            if (imgElement) {
                                imgElement.remove();
                            }
                            buttonElement.dataset.toggled = 'false';
                        } else {
                            if (mediaUrl.match(/\.(jpeg|jpg|gif|png|svg|bmp)(\?|#|$)/i) != null) {
                                const imgElement = document.createElement('img');
                                imgElement.src = mediaUrl;
                                imgElement.style.position = 'absolute';
                                imgElement.style.left = '0';
                                imgElement.style.top = '0';
                                imgElement.style.width = '100%';
                                imgElement.style.height = '100%';
                                imgElement.style.pointerEvents = 'none';
                                selectedElement.appendChild(imgElement);
                                buttonElement.dataset.toggled = 'true';
                            } else {
                                window.open(mediaUrl, '_blank');
                            }
                        }
                    });
                } else {
                    if (mediaUrl.match(/\.(jpeg|jpg|gif|png|svg|bmp)(\?|#|$)/i) != null) {
                        const imgElement = document.createElement('img');
                        imgElement.src = mediaUrl;
                        imgElement.style.position = 'absolute';
                        imgElement.style.left = '0';
                        imgElement.style.top = '0';
                        imgElement.style.width = '100%';
                        imgElement.style.height = '100%';
                        imgElement.style.pointerEvents = 'none';
                        selectedElement.appendChild(imgElement);
                    } else if (mediaUrl.match(/\.(mp4|ogg|webm|mov)(\?|#|$)/i) != null) {
                        selectedElement.innerHTML = `<video width="100%" height="100%" controls><source src="${mediaUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
                        selectedElement.querySelector('video').addEventListener('pointerdown', (e) => e.stopPropagation());
                    } else if (mediaUrl.match(/\.(mp3|wav|ogg|flac)(\?|#|$)/i) != null) {
                        selectedElement.innerHTML = `<audio controls><source src="${mediaUrl}" type="audio/mpeg">Your browser does not support the audio element.</audio>`;
                        selectedElement.querySelector('audio').addEventListener('pointerdown', (e) => e.stopPropagation());
                    } else {
                        alert("Unsupported media type. Please use image, video, or audio URLs.");
                    }
                }
            }
            closeMediaPopup();
        }
    });

    searchBtn.addEventListener('click', () => {
        const query = searchQueryInput.value;
        if (query) {
            searchResults.innerHTML = '';
            fetch(`https://api.unsplash.com/search/photos?query=${query}&client_id=YOUR_UNSPLASH_ACCESS_KEY`)
                .then(response => response.json())
                .then(data => {
                    if (!data.results || !Array.isArray(data.results)) {
                        searchResults.innerHTML = '<div style="color:red">No results or API error.</div>';
                        return;
                    }
                    data.results.forEach(photo => {
                        const imgElement = document.createElement('img');
                        imgElement.src = photo.urls.small;
                        imgElement.alt = photo.alt_description;
                        imgElement.style.cursor = 'pointer';
                        imgElement.style.width = '100px';
                        imgElement.style.height = 'auto';
                        imgElement.addEventListener('click', () => {
                            mediaUrlInput.value = photo.urls.small;
                            searchResults.innerHTML = '';
                        });
                        searchResults.appendChild(imgElement);
                    });
                })
                .catch(err => {
                    searchResults.innerHTML = '<div style="color:red">Error fetching images.</div>';
                });
        }
    });

    document.getElementById('fontSize').addEventListener('click', () => {
        if (selectedElement) {
            const newSize = prompt("Enter the new font size (e.g., 16px, 2em, 150%):");
            if (newSize) {
                selectedElement.style.fontSize = newSize;
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            }
        }
    });

    document.getElementById('fontColor').addEventListener('click', () => {
        fontColorPicker.click();
    });

    fontColorPicker.addEventListener('input', (event) => {
        if (selectedElement) {
            // Set color on all .editable children if present, else on the element
            const editableEls = selectedElement.querySelectorAll('.editable');
            if (editableEls.length > 0) {
                editableEls.forEach(el => {
                    el.style.color = event.target.value;
                });
            } else {
                selectedElement.style.color = event.target.value;
            }
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
    });

    document.getElementById('textAlign').addEventListener('click', () => {
        if (selectedElement) {
            alignmentIndex = (alignmentIndex + 1) % alignments.length;
            const editableElements = selectedElement.querySelectorAll('.editable');
            editableElements.forEach(el => {
                el.style.textAlign = alignments[alignmentIndex];
            });
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
    });

    document.getElementById('changeFont').addEventListener('click', () => {
        if (selectedElement) {
            fontIndex = (fontIndex + 1) % fonts.length;
            const editableElements = selectedElement.querySelectorAll('.editable');
            editableElements.forEach(el => {
                el.style.fontFamily = fonts[fontIndex];
            });
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
    });

    document.getElementById('makeTransparent').addEventListener('click', () => {
        if (selectedElement) {
            selectedElement.style.backgroundColor = 'rgba(43, 38, 34, 0)';
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
    });

    document.getElementById('createColorTransition').addEventListener('click', () => {
        if (selectedElement) {
            openColorTransitionPopup();
        }
    });

    document.getElementById('createColorGradient').addEventListener('click', () => {
        if (selectedElement) {
            openColorGradientPopup();
        }
    });

    document.getElementById('createAnimation').addEventListener('click', () => {
        if (selectedElement) {
            openAnimationPopup();
        }
    });

    // --- GLOBAL INTERVAL MAPS FOR ENTITY-COMPONENT STYLE ---
    const colorTransitionIntervals = new Map(); // uid -> intervalId
    const gradientAnimIntervals = new Map(); // uid -> intervalId
    const elementAnimIntervals = new Map(); // uid -> intervalId (for scale/move/rotate etc)
    let reduceMotion = false;

    function updateSelectedAnimationState(mutator) {
        if (typeof mutator !== 'function') return;
        if (!selectedElement) return;
        const uid = getElementUID(selectedElement);
        if (!uid) return;
        const currentState = ensureAnimationStateForElement(selectedElement) || {};
        const nextState = { ...currentState };
        mutator(nextState, currentState);
        setElementAnimationState(uid, nextState);
        restoreElementAnimation(selectedElement, nextState, { color: colorTransitionIntervals, gradient: gradientAnimIntervals }, uid);
    }

    // --- Helper: Get UID for an element ---
    function getElementUID(el) {
        return el && el.getAttribute && el.getAttribute('data-uid');
    }

    function ensureElementUID(el) {
        if (!el) return null;
        let uid = getElementUID(el);
        if (!uid) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            uid = Array.from({ length: 9 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
            el.setAttribute('data-uid', uid);
        }
        return uid;
    }

    // --- Helper: Clear all intervals for an element by UID ---
    function clearAllIntervalsForElement(el) {
        const uid = ensureElementUID(el);
        if (!uid) return;
        clearIntervalsForUID(uid, colorTransitionIntervals, gradientAnimIntervals, elementAnimIntervals);
    }

    // --- Helper: Clear all intervals for a UID from all Maps ---
    function clearIntervalsForUID(uid, ...intervalMaps) {
        intervalMaps.forEach(map => {
            if (map.has(uid)) {
                clearInterval(map.get(uid));
                map.delete(uid);
            }
        });
    }

    // --- Patch: On theme override, clear all intervals ---
    function clearAllIntervals() {
        colorTransitionIntervals.forEach((intervalId, uid) => {
            clearInterval(intervalId);
        });
        colorTransitionIntervals.clear();
        gradientAnimIntervals.forEach((intervalId, uid) => {
            clearInterval(intervalId);
        });
        gradientAnimIntervals.clear();
        elementAnimIntervals.forEach((intervalId, uid) => {
            clearInterval(intervalId);
        });
        elementAnimIntervals.clear();
    }

    // --- Animation Popup: Apply scale/move/rotate animation using UID-based interval management ---
    applyAnimationBtn.addEventListener('click', () => {
        if (selectedElement) {
            const uid = getElementUID(selectedElement);
            if (elementAnimIntervals.has(uid)) {
                clearInterval(elementAnimIntervals.get(uid));
                elementAnimIntervals.delete(uid);
            }
            const type = animationTypeSelect.value;
            const preset = animationPresetSelect.value;
            const duration = parseFloat(animationDurationInput.value) || 2;

            // Always store the animation metadata
            selectedElement.dataset.elementAnimation = JSON.stringify({ type, preset, duration });

            // Honor reduce-motion: don't start intervals if enabled
            if (reduceMotion) {
                if (typeof saveState === 'function' && canvas) saveState(canvas);
                renderAnimationsPanel();
                closeAnimationPopup();
                return;
            }

            let intervalId;
            if (type === 'scale') {
                let scale = 1, direction = 1;
                intervalId = setInterval(() => {
                    if (!document.body.contains(selectedElement)) {
                        clearInterval(intervalId);
                        elementAnimIntervals.delete(uid);
                        return;
                    }
                    scale += direction * 0.02;
                    if (scale > 1.2) direction = -1;
                    if (scale < 0.8) direction = 1;
                    selectedElement.dataset.scale = scale;
                    setElementTransform(selectedElement, {
                        scale,
                        rotate: selectedElement.dataset.rotation ? parseFloat(selectedElement.dataset.rotation) : undefined,
                        translateX: selectedElement.dataset.translateX ? parseFloat(selectedElement.dataset.translateX) : undefined
                    });
                }, 1000 * duration / 40);
            } else if (type === 'move') {
                let pos = 0, dir = 1;
                intervalId = setInterval(() => {
                    if (!document.body.contains(selectedElement)) {
                        clearInterval(intervalId);
                        elementAnimIntervals.delete(uid);
                        return;
                    }
                    pos += dir * 2;
                    if (pos > 40) dir = -1;
                    if (pos < -40) dir = 1;
                    selectedElement.dataset.translateX = pos;
                    setElementTransform(selectedElement, {
                        translateX: pos,
                        scale: selectedElement.dataset.scale ? parseFloat(selectedElement.dataset.scale) : undefined,
                        rotate: selectedElement.dataset.rotation ? parseFloat(selectedElement.dataset.rotation) : undefined
                    });
                }, 1000 * duration / 40);
            } else if (type === 'rotate') {
                let angle = 0;
                intervalId = setInterval(() => {
                    if (!document.body.contains(selectedElement)) {
                        clearInterval(intervalId);
                        elementAnimIntervals.delete(uid);
                        return;
                    }
                    angle = (angle + 5) % 360;
                    selectedElement.dataset.rotation = angle;
                    setElementTransform(selectedElement, {
                        rotate: angle,
                        scale: selectedElement.dataset.scale ? parseFloat(selectedElement.dataset.scale) : undefined,
                        translateX: selectedElement.dataset.translateX ? parseFloat(selectedElement.dataset.translateX) : undefined
                    });
                }, 1000 * duration / 40);
            }
            if (intervalId) {
                elementAnimIntervals.set(uid, intervalId);
            }
            if (typeof saveState === 'function' && canvas) saveState(canvas);
            renderAnimationsPanel();
        }
        closeAnimationPopup();
    });

    // --- Restore all per-UID animations/intervals after state restoration ---
    function restoreElementAnimations() {
        const elements = canvas.querySelectorAll('.element');
        elements.forEach(el => {
            const uid = getElementUID(el);
            // Try to get modular animation state from dataset or state object
            let animationState = getElementAnimationState(uid);
            // If not present, try to build from dataset attributes (legacy)
            if (!animationState) {
                animationState = {};
                if (el.dataset.colorTransition) {
                    try {
                        const ct = JSON.parse(el.dataset.colorTransition);
                        animationState.colorAnimActive = true;
                        animationState.colorAnimStartColor = ct.startColor;
                        animationState.colorAnimEndColor = ct.endColor;
                        animationState.colorAnimTransitionTime = ct.transitionTime;
                    } catch {}
                }
                if (el.dataset.colorGradient) {
                    try {
                        const cg = JSON.parse(el.dataset.colorGradient);
                        animationState.gradientAnimActive = true;
                        animationState.gradientStartColor = cg.startColor;
                        animationState.gradientEndColor = cg.endColor;
                        animationState.gradientDirection = cg.direction;
                        animationState.gradientType = cg.gradientType;
                        animationState.gradientAnimStyle = cg.animStyle;
                    } catch {}
                }
                // Add more legacy dataset extraction as needed
                setElementAnimationState(uid, animationState);
            }
            // Validate and restore
            animationState = validateAnimationState(animationState);
            restoreElementAnimation(el, animationState, { color: colorTransitionIntervals, gradient: gradientAnimIntervals }, uid);
            // Restore element animation (scale/move/rotate) as before
            if (el.dataset.elementAnimation) {
                try {
                    const { type, preset, duration, startColor, endColor } = JSON.parse(el.dataset.elementAnimation);
                    if (elementAnimIntervals.has(uid)) {
                        clearInterval(elementAnimIntervals.get(uid));
                        elementAnimIntervals.delete(uid);
                    }
                    let intervalId;
                    if (type === 'scale') {
                        let scale = 1, direction = 1;
                        intervalId = setInterval(() => {
                            if (!document.body.contains(el)) {
                                clearInterval(intervalId);
                                elementAnimIntervals.delete(uid);
                                return;
                            }
                            scale += direction * 0.02;
                            if (scale > 1.2) direction = -1;
                            if (scale < 0.8) direction = 1;
                            el.dataset.scale = scale;
                            setElementTransform(el, {
                                scale,
                                rotate: el.dataset.rotation ? parseFloat(el.dataset.rotation) : undefined,
                                translateX: el.dataset.translateX ? parseFloat(el.dataset.translateX) : undefined
                            });
                        }, 1000 * (parseFloat(duration) || 2) / 40);
                    } else if (type === 'move') {
                        let pos = 0, dir = 1;
                        intervalId = setInterval(() => {
                            if (!document.body.contains(el)) {
                                clearInterval(intervalId);
                                elementAnimIntervals.delete(uid);
                                return;
                            }
                            pos += dir * 2;
                            if (pos > 40) dir = -1;
                            if (pos < -40) dir = 1;
                            el.dataset.translateX = pos;
                            setElementTransform(el, {
                                translateX: pos,
                                scale: el.dataset.scale ? parseFloat(el.dataset.scale) : undefined,
                                rotate: el.dataset.rotation ? parseFloat(el.dataset.rotation) : undefined
                            });
                        }, 1000 * (parseFloat(duration) || 2) / 40);
                    } else if (type === 'rotate') {
                        let angle = 0;
                        intervalId = setInterval(() => {
                            if (!document.body.contains(el)) {
                                clearInterval(intervalId);
                                elementAnimIntervals.delete(uid);
                                return;
                            }
                            angle = (angle + 5) % 360;
                            el.dataset.rotation = angle;
                            setElementTransform(el, {
                                rotate: angle,
                                scale: el.dataset.scale ? parseFloat(el.dataset.scale) : undefined,
                                translateX: el.dataset.translateX ? parseFloat(el.dataset.translateX) : undefined
                            });
                        }, 1000 * (parseFloat(duration) || 2) / 40);
                    } else if (type === 'glow-pulse') {
                        // Pulsating box-shadow glow
                        let glowIntensity = 0, glowDir = 1;
                        const glowColor = startColor || '#ff006e';
                        intervalId = setInterval(() => {
                            if (!document.body.contains(el)) {
                                clearInterval(intervalId);
                                elementAnimIntervals.delete(uid);
                                return;
                            }
                            glowIntensity += glowDir * 3;
                            if (glowIntensity > 100) glowDir = -1;
                            if (glowIntensity < 0) glowDir = 1;
                            const spread1 = Math.round(glowIntensity * 0.5);
                            const spread2 = Math.round(glowIntensity * 1.0);
                            el.style.boxShadow = `0 0 ${spread1}px ${glowColor}, 0 0 ${spread2}px ${glowColor}55`;
                        }, 1000 * (parseFloat(duration) || 3) / 60);
                    } else if (type === 'fade-pulse') {
                        // Opacity breathing
                        let fadeOpacity = 1, fadeDir = -1;
                        intervalId = setInterval(() => {
                            if (!document.body.contains(el)) {
                                clearInterval(intervalId);
                                elementAnimIntervals.delete(uid);
                                return;
                            }
                            fadeOpacity += fadeDir * 0.03;
                            if (fadeOpacity < 0.2) fadeDir = 1;
                            if (fadeOpacity > 1) fadeDir = -1;
                            el.style.opacity = fadeOpacity;
                        }, 1000 * (parseFloat(duration) || 4) / 40);
                    }
                    if (intervalId) elementAnimIntervals.set(uid, intervalId);
                } catch {}
            }
        });
    }

    function renderAnimationsPanel() {}

    function toggleElementAnimation() {}

    // Call restoreElementAnimations after undo/redo/import/load/initial render
    // Example: after saveState() or after elements are re-created
    // You may need to call restoreElementAnimations() in your undo/redo/load logic

    // Setup popups
    setupPopupEvents({
        colorPopup,
        colorTransitionPopup,
        colorGradientPopup,
        animationPopup,
        mediaPopup
    });

    // Replace open/close popup functions with popupManager usage
    function openColorPopup() {
        // Use theme color if a theme is selected, else random
        let color = getRandomColor();
        if (currentThemeIndex !== null && colorThemes[currentThemeIndex]) {
            // Pick a random color from the current theme, but not the background color (index 0)
            const themeColors = colorThemes[currentThemeIndex].colors;
            color = themeColors.length > 1 ? themeColors[Math.floor(Math.random() * (themeColors.length - 1)) + 1] : themeColors[0];
        }
        colorPicker.value = color;
        hexInput.value = color;
        openPopup(colorPopup);
    }
    function closeColorPopup() { closePopup(colorPopup); }
    function openColorTransitionPopup() {
        startColorInput.value = '#F5C919';
        endColorInput.value = '#FFF9E5';
        transitionTimeInput.value = transitionTimeInput.value || 5;
        updateColorTransitionPreview();
        openPopup(colorTransitionPopup);
    }
    function closeColorTransitionPopup() { closePopup(colorTransitionPopup); }
    function openColorGradientPopup() {
        startGradientColorInput.value = '#F5C919';
        endGradientColorInput.value = '#FFF9E5';
        updateColorGradientPreview();
        openPopup(colorGradientPopup);
    }
    function closeColorGradientPopup() { closePopup(colorGradientPopup); }
    function openAnimationPopup() { openPopup(animationPopup); }
    function closeAnimationPopup() { closePopup(animationPopup); }
    function openMediaPopup() { openPopup(mediaPopup); }
    function closeMediaPopup() { closePopup(mediaPopup); }

    // Track the current theme index
    let currentThemeIndex = null;

    if (groupBtn) {
        groupBtn.addEventListener('click', () => {
            groupSelection();
        });
    }

    if (ungroupBtn) {
        ungroupBtn.addEventListener('click', () => {
            ungroupSelection();
        });
    }

    // Setup drag/resize logic
    // Replace startDragging, startResizing with dragResizeManager usage
    // Use setDragged, setOffset, setSelected to update local state
    function setDragged(el) { draggedElement = el; }
    function setOffset(val) { offset = val; }
    function setSelected(el) { setSelectedElement(el); }

    // --- FIX: Remove broken setupMediaDrop/setupUnsplashSearch calls before DOMContentLoaded ---
    // (They are already called after DOMContentLoaded with correct arguments)
    // setupMediaDrop(canvas, createImageElement, createVideoElement, createAudioElement);
    // setupUnsplashSearch(searchBtn, searchQueryInput, searchResults, mediaUrlInput);

    // --- Theme Selector ---
    // Use existing Theme button in the View toolbar group, or create if missing
    let themeBtn = document.getElementById('theme-btn');
    if (!themeBtn && toolbar) {
        themeBtn = document.createElement('button');
        themeBtn.id = 'theme-btn';
        themeBtn.textContent = 'Theme';
        themeBtn.setAttribute('aria-haspopup', 'dialog');
        themeBtn.setAttribute('aria-controls', 'theme-popup');
        themeBtn.style.marginLeft = '8px';
        toolbar.appendChild(themeBtn);
    }

    // Create the theme popup (if not present)
    let themePopup = document.getElementById('theme-popup');
    if (!themePopup) {
        themePopup = document.createElement('div');
        themePopup.id = 'theme-popup';
        themePopup.setAttribute('role', 'dialog');
        themePopup.setAttribute('aria-modal', 'true');
        themePopup.setAttribute('tabindex', '-1');
        themePopup.style.display = 'none';
        themePopup.style.pointerEvents = 'none';
        themePopup.style.position = 'fixed';
        themePopup.style.left = '20px';
        themePopup.style.top = '20px';
        themePopup.style.transform = 'none';
        themePopup.style.background = '#fff';
        themePopup.style.border = '2px solid #888';
        themePopup.style.borderRadius = '12px';
        themePopup.style.padding = '24px 16px 16px 16px';
        themePopup.style.zIndex = '10000';
        themePopup.style.minWidth = '320px';
        themePopup.style.maxHeight = '80vh';
        themePopup.style.overflowY = 'auto';
        themePopup.innerHTML = `
            <h2 id="theme-popup-title" style="margin-top:0">Select a Color Theme</h2>
            <div style="margin-bottom:8px;">
                <label style="font-size:14px;cursor:pointer;">
                    <input type="checkbox" id="force-theme-override" style="margin-right:6px;vertical-align:middle;">Override all element backgrounds
                </label>
                <br/>
                <label style="font-size:14px;cursor:pointer;">
                    <input type="checkbox" id="reset-animations" style="margin-right:6px;vertical-align:middle;" checked>Reset animations when applying theme
                </label>
            </div>
            <div id="theme-swatches" style="display:flex; flex-direction:column; gap:16px;"></div>
            <button id="close-theme-popup" style="margin-top:16px;">Close</button>
        `;
        document.body.appendChild(themePopup);
    }

    // --- Theme Popup Show/Hide Logic ---
    function openThemePopup() {
        themePopup.style.display = 'block';
        themePopup.style.pointerEvents = 'auto';
        themePopup.focus();
    }
    function closeThemePopup() {
        themePopup.style.display = 'none';
        themePopup.style.pointerEvents = 'none';
        themeBtn.focus();
    }
    themeBtn.addEventListener('click', openThemePopup);
    // Also wire the advanced-panel Themes button
    const themePanelBtn = document.getElementById('theme-panel-btn');
    if (themePanelBtn) themePanelBtn.addEventListener('click', openThemePopup);
    themePopup.querySelector('#close-theme-popup').addEventListener('click', closeThemePopup);
    // Also close on Escape key
    themePopup.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeThemePopup();
    });
    // Prevent popup from closing when clicking inside
    themePopup.addEventListener('mousedown', (e) => e.stopPropagation());
    // Close popup when clicking outside
    document.addEventListener('mousedown', (e) => {
        if (themePopup.style.display === 'block' && !themePopup.contains(e.target) && e.target !== themeBtn && e.target !== themePanelBtn) {
            closeThemePopup();
        }
    });

    // Example palettes (Material, Flat UI, Tailwind inspired)
    const colorThemes = [
        {
            name: 'Material',
            colors: ['#2196f3', '#e91e63', '#ffeb3b', '#4caf50', '#ff9800', '#9c27b0']
        },
        {
            name: 'Flat UI',
            colors: ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#e74c3c']
        },
        {
            name: 'Tailwind',
            colors: ['#0ea5e9', '#f59e42', '#10b981', '#f43f5e', '#6366f1', '#fbbf24']
        },
        {
            name: 'Dark',
            colors: ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4', '#22223b']
        },
        {
            name: 'Solarized',
            colors: ['#002b36', '#073642', '#586e75', '#b58900', '#cb4b16', '#2aa198', '#859900']
        },
        {
            name: 'Pastel',
            colors: ['#ffd6e0', '#e2f0cb', '#b5ead7', '#c7ceea', '#ffdac1', '#ffb7b2']
        },
        {
            name: 'Nord',
            colors: ['#2e3440', '#3b4252', '#434c5e', '#4c566a', '#8fbcbb', '#88c0d0', '#81a1c1', '#5e81ac']
        },
        {
            name: 'Monokai',
            colors: ['#272822', '#f92672', '#a6e22e', '#fd971f', '#66d9ef', '#f8f8f2', '#75715e']
        },
        {
            name: 'Vibrant',
            colors: ['#ff1744', '#f50057', '#d500f9', '#651fff', '#2979ff', '#00e676', '#ffd600']
        },
        {
            name: 'Muted',
            colors: ['#b0bec5', '#90a4ae', '#bdbdbd', '#a1887f', '#bcaaa4', '#cfd8dc']
        },
        {
            name: 'Grayscale',
            colors: ['#111', '#333', '#555', '#777', '#aaa', '#ccc', '#eee']
        },
        {
            name: 'Retro',
            colors: ['#f4e285', '#f4a259', '#5b8e7d', '#bc4b51', '#c9cba3', '#8cb369']
        },
        {
            name: 'Rainbow',
            colors: ['#ff0000', '#ff9900', '#ffee00', '#33cc33', '#0099ff', '#6633cc', '#cc33cc']
        },
        {
            name: 'Autumn',
            colors: ['#d2691e', '#ff7f50', '#ffb347', '#ffd700', '#b22222', '#8b4513']
        },
        {
            name: 'Spring',
            colors: ['#f7cac9', '#92a8d1', '#b5ead7', '#ffdac1', '#e2f0cb', '#c7ceea']
        },
        {
            name: 'Ocean',
            colors: ['#011f4b', '#03396c', '#005b96', '#6497b1', '#b3cde0', '#e0f7fa']
        },
        {
            name: 'Magic Key',
            colors: ['#2B2622', '#F9DEA2', '#8C8C8C', '#B5A642', '#FFFFFF', '#F9DEA2']
        }
    ];

    // Render swatches
    function renderThemeSwatches() {
        const swatches = themePopup.querySelector('#theme-swatches');
        swatches.innerHTML = '';
        swatches.style.gap = '0'; // Remove parent gap
        colorThemes.forEach((theme, idx) => {
            const row = document.createElement('div');
            row.setAttribute('tabindex', '0');
            row.setAttribute('role', 'button');
            row.setAttribute('aria-label', `Apply ${theme.name} theme`);
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.cursor = 'pointer';
            row.style.outline = 'none';
            row.style.gap = '4px';
            row.style.padding = '2px 0';
            row.addEventListener('click', () => applyTheme(idx));
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    applyTheme(idx);
                }
            });
            // Palette preview bar
            const previewBar = document.createElement('div');
            previewBar.style.display = 'flex';
            previewBar.style.height = '18px'; // Even smaller
            previewBar.style.borderRadius = '4px';
            previewBar.style.overflow = 'hidden';
            previewBar.style.boxShadow = '0 0 0 1px #ccc';
            theme.colors.forEach(color => {
                const swatch = document.createElement('div');
                swatch.style.width = `${100 / theme.colors.length}%`;
                swatch.style.height = '100%';
                swatch.style.background = color;
                previewBar.appendChild(swatch);
            });
            row.appendChild(previewBar);
            const label = document.createElement('span');
            label.textContent = theme.name;
            label.style.marginLeft = '8px';
            row.appendChild(label);
            swatches.appendChild(row);
        });
    }

    // Utility: get best contrast color (black or white) for a given bg (hex or rgb/rgba)
    function getContrastYIQ(color) {
        let hexcolor = color;
        // Handle rgb/rgba
        if (hexcolor.startsWith('rgb')) {
            const rgb = hexcolor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
                const [r, g, b] = rgb;
                const yiq = ((+r)*299+(+g)*587+(+b)*114)/1000;
                return (yiq >= 128) ? '#111' : '#fff';
            }
            return '#111';
        }
        // Handle hex
        hexcolor = hexcolor.replace('#', '');
        if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(x => x + x).join('');
        if (hexcolor.length !== 6) return '#111';
        const r = parseInt(hexcolor.substr(0,2),16);
        const g = parseInt(hexcolor.substr(2,2),16);
        const b = parseInt(hexcolor.substr(4,2),16);
        const yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? '#111' : '#fff';
    }

    // Apply theme to canvas and all elements
    function applyTheme(idx) {
        currentThemeIndex = idx;
        savedProjectThemeIndex = idx;
        const theme = colorThemes[idx];
        if (!theme) return;
        // Set canvas background
        canvas.style.background = theme.colors[0];
        // Check if override/reset options are selected
        const forceOverride = themePopup.querySelector('#force-theme-override').checked;
        const resetAnimations = themePopup.querySelector('#reset-animations').checked;
        // Set all element backgrounds (cycle through theme colors)
        const elements = canvas.querySelectorAll('.element');
        elements.forEach((el, i) => {
            if (resetAnimations) {
                // --- Clear all intervals for this element (including gradients/animations/color transitions) ---
                clearAllIntervalsForElement(el);
                // --- Remove any gradient/animation/color transition dataset and style ---
                delete el.dataset.colorTransition;
                delete el.dataset.colorGradient;
                delete el.dataset.elementAnimation;
                el.style.background = '';
                el.style.backgroundColor = '';
                el.style.transform = '';
            }
            // --- Set background color ---
            let bgColor = forceOverride
                ? theme.colors[(i + 1) % theme.colors.length]
                : (!el.style.backgroundColor || el.style.backgroundColor === '' || el.style.backgroundColor === 'rgba(43, 38, 34, 0)')
                    ? theme.colors[(i + 1) % theme.colors.length]
                    : el.style.backgroundColor;
            el.style.backgroundColor = bgColor;
            // --- Set text color for all descendants ---
            const allTextNodes = el.querySelectorAll('.editable, h1, h2, h3, h4, h5, h6, p, span, div, strong, em, b, i, u');
            const contrastColor = getContrastYIQ(bgColor);
            allTextNodes.forEach(txt => {
                txt.style.color = contrastColor;
            });
            // --- Set SVG fill/stroke ---
            const svg = el.querySelector('svg');
            if (svg) {
                const shapes = svg.querySelectorAll('rect, circle, line, polygon');
                shapes.forEach((shape, k) => {
                    if (shape.tagName === 'line') {
                        shape.setAttribute('stroke', theme.colors[(k + 2) % theme.colors.length]);
                    } else {
                        shape.setAttribute('fill', theme.colors[(k + 2) % theme.colors.length]);
                    }
                });
            }
            // --- Set button background/text color ---
            const btns = el.querySelectorAll('button');
            btns.forEach((btn, m) => {
                btn.style.backgroundColor = theme.colors[(m + 3) % theme.colors.length];
                btn.style.color = getContrastYIQ(theme.colors[(m + 3) % theme.colors.length]);
            });
            // --- Set border color ---
            el.style.borderColor = theme.colors[(i + 2) % theme.colors.length];
        });
        // Save theme in state for undo/redo
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    }

    // Initial render
    renderThemeSwatches();

    // --- Templates popup ---
    function applyTemplate(templateKey) {
        const tpl = builtinTemplates[templateKey];
        if (!tpl) return;
        frames = [];
        const frameCount = tpl.frames || 1;
        for (let i = 0; i < frameCount; i++) {
            const built = tpl.build(i) || { elements: [], canvas: {} };
            ensureFrameDuration(built);
            frames.push(built);
        }
        currentFrameIndex = 0;
        loadFrame(0);
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    }

    function openTemplatesPopup() {
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.style.display = 'block';
        popup.style.zIndex = '15000';
        popup.innerHTML = `
            <h3>Select a template</h3>
            <button data-template="filmStoryboard">Film storyboard</button>
            <button data-template="eventWelcome">Event welcome signboard</button>
            <button data-template="groupPrototyping">Group prototyping</button>
            <button data-template="designThinking">Design thinking</button>
            <button data-template="classroomCollab">Classroom collaboration</button>
            <button class="cancel-btn">Cancel</button>
        `;
        document.body.appendChild(popup);
        popup.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            if (btn.classList.contains('cancel-btn')) {
                document.body.removeChild(popup);
                return;
            }
            const key = btn.getAttribute('data-template');
            if (key) applyTemplate(key);
            document.body.removeChild(popup);
        });
    }

    function applyLibraryPreset(presetKey) {
        const preset = elementLibraryPresets.find(p => p.key === presetKey);
        if (!preset || !canvas) return;
        const created = [];
        preset.elements.forEach(item => {
            const element = createElementFromManager(item.type);
            applyLibraryElementStyles(element, item);
            if (item.shapeColor) applyShapeColor(element, item.shapeColor, item.strokeWidth);
            canvas.appendChild(element);
            attachElementInteractions(element);
            created.push(element);
        });
        if (created.length) setSelectedElement(created[0]);
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    }

    function applyLibraryElementStyles(element, item) {
        if (!element || !item) return;
        const cw = canvasDesignWidth || 1920;
        const ch = canvasDesignHeight || 1080;
        const left = typeof item.x === 'number' ? Math.round((item.x / 100) * cw) : 80;
        const top = typeof item.y === 'number' ? Math.round((item.y / 100) * ch) : 80;
        const width = typeof item.w === 'number' ? Math.round((item.w / 100) * cw) : 320;
        const height = typeof item.h === 'number' ? Math.round((item.h / 100) * ch) : 140;

        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;

        if (typeof item.opacity === 'number') element.style.opacity = String(item.opacity);
        if (item.backgroundColor !== undefined) element.style.backgroundColor = item.backgroundColor;
        if (item.color) element.style.color = item.color;
        if (item.fontSize) element.style.fontSize = item.fontSize;
        if (item.fontFamily) element.style.fontFamily = item.fontFamily;
        if (item.fontWeight) element.style.fontWeight = item.fontWeight;
        if (item.textAlign) element.style.textAlign = item.textAlign;
        if (item.border) element.style.border = item.border;
        if (item.borderColor) element.style.borderColor = item.borderColor;
        if (item.borderRadius) element.style.borderRadius = item.borderRadius;
        if (item.boxShadow) element.style.boxShadow = item.boxShadow;
        if (item.transform) element.style.transform = item.transform;
        if (item.transformOrigin) element.style.transformOrigin = item.transformOrigin;
        if (item.display) element.style.display = item.display;
        if (item.alignItems) element.style.alignItems = item.alignItems;
        if (item.justifyContent) element.style.justifyContent = item.justifyContent;
        if (item.overflow) element.style.overflow = item.overflow;
        if (item.backdropFilter) element.style.backdropFilter = item.backdropFilter;
        if (item.webkitBackdropFilter) element.style.webkitBackdropFilter = item.webkitBackdropFilter;
        if (item.filter) element.style.filter = item.filter;
        if (item.zIndex) element.style.zIndex = String(item.zIndex);

        if (item.text) {
            const target = element.querySelector('h2, p, button');
            if (target) target.textContent = item.text;
        }
    }

    function applyShapeColor(element, color, strokeWidth) {
        if (!element || !color) return;
        const rect = element.querySelector('rect');
        const circle = element.querySelector('circle');
        const polygon = element.querySelector('polygon');
        const line = element.querySelector('line');
        if (rect) rect.setAttribute('fill', color);
        if (circle) circle.setAttribute('fill', color);
        if (polygon) polygon.setAttribute('fill', color);
        if (line) {
            line.setAttribute('stroke', color);
            if (strokeWidth) line.setAttribute('stroke-width', String(strokeWidth));
        }
    }

    function openElementLibraryPopup() {
        const popup = document.createElement('div');
        popup.className = 'popup library-popup';
        popup.style.display = 'block';
        popup.style.zIndex = '15000';
        const cards = elementLibraryPresets.map(p => `
            <button class="library-card" data-library="${p.key}">
                <span class="lib-title">${p.name}</span>
                <span class="lib-desc">${p.desc}</span>
            </button>
        `).join('');
        popup.innerHTML = `
            <div class="library-header">
                <h3>Element Library</h3>
                <p>Insert a preset block into the current frame.</p>
            </div>
            <div class="library-grid">${cards}</div>
            <div class="library-actions">
                <button class="cancel-btn" type="button">Close</button>
            </div>
        `;
        document.body.appendChild(popup);
        popup.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('.cancel-btn');
            if (closeBtn) {
                document.body.removeChild(popup);
                return;
            }
            const card = e.target.closest('[data-library]');
            if (!card) return;
            const key = card.getAttribute('data-library');
            if (key) applyLibraryPreset(key);
        });
    }

    function openResizePopup() {
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.style.display = 'block';
        popup.style.zIndex = '15000';
        popup.innerHTML = `
            <h3>Smart Resize</h3>
            <label for="resize-preset">Aspect ratio preset</label>
            <select id="resize-preset">
                <option value="1920x1080">16:9 (1920 x 1080)</option>
                <option value="1080x1920">9:16 (1080 x 1920)</option>
                <option value="1440x1080">4:3 (1440 x 1080)</option>
                <option value="1080x1080">1:1 (1080 x 1080)</option>
            </select>
            <label for="resize-width">Width</label>
            <input id="resize-width" type="number" min="320" max="3840" value="${canvasDesignWidth || 1920}">
            <label for="resize-height">Height</label>
            <input id="resize-height" type="number" min="320" max="3840" value="${canvasDesignHeight || 1080}">
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
                <button id="resize-apply-btn">Apply</button>
                <button class="cancel-btn" type="button">Cancel</button>
            </div>
        `;
        document.body.appendChild(popup);
        const presetSelect = popup.querySelector('#resize-preset');
        const widthInput = popup.querySelector('#resize-width');
        const heightInput = popup.querySelector('#resize-height');
        const applyBtn = popup.querySelector('#resize-apply-btn');

        if (presetSelect) {
            presetSelect.addEventListener('change', () => {
                const [w, h] = presetSelect.value.split('x').map(n => parseInt(n, 10));
                if (!isNaN(w) && widthInput) widthInput.value = String(w);
                if (!isNaN(h) && heightInput) heightInput.value = String(h);
            });
        }

        popup.addEventListener('click', (e) => {
            const cancel = e.target.closest('.cancel-btn');
            if (cancel) {
                document.body.removeChild(popup);
            }
        });

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const w = parseInt(widthInput && widthInput.value, 10);
                const h = parseInt(heightInput && heightInput.value, 10);
                if (!isNaN(w) && !isNaN(h)) {
                    smartResizeCanvas(w, h);
                    document.body.removeChild(popup);
                }
            });
        }
    }

    const variationState = {
        density: 'maximal',
        symmetry: 'asym',
        motion: 'energetic',
        contrast: 'high',
        palette: 'vivid',
        typography: 'mixed'
    };

    function openVariationPopup() {
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.style.display = 'block';
        popup.style.zIndex = '15000';
        popup.innerHTML = `
            <h3>Variation Settings</h3>
            <div class="variation-grid">
                <div class="variation-row">
                    <label for="var-density">Layout density</label>
                    <select id="var-density">
                        <option value="sparse">Sparse</option>
                        <option value="balanced">Balanced</option>
                        <option value="maximal">Maximal</option>
                    </select>
                </div>
                <div class="variation-row">
                    <label for="var-symmetry">Symmetry</label>
                    <select id="var-symmetry">
                        <option value="centered">Centered</option>
                        <option value="balanced">Balanced</option>
                        <option value="asym">Asymmetric</option>
                    </select>
                </div>
                <div class="variation-row">
                    <label for="var-motion">Motion intensity</label>
                    <select id="var-motion">
                        <option value="subtle">Subtle</option>
                        <option value="balanced">Balanced</option>
                        <option value="energetic">Energetic</option>
                    </select>
                </div>
                <div class="variation-row">
                    <label for="var-contrast">Contrast</label>
                    <select id="var-contrast">
                        <option value="soft">Soft</option>
                        <option value="balanced">Balanced</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <div class="variation-row">
                    <label for="var-palette">Palette</label>
                    <select id="var-palette">
                        <option value="muted">Muted</option>
                        <option value="balanced">Balanced</option>
                        <option value="vivid">Vivid</option>
                    </select>
                </div>
                <div class="variation-row">
                    <label for="var-typography">Typography</label>
                    <select id="var-typography">
                        <option value="serif">Serif</option>
                        <option value="sans">Sans</option>
                        <option value="display">Display</option>
                        <option value="mixed">Mixed</option>
                    </select>
                </div>
            </div>
            <div class="variation-actions">
                <button id="var-apply-btn" type="button">Apply</button>
                <button class="cancel-btn" type="button">Close</button>
            </div>
        `;
        document.body.appendChild(popup);

        const density = popup.querySelector('#var-density');
        const symmetry = popup.querySelector('#var-symmetry');
        const motion = popup.querySelector('#var-motion');
        const contrast = popup.querySelector('#var-contrast');
        const palette = popup.querySelector('#var-palette');
        const typography = popup.querySelector('#var-typography');

        if (density) density.value = variationState.density;
        if (symmetry) symmetry.value = variationState.symmetry;
        if (motion) motion.value = variationState.motion;
        if (contrast) contrast.value = variationState.contrast;
        if (palette) palette.value = variationState.palette;
        if (typography) typography.value = variationState.typography;

        const applyBtn = popup.querySelector('#var-apply-btn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                if (density) variationState.density = density.value;
                if (symmetry) variationState.symmetry = symmetry.value;
                if (motion) variationState.motion = motion.value;
                if (contrast) variationState.contrast = contrast.value;
                if (palette) variationState.palette = palette.value;
                if (typography) variationState.typography = typography.value;
                document.body.removeChild(popup);
            });
        }

        popup.addEventListener('click', (e) => {
            const cancel = e.target.closest('.cancel-btn');
            if (cancel) document.body.removeChild(popup);
        });
    }

    function buildVariationPrompt() {
        return [
            'DESIGN VARIATION SETTINGS:',
            `- Density: ${variationState.density}`,
            `- Symmetry: ${variationState.symmetry}`,
            `- Motion: ${variationState.motion}`,
            `- Contrast: ${variationState.contrast}`,
            `- Palette: ${variationState.palette}`,
            `- Typography: ${variationState.typography}`,
            'Use these as strong guidance unless they conflict with the sign\'s purpose.'
        ].join('\n');
    }

    function smartResizeCanvas(targetW, targetH) {
        if (!canvas) return;
        const oldW = canvasDesignWidth || 1920;
        const oldH = canvasDesignHeight || 1080;
        if (!oldW || !oldH) return;
        const scaleX = targetW / oldW;
        const scaleY = targetH / oldH;
        const scaleMin = Math.min(scaleX, scaleY);

        const elements = Array.from(canvas.querySelectorAll('.element'));
        elements.forEach(el => {
            const x = parseFloat(el.style.left) || 0;
            const y = parseFloat(el.style.top) || 0;
            const w = parseFloat(el.style.width) || 100;
            const h = parseFloat(el.style.height) || 50;
            const cx = x + w / 2;
            const cy = y + h / 2;

            const anchorX = cx < oldW * 0.33 ? 'left' : cx > oldW * 0.66 ? 'right' : 'center';
            const anchorY = cy < oldH * 0.33 ? 'top' : cy > oldH * 0.66 ? 'bottom' : 'middle';

            const newW = Math.round(w * scaleMin);
            const newH = Math.round(h * scaleMin);
            let newX;
            let newY;

            if (anchorX === 'left') {
                newX = Math.round((x / oldW) * targetW);
            } else if (anchorX === 'right') {
                const distRight = oldW - (x + w);
                newX = Math.round(targetW - (distRight * scaleMin) - newW);
            } else {
                newX = Math.round((cx / oldW) * targetW - newW / 2);
            }

            if (anchorY === 'top') {
                newY = Math.round((y / oldH) * targetH);
            } else if (anchorY === 'bottom') {
                const distBottom = oldH - (y + h);
                newY = Math.round(targetH - (distBottom * scaleMin) - newH);
            } else {
                newY = Math.round((cy / oldH) * targetH - newH / 2);
            }

            newX = Math.max(0, Math.min(targetW - newW, newX));
            newY = Math.max(0, Math.min(targetH - newH, newY));

            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
            el.style.width = `${newW}px`;
            el.style.height = `${newH}px`;

            const fontSize = parseFloat(el.style.fontSize);
            if (!isNaN(fontSize)) {
                el.style.fontSize = `${Math.max(10, Math.round(fontSize * scaleMin))}px`;
            }
            if (el.style.borderRadius && el.style.borderRadius.endsWith('px')) {
                const br = parseFloat(el.style.borderRadius);
                if (!isNaN(br)) {
                    el.style.borderRadius = `${Math.max(0, Math.round(br * scaleMin))}px`;
                }
            }
        });

        setCanvasDesignSize(targetW, targetH);
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    }

    function applyImportedData(imported, { alertOnSuccess = true, isDemo = false } = {}) {
        if (imported && imported.project) {
            demoModeActive = isDemo;
            frames = Array.isArray(imported.frames) && imported.frames.length
                ? imported.frames
                : [snapshotCurrentCanvas()];
            const maxIndex = Math.max(0, frames.length - 1);
            const desiredIndex = typeof imported.currentFrameIndex === 'number' ? imported.currentFrameIndex : 0;
            currentFrameIndex = Math.min(Math.max(0, desiredIndex), maxIndex);
            savedProjectThemeIndex = typeof imported.themeIndex === 'number' ? imported.themeIndex : null;
            if (imported.canvasSize && imported.canvasSize.width && imported.canvasSize.height) {
                const parsedWidth = parseInt(imported.canvasSize.width, 10);
                const parsedHeight = parseInt(imported.canvasSize.height, 10);
                if (isFinite(parsedWidth) && isFinite(parsedHeight)) {
                    setCanvasDesignSize(parsedWidth, parsedHeight);
                }
            }
            loadFrame(currentFrameIndex);
            if (savedProjectThemeIndex !== null) {
                applyTheme(savedProjectThemeIndex);
            }
            if (alertOnSuccess) alert('Project loaded!');
            if (typeof saveState === 'function' && canvas) saveState(canvas);
            return true;
        }
        if (imported && imported.elements) {
            demoModeActive = isDemo;
            if (Array.isArray(imported.elements)) {
                imported.elements.forEach(elData => {
                    if (!elData.dataset) elData.dataset = {};
                    if (!elData.dataset.uid && !elData.dataset['uid']) {
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                        const uid = Array.from({ length: 9 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
                        elData.dataset.uid = uid;
                    }
                });
            }
            frames = [imported];
            currentFrameIndex = 0;
            loadFrame(0);
            if (alertOnSuccess) alert('Layout loaded!');
            if (typeof saveState === 'function' && canvas) saveState(canvas);
            return true;
        }
        if (alertOnSuccess) alert('Invalid project or layout file.');
        return false;
    }

    // Restore event listeners for load, clear, and export buttons
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            fileInput.click();
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        });
        // Restore all dataset attributes on import
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imported = JSON.parse(e.target.result);
                    applyImportedData(imported);
                };
                reader.readAsText(file);
            }
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear the canvas? This cannot be undone.')) {
                // Also clear all per-element state and intervals
                if (typeof clearState === 'function') {
                    clearState(canvas, colorTransitionIntervals, gradientAnimIntervals);
                }
                canvas.innerHTML = '';
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            }
        });
    }
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            // Export as JSON: serialize all elements and their properties
            const elements = Array.from(canvas.querySelectorAll('.element')).map(el => {
                // Get bounding rect relative to canvas
                const rect = el.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();
                // Serialize styles and content
                return {
                    type: el.getAttribute('data-type') || null,
                    left: el.style.left,
                    top: el.style.top,
                    width: el.style.width,
                    height: el.style.height,
                    backgroundColor: el.style.backgroundColor,
                    color: el.style.color,
                    fontSize: el.style.fontSize,
                    fontFamily: el.style.fontFamily,
                    zIndex: el.style.zIndex,
                    border: el.style.border,
                    borderColor: el.style.borderColor,
                    rotation: el.dataset.rotation || 0,
                    innerHTML: el.innerHTML,
                    dataset: { ...el.dataset },
                };
            });
            const exportData = {
                project: true,
                frames,
                currentFrameIndex,
                themeIndex: savedProjectThemeIndex,
                canvasSize: {
                    width: canvas.style.width,
                    height: canvas.style.height
                }
            };
            const json = JSON.stringify(exportData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mocking-board-export.json';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        });
    }
    if (templatesBtn) {
        templatesBtn.addEventListener('click', () => {
            openTemplatesPopup();
        });
    }

    // --- Apply Color Transition: Modular per-element state and animation ---
    applyTransitionBtn.addEventListener('click', () => {
        if (selectedElement) {
            const startColor = startColorInput.value;
            const endColor = endColorInput.value;
            const transitionTime = parseFloat(transitionTimeInput.value) || 2;
            const uid = getElementUID(selectedElement);
            if (!uid) return;
            // Get any existing state so we can keep non-background fields
            const existingState = getElementAnimationState(uid) || {};
            // Stop any existing gradient animation for this element
            if (gradientAnimIntervals.has(uid)) {
                clearInterval(gradientAnimIntervals.get(uid));
                gradientAnimIntervals.delete(uid);
            }
            // Build modular animation state (color mode wins over gradient mode)
            const animationState = {
                ...existingState,
                // Color transition on
                colorAnimActive: true,
                colorAnimStartColor: startColor,
                colorAnimEndColor: endColor,
                colorAnimTransitionTime: transitionTime,
                // Explicitly turn off gradient animation for background so modes don't clash
                gradientAnimActive: false
            };
            setElementAnimationState(uid, animationState);
            // Ensure we are using solid background color (not a leftover gradient)
            selectedElement.style.background = '';
            // Start and restore animation using modular logic
            restoreElementAnimation(selectedElement, animationState, { color: colorTransitionIntervals, gradient: gradientAnimIntervals }, uid);
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
        closeColorTransitionPopup();
    });

    // --- Apply Color Gradient: Modular per-element state and animation ---
    applyGradientBtn.addEventListener('click', () => {
        if (selectedElement) {
            const startColor = startGradientColorInput.value;
            const endColor = endGradientColorInput.value;
            const direction = gradientDirectionSelect.value || 'to right';
            const gradientType = gradientTypeSelect ? gradientTypeSelect.value : 'linear';
            const animStyle = gradientAnimSelect ? gradientAnimSelect.value : 'none';
            const uid = getElementUID(selectedElement);
            if (!uid) return;
            // Get any existing state so we can keep non-background fields
            const existingState = getElementAnimationState(uid) || {};
            // Stop any existing color transition animation for this element
            if (colorTransitionIntervals.has(uid)) {
                clearInterval(colorTransitionIntervals.get(uid));
                colorTransitionIntervals.delete(uid);
            }
            // Build modular animation state (gradient mode wins over color mode)
            const animationState = {
                ...existingState,
                gradientAnimActive: !!(animStyle && animStyle !== 'none'),
                gradientStartColor: startColor,
                gradientEndColor: endColor,
                gradientDirection: direction,
                gradientType: gradientType,
                gradientAnimStyle: animStyle,
                // Turn off color transition so they don't fight for the background
                colorAnimActive: false
            };
            setElementAnimationState(uid, animationState);
            // --- Immediately set static gradient background for visual feedback ---
            let gradient = '';
            if (gradientType === 'radial') {
                gradient = `radial-gradient(circle, ${startColor}, ${endColor})`;
            } else if (gradientType === 'conic') {
                let angle = 'from 0deg';
                if (direction && direction.match(/\d+deg/)) {
                    angle = `from ${direction}`;
                }
                gradient = `conic-gradient(${angle}, ${startColor}, ${endColor})`;
            } else {
                gradient = `linear-gradient(${direction}, ${startColor}, ${endColor})`;
            }
            selectedElement.style.background = gradient;
            // Clear plain background color so the gradient is visually authoritative
            selectedElement.style.backgroundColor = '';
            // Start and restore animation using modular logic
            restoreElementAnimation(selectedElement, animationState, { color: colorTransitionIntervals, gradient: gradientAnimIntervals }, uid);
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
        closeColorGradientPopup();
    });

    // --- Lock/Unlock Functionality ---
    if (lockBtn) {
        lockBtn.addEventListener('click', () => {
            isLocked = !isLocked;
            lockBtn.classList.toggle('active', isLocked);
            // Hide or show all resize handles
            const handles = canvas.querySelectorAll('.resize-handle');
            handles.forEach(handle => {
                handle.style.display = isLocked ? 'none' : '';
            });
            // Hide or show all rotate handles
            const rotateHandles = canvas.querySelectorAll('.rotate-handle');
            rotateHandles.forEach(handle => {
                handle.style.display = isLocked ? 'none' : '';
            });
            // Optionally visually indicate locked state
            canvas.classList.toggle('locked', isLocked);
        });
    }

    // --- Toggle Grid Functionality ---
    if (backgroundBtn) {
        backgroundBtn.addEventListener('click', () => {
            // Open a color picker dialog for canvas background
            const picker = document.createElement('input');
            picker.type = 'color';
            picker.value = rgbToHex(window.getComputedStyle(canvas).backgroundColor || '#ffffff');
            picker.style.position = 'fixed';
            picker.style.left = '-9999px';
            document.body.appendChild(picker);
            picker.click();
            picker.addEventListener('input', (e) => {
                canvas.style.background = e.target.value;
                document.body.removeChild(picker);
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            });
            picker.addEventListener('blur', () => {
                if (document.body.contains(picker)) document.body.removeChild(picker);
            });
        });
    }
    // Helper: Convert rgb/rgba to hex
    function rgbToHex(rgb) {
        if (!rgb) return '#ffffff';
        const result = rgb.match(/\d+/g);
        if (!result || result.length < 3) return '#ffffff';
        return (
            '#' +
            ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + parseInt(result[2]))
                .toString(16)
                .slice(1)
        );
    }

    // On initial load, set resize handle visibility based on lock state
    function updateResizeHandles() {
        const handles = canvas.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            handle.style.display = isLocked ? 'none' : '';
        });
    }
    updateResizeHandles();
    
    // Keyboard shortcuts: undo/redo, delete, and nudge selected element
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo(canvas, reattachEventListeners, colorTransitionIntervals, gradientAnimIntervals);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
            e.preventDefault();
            redo(canvas, reattachEventListeners, colorTransitionIntervals, gradientAnimIntervals);
            return;
        }

        if (isLocked) return;

        if (!selectedElement) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            clearAllIntervalsForElement(selectedElement);
            selectedElement.remove();
            setSelectedElement(null);
            if (typeof saveState === 'function' && canvas) saveState(canvas);
            return;
        }

        const step = e.shiftKey ? 10 : 2;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            const currentLeft = parseInt(selectedElement.style.left || '0', 10) || 0;
            const currentTop = parseInt(selectedElement.style.top || '0', 10) || 0;
            let newLeft = currentLeft;
            let newTop = currentTop;
            if (e.key === 'ArrowLeft') newLeft -= step;
            if (e.key === 'ArrowRight') newLeft += step;
            if (e.key === 'ArrowUp') newTop -= step;
            if (e.key === 'ArrowDown') newTop += step;
            if (gridEnabled) {
                const gridSize = 20;
                newLeft = Math.round(newLeft / gridSize) * gridSize;
                newTop = Math.round(newTop / gridSize) * gridSize;
            }
            selectedElement.style.left = `${newLeft}px`;
            selectedElement.style.top = `${newTop}px`;
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // GENERATE SIGN (AI) — conversational 2-pass flow
    // ═══════════════════════════════════════════════════════════════

    const gsPanel     = document.getElementById('generate-sign-panel');
    const gsChat      = document.getElementById('gs-chat');
    const gsInput     = document.getElementById('gs-input');
    const gsSendBtn   = document.getElementById('gs-send-btn');
    const gsMicBtn    = document.getElementById('gs-mic-btn');
    const gsCloseBtn  = document.getElementById('gs-close-btn');
    const gsStatus    = document.getElementById('gs-status');
    const generateSignBtn = document.getElementById('generate-sign-btn');
    const gsModeReplace = document.getElementById('gs-mode-replace');
    const gsModeAdd     = document.getElementById('gs-mode-add');

    // Conversation state machine: idle → describing → clarifying → generating → done
    let gsState = 'idle';
    let gsUserDescription = '';
    let gsClarifyQuestions = [];
    let gsClarifyAnswers = [];
    let gsClarifyIndex = 0;
    let gsInsertMode = 'replace'; // 'replace' | 'add'

    // Mode toggle wiring
    if (gsModeReplace) gsModeReplace.addEventListener('click', () => {
        gsInsertMode = 'replace';
        gsModeReplace.classList.add('gs-mode-btn--active');
        gsModeAdd?.classList.remove('gs-mode-btn--active');
    });
    if (gsModeAdd) gsModeAdd.addEventListener('click', () => {
        gsInsertMode = 'add';
        gsModeAdd.classList.add('gs-mode-btn--active');
        gsModeReplace?.classList.remove('gs-mode-btn--active');
    });

    // ── Helpers ──

    function gsAddMsg(text, role = 'ai') {
        if (!gsChat) return;
        const div = document.createElement('div');
        div.className = `gs-msg gs-msg--${role}`;
        if (role === 'status') {
            div.textContent = text;
        } else {
            const p = document.createElement('p');
            p.textContent = text;
            div.appendChild(p);
        }
        gsChat.appendChild(div);
        gsChat.scrollTop = gsChat.scrollHeight;
        return div;
    }

    function gsAddLoading() {
        const div = document.createElement('div');
        div.className = 'gs-msg gs-msg--ai gs-loading-msg';
        div.innerHTML = '<div class="gs-loading"><span></span><span></span><span></span></div>';
        gsChat?.appendChild(div);
        gsChat.scrollTop = gsChat.scrollHeight;
        return div;
    }

    function gsRemoveLoading() {
        gsChat?.querySelector('.gs-loading-msg')?.remove();
    }

    function gsSetInputEnabled(enabled) {
        if (gsInput) gsInput.disabled = !enabled;
        if (gsSendBtn) gsSendBtn.disabled = !enabled;
    }

    function gsReset() {
        gsState = 'idle';
        gsUserDescription = '';
        gsClarifyQuestions = [];
        gsClarifyAnswers = [];
        gsClarifyIndex = 0;
        if (gsChat) {
            gsChat.innerHTML = '';
            gsAddMsg('Describe the signage you need \u2014 no sign-in, just results.');
        }
        gsSetInputEnabled(true);
        if (gsInput) { gsInput.value = ''; gsInput.placeholder = 'e.g. Quick welcome signage for our school open house'; }
        if (gsStatus) gsStatus.textContent = '';
    }

    // ── API call through proxy ──

    async function gsCallAPI(messages, { model, temperature, maxTokens } = {}) {
        const proxyUrl = getProxyUrl();
        const resp = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model || MODEL,
                temperature: temperature ?? 0.7,
                max_tokens: maxTokens || 4096,
                messages,
            }),
        });
        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`API ${resp.status}: ${errText.slice(0, 200)}`);
        }
        const data = await resp.json();
        // Support both proxy-forwarded OpenAI shape and raw content
        const content = data.choices?.[0]?.message?.content || data.content || '';
        return content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    // ── Pass 1: Send description, get clarifying questions ──

    async function gsPass1(description) {
        gsState = 'clarifying';
        gsUserDescription = description;
        gsAddMsg(description, 'user');
        gsSetInputEnabled(false);
        const loadingEl = gsAddLoading();

        try {
            const raw = await gsCallAPI([
                { role: 'system', content: CLARIFY_SYSTEM_PROMPT },
                { role: 'user',   content: description },
            ]);

            gsRemoveLoading();
            let parsed;
            try { parsed = JSON.parse(raw); } catch { throw new Error('Couldn\u2019t understand the response. Try again.'); }

            gsClarifyQuestions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 3) : [];
            if (gsClarifyQuestions.length === 0) throw new Error('No questions received. Try again.');

            gsClarifyAnswers = new Array(gsClarifyQuestions.length).fill('');
            gsClarifyIndex = 0;
            gsRenderSingleQuestion();

        } catch (err) {
            gsRemoveLoading();
            gsAddMsg('Error: ' + err.message, 'status');
            gsState = 'idle';
            gsSetInputEnabled(true);
        }
    }

    // ── Render clarifying questions as interactive form ──

    function gsRenderSingleQuestion() {
        const question = gsClarifyQuestions[gsClarifyIndex];
        if (!question) {
            gsSubmitAnswers();
            return;
        }

        const container = document.createElement('div');
        container.className = 'gs-msg gs-msg--ai';

        const intro = document.createElement('p');
        intro.textContent = `Quick question (${gsClarifyIndex + 1} of ${gsClarifyQuestions.length}):`;
        container.appendChild(intro);

        const qLabel = document.createElement('label');
        qLabel.className = 'gs-q-btn';
        qLabel.textContent = question;
        container.appendChild(qLabel);

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'gs-q-answer-input';
        input.placeholder = 'Your answer\u2026';
        input.value = gsClarifyAnswers[gsClarifyIndex] || '';
        input.addEventListener('input', () => {
            gsClarifyAnswers[gsClarifyIndex] = input.value;
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                gsAskMore();
            }
        });
        container.appendChild(input);

        const submitRow = document.createElement('div');
        submitRow.className = 'gs-q-submit-row';
        const createBtn = document.createElement('button');
        createBtn.className = 'gs-q-submit-btn';
        createBtn.textContent = 'Create Sign';
        createBtn.addEventListener('click', gsSubmitAnswers);
        const askBtn = document.createElement('button');
        askBtn.className = 'gs-q-submit-btn gs-q-secondary';
        askBtn.textContent = 'Ask Me More';
        askBtn.addEventListener('click', gsAskMore);
        submitRow.appendChild(createBtn);
        submitRow.appendChild(askBtn);
        container.appendChild(submitRow);

        gsChat?.appendChild(container);
        gsChat.scrollTop = gsChat.scrollHeight;

        setTimeout(() => input.focus(), 100);
    }

    async function gsAskMore() {
        const currentAnswer = (gsClarifyAnswers[gsClarifyIndex] || '').trim();
        gsAddMsg(currentAnswer || '(skip)', 'user');
        gsClarifyIndex += 1;
        if (gsClarifyIndex < gsClarifyQuestions.length) {
            gsRenderSingleQuestion();
            return;
        }
        const loadingEl = gsAddLoading();
        try {
            const nextQ = await gsFetchNextQuestion();
            if (nextQ) {
                gsClarifyQuestions.push(nextQ);
                gsClarifyAnswers.push('');
                gsRenderSingleQuestion();
            } else {
                gsSubmitAnswers();
            }
        } catch (err) {
            gsAddMsg('Error: ' + err.message, 'status');
            gsSubmitAnswers();
        } finally {
            gsRemoveLoading();
        }
    }

    async function gsFetchNextQuestion() {
        const history = gsClarifyQuestions.map((q, i) => {
            const a = (gsClarifyAnswers[i] || '').trim() || '(no answer)';
            return `Q: ${q}\nA: ${a}`;
        }).join('\n\n');
        const systemPrompt = [
            'You are a sign-design assistant.',
            'Ask EXACTLY 1 short, specific follow-up question.',
            'Make it specific to the request and avoid repeating prior questions.',
            'IMPORTANT: The app can generate text, shapes, dividers, gradients, colors, and animations.',
            'It CANNOT fetch photos, add real images, apply glossy finishes, or use external assets.',
            'Avoid questions that imply those capabilities.',
            'Respond ONLY in JSON: {"question":"..."}'
        ].join('\\n');

        const userPrompt = [
            'SIGN REQUEST:',
            gsUserDescription,
            '',
            'PREVIOUS Q&A:',
            history || '(none)'
        ].join('\n');

        const raw = await gsCallAPI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);

        let parsed;
        try { parsed = JSON.parse(raw); } catch { return null; }
        const q = parsed && typeof parsed.question === 'string' ? parsed.question.trim() : '';
        return q || null;
    }

    // ── Pass 2: Send everything, generate the sign ──

    async function gsSubmitAnswers() {
        gsState = 'generating';
        // Disable all question inputs
        gsChat?.querySelectorAll('.gs-q-answer-input').forEach(inp => { inp.disabled = true; });
        gsChat?.querySelectorAll('.gs-q-submit-btn').forEach(btn => { btn.disabled = true; });

        // Build answers summary as user message
        const answerLines = gsClarifyQuestions.map((q, i) => {
            const a = (gsClarifyAnswers[i] || '').trim() || '(no answer)';
            return `Q: ${q}\nA: ${a}`;
        }).join('\n\n');

        gsAddMsg(answerLines, 'user');
        const loadingEl = gsAddLoading();

        try {
            // Use creative boost wrapper + generation model at high temperature
            const variationNotes = buildVariationPrompt();
            const boostedUserContent = wrapUserPrompt(gsUserDescription, `${answerLines}\n\n${variationNotes}`);
            const raw = await gsCallAPI([
                { role: 'system',    content: GENERATE_SYSTEM_PROMPT },
                { role: 'user',      content: boostedUserContent },
            ], { model: GENERATION_MODEL, temperature: 1.1, maxTokens: 4096 });

            gsRemoveLoading();

            // Import via the v2 pipeline — always use 1920×1080 base for consistent layout
            const result = importSignageV2(raw, 1920, 1080);

            if (!result.success) {
                gsAddMsg('Generation failed: ' + (result.errors.join('; ') || 'Invalid output. Try again.'), 'status');
                gsState = 'idle';
                gsSetInputEnabled(true);
                return;
            }

            // Apply to canvas — respect insert mode
            const isReplace = gsInsertMode === 'replace';
            if (isReplace) {
                // Save current frame before wiping
                frames = [];
            } else {
                // Save current canvas state into current frame before appending
                if (frames.length > 0) {
                    frames[currentFrameIndex] = snapshotCurrentCanvas();
                }
            }

            const startFrameIdx = isReplace ? 0 : frames.length;

            result.frames.forEach((renderedFrame, idx) => {
                const isFirstVisible = (isReplace && idx === 0);
                if (isFirstVisible) {
                    canvas.innerHTML = '<div id="grid" class="grid"></div>';
                    canvas.style.background = renderedFrame.background;
                }

                const frameElements = renderedFrame.domElements.map(domEl => {
                    if (isFirstVisible) {
                        canvas.appendChild(domEl);
                        attachElementInteractions(domEl);
                    }
                    return {
                        type: domEl.getAttribute('data-type'),
                        left: domEl.style.left,
                        top: domEl.style.top,
                        width: domEl.style.width,
                        height: domEl.style.height,
                        backgroundColor: domEl.style.backgroundColor,
                        color: domEl.style.color,
                        fontSize: domEl.style.fontSize,
                        fontFamily: domEl.style.fontFamily,
                        zIndex: domEl.style.zIndex || '2',
                        border: domEl.style.border,
                        borderColor: domEl.style.borderColor,
                        rotation: 0,
                        innerHTML: domEl.innerHTML,
                        dataset: { ...domEl.dataset },
                    };
                });

                frames.push({
                    elements: frameElements,
                    canvas: {
                        background: renderedFrame.background,
                        width: (renderedFrame.canvasWidth || 1920) + 'px',
                        height: (renderedFrame.canvasHeight || 1080) + 'px',
                    },
                    duration: renderedFrame.duration || 15,
                });
            });

            // Apply canvas dimensions from the first generated frame
            const firstFrame = result.frames[0];
            if (firstFrame) {
                setCanvasDesignSize(firstFrame.canvasWidth || 1920, firstFrame.canvasHeight || 1080);
            }

            currentFrameIndex = startFrameIdx;
            if (!isReplace && startFrameIdx > 0) {
                // Load the first newly-added frame
                loadFrame(currentFrameIndex);
            }
            reattachEventListeners();
            updateFrameLabel();
            restoreElementAnimations();

            // (center-of-weight removed — user can pan in fullscreen)

            if (typeof saveState === 'function' && canvas) saveState(canvas);

            const addedCount = result.frames.length;
            const totalCount = frames.length;
            const msg = isReplace
                ? `Signage created — ${addedCount} frame(s).`
                : `Added ${addedCount} frame(s) — ${totalCount} total.`;
            gsAddMsg(msg, 'status');
            gsState = 'done';

            // Auto-enter play mode for multi-frame signs
            if (frames.length > 1 && typeof enterPlayMode === 'function') {
                enterPlayMode();
            }

            // Auto close after a beat
            setTimeout(() => {
                if (gsPanel) gsPanel.style.display = 'none';
                gsReset();
            }, 1800);

        } catch (err) {
            gsRemoveLoading();
            gsAddMsg('Error: ' + (err.message || 'Unknown error'), 'status');
            gsState = 'idle';
            gsSetInputEnabled(true);
        }
    }

    // ── Send handler (initial description) ──

    function gsSendMessage() {
        const text = (gsInput?.value || '').trim();
        if (!text) return;
        gsInput.value = '';

        if (gsState === 'idle') {
            gsPass1(text);
        }
        // In clarifying state, ignore text input (user answers inline)
    }

    if (gsSendBtn) gsSendBtn.addEventListener('click', gsSendMessage);
    if (gsInput) {
        gsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); gsSendMessage(); }
        });
    }

    // ── Open / Close ──

    if (generateSignBtn) {
        generateSignBtn.addEventListener('click', () => {
            if (!gsPanel) return;
            gsReset();
            gsPanel.style.display = 'flex';
            setTimeout(() => gsInput?.focus(), 150);
        });
    }
    if (gsCloseBtn) {
        gsCloseBtn.addEventListener('click', () => {
            if (gsPanel) gsPanel.style.display = 'none';
            gsReset();
        });
    }

    // ── Voice input (Web Speech API) ──

    let gsRecognition = null;
    let gsIsListening = false;

    function gsInitSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            // No browser support — hide mic button
            if (gsMicBtn) gsMicBtn.style.display = 'none';
            return;
        }

        gsRecognition = new SpeechRecognition();
        gsRecognition.lang = 'en-US';
        gsRecognition.interimResults = true;
        gsRecognition.maxAlternatives = 1;

        gsRecognition.addEventListener('result', (e) => {
            const transcript = Array.from(e.results)
                .map(r => r[0].transcript)
                .join('');
            if (gsInput) gsInput.value = transcript;

            // If final result, auto-send
            if (e.results[e.results.length - 1].isFinal) {
                gsStopListening();
                gsSendMessage();
            }
        });

        gsRecognition.addEventListener('end', () => {
            gsStopListening();
        });

        gsRecognition.addEventListener('error', (e) => {
            gsStopListening();
            if (e.error !== 'aborted' && e.error !== 'no-speech') {
                gsAddMsg('Mic error: ' + e.error, 'status');
            }
        });
    }

    function gsStartListening() {
        if (!gsRecognition || gsIsListening) return;
        gsIsListening = true;
        gsMicBtn?.classList.add('gs-mic-active');
        try { gsRecognition.start(); } catch { /* already started */ }
    }

    function gsStopListening() {
        gsIsListening = false;
        gsMicBtn?.classList.remove('gs-mic-active');
        try { gsRecognition?.stop(); } catch { /* already stopped */ }
    }

    if (gsMicBtn) {
        gsMicBtn.addEventListener('click', () => {
            if (gsIsListening) gsStopListening();
            else gsStartListening();
        });
    }

    gsInitSpeech();
});