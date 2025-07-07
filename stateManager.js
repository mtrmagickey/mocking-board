// stateManager.js
// Handles undo/redo, save/load, and export/import for the canvas

let undoStack = [];
let redoStack = [];

export function saveState(canvas) {
    const state = canvas.innerHTML;
    undoStack.push(state);
    redoStack.length = 0;
}

export function undo(canvas, reattachEventListeners) {
    if (undoStack.length > 0) {
        redoStack.push(canvas.innerHTML);
        const prevState = undoStack.pop();
        canvas.innerHTML = prevState;
        if (reattachEventListeners) reattachEventListeners();
    }
}

export function redo(canvas, reattachEventListeners) {
    if (redoStack.length > 0) {
        undoStack.push(canvas.innerHTML);
        const nextState = redoStack.pop();
        canvas.innerHTML = nextState;
        if (reattachEventListeners) reattachEventListeners();
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
