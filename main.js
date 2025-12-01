import { createElement as createElementFromManager } from './elementManager.js';
import { saveState, undo, redo } from './stateManager.js';
import { hexToRgba, rgbToHex, getRandomColor, startColorTransitionAnimation, startGradientAnimation, clearIntervalsForUID, restoreElementAnimation, getElementAnimationState, setElementAnimationState, validateAnimationState } from './colorAnimationUtils.js';
import { openPopup, closePopup, setupPopupEvents } from './popupManager.js';
import { startDragging, startResizing } from './dragResizeManager.js';
import { setupMediaDrop, setupUnsplashSearch } from './mediaManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const canvasContainer = document.getElementById('canvas-container');
    const loadBtn = document.getElementById('load-btn');
    const clearBtn = document.getElementById('clear-btn');
    const exportBtn = document.getElementById('export-btn');
    const templatesBtn = document.getElementById('templates-btn');
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
    const saveComponentBtn = document.getElementById('save-component-btn');
    const componentsList = document.getElementById('components-list');
    const playModeBtn = document.getElementById('play-mode-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomFitBtn = document.getElementById('zoom-fit-btn');
    const zoomLabel = document.getElementById('zoom-label');

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

    // --- Multi-frame / storyboard state ---
    let frames = [];
    let currentFrameIndex = 0;
    let components = [];
    let savedProjectThemeIndex = null;
    let isPlayMode = false;
    let playModeIntervalId = null;
    let zoomLevel = 1;

    function updateFrameLabel() {
        if (frameLabel) {
            frameLabel.textContent = `Frame ${currentFrameIndex + 1}`;
        }
        if (frameDurationInput && frames[currentFrameIndex]) {
            const dur = frames[currentFrameIndex].duration || 3;
            frameDurationInput.value = dur;
        }
    }

    function applyZoom(level) {
        zoomLevel = Math.min(3, Math.max(0.25, level));
        const inner = canvas;
        inner.style.transformOrigin = 'top left';
        inner.style.transform = `scale(${zoomLevel})`;
        if (zoomLabel) zoomLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
    }

    // --- Onboarding tour logic ---
    const ONBOARDING_KEY = 'mockingBoard_seenOnboarding_v1';
    const onboardingSteps = [
        {
            title: 'Welcome to Mocking Board',
            body: 'Use the sidebar on the left to add text, shapes, media, and more to the canvas. Drag things around to quickly mock ideas.',
        },
        {
            title: 'Canvas and Frames',
            body: 'The central canvas is your stage. Use the frame bar at the bottom to add frames and build multi-step storyboards.',
        },
        {
            title: 'Editing and Animation',
            body: 'Right-click any element for options like color, gradient, motion, and media. Use the inline text toolbar to style headings and body copy.',
        },
        {
            title: 'Components and Undo',
            body: 'Save frequently used groups as components from the sidebar, and lean on Undo/Redo (Ctrl+Z / Ctrl+Shift+Z) while experimenting.',
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

    function snapshotCurrentCanvas() {
        const elements = Array.from(canvas.querySelectorAll('.element')).map(el => ({
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
        }));
        return {
            elements,
            canvas: {
                background: canvas.style.background,
                width: canvas.style.width,
                height: canvas.style.height,
            },
            duration: (frames[currentFrameIndex] && frames[currentFrameIndex].duration) || 3
        };
    }

    function loadFrame(index) {
        const frame = frames[index];
        canvas.innerHTML = '<div id="grid" class="grid"></div>';
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
            element.style.color = elData.color;
            element.style.fontSize = elData.fontSize;
            element.style.fontFamily = elData.fontFamily;
            element.style.zIndex = elData.zIndex;
            element.style.border = elData.border;
            element.style.borderColor = elData.borderColor;
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

    // Initialize first empty frame
    frames[0] = snapshotCurrentCanvas();
    updateFrameLabel();

    // Trigger onboarding for first-time users
    startOnboardingIfNeeded();

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

    if (framePrevBtn) {
        framePrevBtn.addEventListener('click', () => {
            frames[currentFrameIndex] = snapshotCurrentCanvas();
            const nextIndex = Math.max(0, currentFrameIndex - 1);
            currentFrameIndex = nextIndex;
            loadFrame(currentFrameIndex);
        });
    }
    if (frameNextBtn) {
        frameNextBtn.addEventListener('click', () => {
            frames[currentFrameIndex] = snapshotCurrentCanvas();
            const nextIndex = Math.min(frames.length - 1, currentFrameIndex + 1);
            currentFrameIndex = nextIndex;
            loadFrame(currentFrameIndex);
        });
    }
    if (frameAddBtn) {
        frameAddBtn.addEventListener('click', () => {
            frames[currentFrameIndex] = snapshotCurrentCanvas();
            const emptyFrame = { elements: [], canvas: { background: canvas.style.background, width: canvas.style.width, height: canvas.style.height } };
            frames.push(emptyFrame);
            currentFrameIndex = frames.length - 1;
            loadFrame(currentFrameIndex);
        });
    }

    if (frameDurationInput) {
        frameDurationInput.addEventListener('change', () => {
            const val = parseInt(frameDurationInput.value, 10);
            const clamped = isFinite(val) ? Math.max(1, Math.min(60, val)) : 3;
            frameDurationInput.value = clamped;
            if (frames[currentFrameIndex]) {
                frames[currentFrameIndex].duration = clamped;
            }
        });
    }

    function enterPlayMode() {
        if (isPlayMode || !frames.length) return;
        isPlayMode = true;
        canvasContainer.classList.add('play-mode');
        if (playModeBtn) playModeBtn.textContent = 'Stop';
        let index = currentFrameIndex;
        const scheduleNext = () => {
            if (!isPlayMode || !frames.length) return;
            const frame = frames[index] || {};
            const dur = frame.duration || 3;
            playModeIntervalId = setTimeout(() => {
                if (!isPlayMode) return;
                index = (index + 1) % frames.length;
                currentFrameIndex = index;
                loadFrame(currentFrameIndex);
                scheduleNext();
            }, dur * 1000);
        };
        scheduleNext();
    }

    function exitPlayMode() {
        isPlayMode = false;
        canvasContainer.classList.remove('play-mode');
        if (playModeBtn) playModeBtn.textContent = 'Play';
        if (playModeIntervalId) {
            clearTimeout(playModeIntervalId);
            playModeIntervalId = null;
        }
    }

    function getSelectedElementsSnapshot() {
        const selectedEls = Array.from(canvas.querySelectorAll('.element.element--selected'));
        if (!selectedEls.length) return null;
        return selectedEls.map(el => ({
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
        }));
    }

    function renderComponentsList() {
        if (!componentsList) return;
        componentsList.innerHTML = '';
        components.forEach((comp, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = comp.name || `Component ${index + 1}`;
            btn.addEventListener('click', () => {
                const offsetX = 20;
                const offsetY = 20;
                comp.elements.forEach(elData => {
                    const element = document.createElement('div');
                    element.className = 'element svg-container';
                    const baseLeft = parseInt(elData.left || '0', 10) || 0;
                    const baseTop = parseInt(elData.top || '0', 10) || 0;
                    element.style.left = `${baseLeft + offsetX}px`;
                    element.style.top = `${baseTop + offsetY}px`;
                    element.style.width = elData.width;
                    element.style.height = elData.height;
                    element.style.backgroundColor = elData.backgroundColor;
                    element.style.color = elData.color;
                    element.style.fontSize = elData.fontSize;
                    element.style.fontFamily = elData.fontFamily;
                    element.style.zIndex = elData.zIndex;
                    element.style.border = elData.border;
                    element.style.borderColor = elData.borderColor;
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
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            });
            componentsList.appendChild(btn);
        });
    }

    if (saveComponentBtn) {
        saveComponentBtn.addEventListener('click', () => {
            const elements = getSelectedElementsSnapshot();
            if (!elements) {
                alert('Select one or more elements on the canvas first.');
                return;
            }
            const name = prompt('Name this component:', `Component ${components.length + 1}`) || `Component ${components.length + 1}`;
            components.push({ name, elements });
            renderComponentsList();
            if (typeof saveState === 'function' && canvas) saveState(canvas);
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
            selectedElement = element;
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
                    saveState();
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
                saveState();
            }
        } else if (id === 'changeFont') {
            if (selectedElement) {
                fontIndex = (fontIndex + 1) % fonts.length;
                const editableElements = selectedElement.querySelectorAll('.editable');
                editableElements.forEach(el => {
                    el.style.fontFamily = fonts[fontIndex];
                });
                saveState();
            }
        } else if (id === 'makeTransparent') {
            if (selectedElement) {
                selectedElement.style.backgroundColor = 'rgba(43, 38, 34, 0)';
                saveState();
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
        } else if (id === 'deleteElement') {
            if (selectedElement) {
                clearAllIntervalsForElement(selectedElement);
                selectedElement.remove();
                setSelectedElement(null);
                if (typeof saveState === 'function' && canvas) saveState(canvas);
            }
        }
        contextMenu.style.display = 'none';
    });

    // Legacy generateUID/createElement logic has been replaced by elementManager.createElement

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
            if (typeof saveState === 'function' && canvas) saveState();
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
        draggedElement = e.target.closest('.element');
        offset = {
            x: e.clientX - draggedElement.offsetLeft,
            y: e.clientY - draggedElement.offsetTop
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
            draggedElement.style.left = `${e.clientX - offset.x}px`;
            draggedElement.style.top = `${e.clientY - offset.y}px`;

            if (gridEnabled) {
                const gridSize = 20;
                const left = Math.round((e.clientX - offset.x) / gridSize) * gridSize;
                const top = Math.round((e.clientY - offset.y) / gridSize) * gridSize;
                draggedElement.style.left = `${left}px`;
                draggedElement.style.top = `${top}px`;
            }
            lastPointerMoveTime = now;
        }
    }

    function stopDragging() {
        draggedElement = null;
        document.removeEventListener('pointermove', drag);
        document.removeEventListener('pointerup', stopDragging);
    }

    function startResizing(e) {
        if (isLocked) return;
        e.stopPropagation();
        isResizing = true;
        selectedElement = e.target.parentElement;
        document.addEventListener('pointermove', resize);
        document.addEventListener('pointerup', stopResizing);
    }

    function resize(e) {
        if (!isResizing) return;
        const newWidth = e.clientX - selectedElement.offsetLeft;
        const newHeight = e.clientY - selectedElement.offsetTop;
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

    function setSelectedElement(el) {
        if (selectedElement === el) return;
        if (selectedElement) {
            selectedElement.classList.remove('element--selected');
        }
        selectedElement = el;
        if (selectedElement) {
            selectedElement.classList.add('element--selected');
            updateBgModeLabel();
        } else {
            updateBgModeLabel();
        }
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
        if (!btn || !activeEditable) return;
        const action = btn.dataset.action;
        const style = activeEditable.style;
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
        }
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    });

    inlineToolbar.querySelector('select[data-action="preset"]').addEventListener('change', (e) => {
        if (!activeEditable) return;
        const preset = textPresets[e.target.value];
        if (preset) {
            Object.assign(activeEditable.style, preset);
            if (typeof saveState === 'function' && canvas) saveState(canvas);
        }
    });

    function showContextMenu(e) {
        e.preventDefault();
        if (isLocked) return;
        setSelectedElement(e.target.closest('.element'));
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
    }

    document.addEventListener('click', (e) => {
        contextMenu.style.display = 'none';
        if (!e.target.closest('.element') && e.target !== contextMenu) {
            setSelectedElement(null);
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
            if (typeof saveState === 'function' && canvas) saveState();
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
            // Clean up any previous animation interval for this element
            if (elementAnimIntervals.has(uid)) {
                clearInterval(elementAnimIntervals.get(uid));
                elementAnimIntervals.delete(uid);
            }
            const type = animationTypeSelect.value;
            const preset = animationPresetSelect.value;
            const duration = parseFloat(animationDurationInput.value) || 2;
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
            // Store animation info for export/undo/redo
            selectedElement.dataset.elementAnimation = JSON.stringify({
                type, preset, duration
            });
            if (typeof saveState === 'function' && canvas) saveState();
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
                    const { type, preset, duration } = JSON.parse(el.dataset.elementAnimation);
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
                    }
                    if (intervalId) elementAnimIntervals.set(uid, intervalId);
                } catch {}
            }
        });
    }

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
        startColorInput.value = getRandomColor();
        endColorInput.value = getRandomColor();
        openPopup(colorTransitionPopup);
    }
    function closeColorTransitionPopup() { closePopup(colorTransitionPopup); }
    function openColorGradientPopup() {
        startGradientColorInput.value = getRandomColor();
        endGradientColorInput.value = getRandomColor();
        openPopup(colorGradientPopup);
    }
    function closeColorGradientPopup() { closePopup(colorGradientPopup); }
    function openAnimationPopup() { openPopup(animationPopup); }
    function closeAnimationPopup() { closePopup(animationPopup); }
    function openMediaPopup() { openPopup(mediaPopup); }
    function closeMediaPopup() { closePopup(mediaPopup); }

    // Track the current theme index
    let currentThemeIndex = null;

    // Setup drag/resize logic
    // Replace startDragging, startResizing with dragResizeManager usage
    // Use setDragged, setOffset, setSelected to update local state
    function setDragged(el) { draggedElement = el; }
    function setOffset(val) { offset = val; }
    function setSelected(el) { selectedElement = el; }

    // --- FIX: Remove broken setupMediaDrop/setupUnsplashSearch calls before DOMContentLoaded ---
    // (They are already called after DOMContentLoaded with correct arguments)
    // setupMediaDrop(canvas, createImageElement, createVideoElement, createAudioElement);
    // setupUnsplashSearch(searchBtn, searchQueryInput, searchResults, mediaUrlInput);

    // --- Theme Selector ---
    // Add a button to open the theme selector popup
    const themeBtn = document.createElement('button');
    themeBtn.id = 'theme-btn';
    themeBtn.textContent = 'Theme';
    themeBtn.setAttribute('aria-haspopup', 'dialog');
    themeBtn.setAttribute('aria-controls', 'theme-popup');
    themeBtn.style.marginLeft = '8px';
    toolbar.appendChild(themeBtn);

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
        themePopup.style.left = '50%';
        themePopup.style.top = '50%';
        themePopup.style.transform = 'translate(-50%, -50%)';
        themePopup.style.background = '#fff';
        themePopup.style.border = '2px solid #888';
        themePopup.style.borderRadius = '8px';
        themePopup.style.padding = '24px 16px 16px 16px';
        themePopup.style.zIndex = '10000';
        themePopup.style.minWidth = '320px';
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
    themePopup.querySelector('#close-theme-popup').addEventListener('click', closeThemePopup);
    // Also close on Escape key
    themePopup.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeThemePopup();
    });
    // Prevent popup from closing when clicking inside
    themePopup.addEventListener('mousedown', (e) => e.stopPropagation());
    // Close popup when clicking outside
    document.addEventListener('mousedown', (e) => {
        if (themePopup.style.display === 'block' && !themePopup.contains(e.target) && e.target !== themeBtn) {
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
            const built = tpl.build(i);
            frames.push(built);
        }
        currentFrameIndex = 0;
        loadFrame(0);
        if (typeof saveState === 'function' && canvas) saveState(canvas);
    }

    function openTemplatesPopup() {
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.style.zIndex = 15000;
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

    // Restore event listeners for load, clear, and export buttons
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            fileInput.click();
            if (typeof saveState === 'function' && canvas) saveState();
        });
        // Restore all dataset attributes on import
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imported = JSON.parse(e.target.result);
                    if (imported && imported.project) {
                        // New project format
                        frames = Array.isArray(imported.frames) && imported.frames.length
                            ? imported.frames
                            : [snapshotCurrentCanvas()];
                        currentFrameIndex = imported.currentFrameIndex || 0;
                        components = Array.isArray(imported.components) ? imported.components : [];
                        savedProjectThemeIndex = typeof imported.themeIndex === 'number' ? imported.themeIndex : null;
                        loadFrame(currentFrameIndex);
                        if (savedProjectThemeIndex !== null) {
                            applyTheme(savedProjectThemeIndex);
                        }
                        renderComponentsList();
                        alert('Project loaded!');
                        if (typeof saveState === 'function' && canvas) saveState(canvas);
                    } else if (imported && imported.elements) {
                        // Legacy single-layout format
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
                        alert('Layout loaded!');
                        if (typeof saveState === 'function' && canvas) saveState(canvas);
                    } else {
                        alert('Invalid project or layout file.');
                    }
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
                if (typeof saveState === 'function' && canvas) saveState();
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
                components,
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
    if (playModeBtn) {
        playModeBtn.addEventListener('click', () => {
            if (isPlayMode) {
                exitPlayMode();
            } else {
                enterPlayMode();
            }
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
            if (typeof saveState === 'function' && canvas) saveState();
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
            if (typeof saveState === 'function' && canvas) saveState();
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
                if (typeof saveState === 'function' && canvas) saveState();
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
});