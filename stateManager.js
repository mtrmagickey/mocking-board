// stateManager.js
// Handles undo/redo, save/load, and export/import for the canvas

import { startColorTransitionAnimation, startGradientAnimation } from './colorAnimationUtils.js';

let undoStack = [];
let redoStack = [];

// --- Enhanced State Management for Color Transitions and Gradients by UID ---

// Helper to get all per-element state (color transitions, gradients, etc.) by UID
function getElementStatesByUID(canvas) {
    if (!canvas) return [];
    const states = [];
    canvas.querySelectorAll('.element').forEach(el => {
        const uid = el.getAttribute('data-uid');
        if (!uid) return;
        const state = {
            uid,
            colorTransition: el.dataset.colorTransition ? JSON.parse(el.dataset.colorTransition) : null,
            colorGradient: el.dataset.colorGradient ? JSON.parse(el.dataset.colorGradient) : null,
            // Add more per-element state here as needed
        };
        states.push(state);
    });
    return states;
}

// Helper to restore all per-element state by UID
// Accepts Maps for UID-based interval management
function restoreElementStatesByUID(canvas, states, colorTransitionIntervals, gradientAnimIntervals) {
    states.forEach(state => {
        const el = canvas.querySelector(`.element[data-uid='${state.uid}']`);
        if (!el) return;
        // Restore color transition
        if (state.colorTransition) {
            el.dataset.colorTransition = JSON.stringify(state.colorTransition);
            // Cleanup previous interval
            if (colorTransitionIntervals.has(state.uid)) {
                clearInterval(colorTransitionIntervals.get(state.uid));
                colorTransitionIntervals.delete(state.uid);
            }
            const intervalId = startColorTransitionAnimation({
                element: el,
                startColor: state.colorTransition.startColor,
                endColor: state.colorTransition.endColor,
                transitionTime: state.colorTransition.transitionTime,
                onCleanup: () => colorTransitionIntervals.delete(state.uid)
            });
            colorTransitionIntervals.set(state.uid, intervalId);
        }
        // Restore color gradient animation
        if (state.colorGradient) {
            el.dataset.colorGradient = JSON.stringify(state.colorGradient);
            if (gradientAnimIntervals.has(state.uid)) {
                clearInterval(gradientAnimIntervals.get(state.uid));
                gradientAnimIntervals.delete(state.uid);
            }
            const { startColor, endColor, direction, gradientType, animStyle } = state.colorGradient;
            let gradient;
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
            el.style.background = gradient;
            if (animStyle === 'rotate' || animStyle === 'color-shift') {
                const intervalId = startGradientAnimation({
                    element: el,
                    startColor,
                    endColor,
                    direction,
                    gradientType,
                    animStyle
                });
                gradientAnimIntervals.set(state.uid, intervalId);
            }
        }
    });
}

// Override saveState to include all per-element state by UID
export function saveState(canvas) {
    const elementStates = getElementStatesByUID(canvas);
    const state = JSON.stringify({
        html: canvas.innerHTML,
        elementStates
    });
    undoStack.push(state);
    redoStack.length = 0;
}

// Override undo/redo to restore all per-element state by UID
export function undo(canvas, reattachEventListeners, colorTransitionIntervals, gradientAnimIntervals) {
    if (undoStack.length > 0) {
        redoStack.push(JSON.stringify({
            html: canvas.innerHTML,
            elementStates: getElementStatesByUID(canvas)
        }));
        const prevState = JSON.parse(undoStack.pop());
        canvas.innerHTML = prevState.html;
        if (reattachEventListeners) reattachEventListeners();
        if (prevState.elementStates) {
            restoreElementStatesByUID(canvas, prevState.elementStates, colorTransitionIntervals, gradientAnimIntervals);
        }
    }
}

export function redo(canvas, reattachEventListeners, colorTransitionIntervals, gradientAnimIntervals) {
    if (redoStack.length > 0) {
        undoStack.push(JSON.stringify({
            html: canvas.innerHTML,
            elementStates: getElementStatesByUID(canvas)
        }));
        const nextState = JSON.parse(redoStack.pop());
        canvas.innerHTML = nextState.html;
        if (reattachEventListeners) reattachEventListeners();
        if (nextState.elementStates) {
            restoreElementStatesByUID(canvas, nextState.elementStates, colorTransitionIntervals, gradientAnimIntervals);
        }
    }
}

export function clearState(canvas, colorTransitionIntervals, gradientAnimIntervals) {
    undoStack = [];
    redoStack = [];
    // Clear all per-element state attributes and intervals
    if (canvas) {
        canvas.querySelectorAll('.element').forEach(el => {
            // Remove all dataset state attributes
            Object.keys(el.dataset).forEach(key => {
                delete el.dataset[key];
            });
            // Remove background and style
            el.style.background = '';
            el.style.backgroundColor = '';
            el.style.opacity = '';
            el.style.mixBlendMode = '';
        });
    }
    // Clear all intervals
    if (colorTransitionIntervals) {
        colorTransitionIntervals.forEach((intervalId) => clearInterval(intervalId));
        colorTransitionIntervals.clear();
    }
    if (gradientAnimIntervals) {
        gradientAnimIntervals.forEach((intervalId) => clearInterval(intervalId));
        gradientAnimIntervals.clear();
    }
}

export function getStateStacks() {
    return { undoStack, redoStack };
}
