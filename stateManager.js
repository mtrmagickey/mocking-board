// stateManager.js
// Handles undo/redo, save/load, and export/import for the canvas

let undoStack = [];
let redoStack = [];

// --- Enhanced State Management for Color Transitions ---

// Helper to get all color transition info from the canvas
function getColorTransitionStates(canvas) {
    const states = [];
    canvas.querySelectorAll('.element').forEach(el => {
        if (el.dataset.colorTransition) {
            try {
                const data = JSON.parse(el.dataset.colorTransition);
                states.push({
                    selector: getElementSelector(el, canvas),
                    ...data
                });
            } catch {}
        }
    });
    return states;
}

// Helper to set color transition info on elements
function restoreColorTransitions(canvas, colorStates, setColorTransitionInterval, clearColorTransitionInterval) {
    colorStates.forEach(state => {
        const el = queryElementBySelector(canvas, state.selector);
        if (el) {
            el.dataset.colorTransition = JSON.stringify({
                startColor: state.startColor,
                endColor: state.endColor,
                transitionTime: state.transitionTime
            });
            clearColorTransitionInterval(el);
            let isStartColor = state.isStartColor || true;
            el.style.transition = `background-color ${state.transitionTime}s ease-in-out`;
            el.style.backgroundColor = isStartColor ? state.startColor : state.endColor;
            const intervalId = setInterval(() => {
                el.style.backgroundColor = isStartColor ? state.endColor : state.startColor;
                isStartColor = !isStartColor;
            }, state.transitionTime * 1000);
            setColorTransitionInterval(el, intervalId);
        }
    });
}

// Helper to get a unique selector for an element (by index)
function getElementSelector(el, canvas) {
    const elements = Array.from(canvas.querySelectorAll('.element'));
    return elements.indexOf(el);
}
function queryElementBySelector(canvas, selector) {
    return canvas.querySelectorAll('.element')[selector] || null;
}

// Override saveState to include color transition info
export function saveState(canvas) {
    const colorTransitions = getColorTransitionStates(canvas);
    const state = JSON.stringify({
        html: canvas.innerHTML,
        colorTransitions
    });
    undoStack.push(state);
    redoStack.length = 0;
}

// Override undo/redo to restore color transitions
export function undo(canvas, reattachEventListeners, setColorTransitionInterval, clearColorTransitionInterval) {
    if (undoStack.length > 0) {
        redoStack.push(JSON.stringify({
            html: canvas.innerHTML,
            colorTransitions: getColorTransitionStates(canvas)
        }));
        const prevState = JSON.parse(undoStack.pop());
        canvas.innerHTML = prevState.html;
        if (reattachEventListeners) reattachEventListeners();
        if (prevState.colorTransitions && setColorTransitionInterval && clearColorTransitionInterval) {
            restoreColorTransitions(canvas, prevState.colorTransitions, setColorTransitionInterval, clearColorTransitionInterval);
        }
    }
}

export function redo(canvas, reattachEventListeners, setColorTransitionInterval, clearColorTransitionInterval) {
    if (redoStack.length > 0) {
        undoStack.push(JSON.stringify({
            html: canvas.innerHTML,
            colorTransitions: getColorTransitionStates(canvas)
        }));
        const nextState = JSON.parse(redoStack.pop());
        canvas.innerHTML = nextState.html;
        if (reattachEventListeners) reattachEventListeners();
        if (nextState.colorTransitions && setColorTransitionInterval && clearColorTransitionInterval) {
            restoreColorTransitions(canvas, nextState.colorTransitions, setColorTransitionInterval, clearColorTransitionInterval);
        }
    }
}

export function clearState() {
    undoStack = [];
    redoStack = [];
}

export function getStateStacks() {
    return { undoStack, redoStack };
}

// Track color transition intervals for cleanup
const colorTransitionIntervals = new WeakMap();

export function setColorTransitionInterval(element, intervalId) {
    colorTransitionIntervals.set(element, intervalId);
}

export function clearColorTransitionInterval(element) {
    const intervalId = colorTransitionIntervals.get(element);
    if (intervalId) {
        clearInterval(intervalId);
        colorTransitionIntervals.delete(element);
    }
}
