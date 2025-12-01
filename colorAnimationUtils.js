// colorAnimationUtils.js
// Utility functions for color conversion, gradients, and animation helpers

export function hexToRgba(hex, transparency) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = transparency / 100;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function rgbToHex(rgb) {
    const rgbArray = rgb.match(/\d+/g).map(Number);
    return `#${((1 << 24) + (rgbArray[0] << 16) + (rgbArray[1] << 8) + rgbArray[2]).toString(16).slice(1).toUpperCase()}`;
}

export function getRandomColor() {
    const colors = [
        '#F5C919', // Bright Amber
        '#FFEFA8', // Soft amber highlight
        '#FFF9E5', // Off-white warm
        '#FFFFFF', // Pure white
        'transparent'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}


// --- UID-based Animation Helpers ---
// These helpers do NOT store intervals themselves; caller must store intervalId in a Map keyed by uid.

// Animation state store: Map<uid, animationStateObject>
export const elementAnimationStates = new Map();

/**
 * Create or update the animation state object for an element.
 * @param {string} uid
 * @param {object} stateObj
 */
export function setElementAnimationState(uid, stateObj) {
    if (!uid || !stateObj) return;
    elementAnimationStates.set(uid, { ...stateObj });
}

/**
 * Get the animation state object for an element by uid.
 * @param {string} uid
 * @returns {object|null}
 */
export function getElementAnimationState(uid) {
    return elementAnimationStates.get(uid) || null;
}

/**
 * Remove the animation state object for an element by uid.
 * @param {string} uid
 */
export function clearElementAnimationState(uid) {
    if (!uid) return;
    elementAnimationStates.delete(uid);
}

/**
 * Start a color transition animation for an element, toggling between two colors.
 * Returns the intervalId. Caller must store/clear this in a Map keyed by uid.
 */
export function startColorTransitionAnimation({ element, startColor, endColor, transitionTime, onCleanup, uid }) {
    if (!element) return null;
    let isStartColor = true;
    // Use state object if available
    let state = uid ? getElementAnimationState(uid) : null;
    let speed = state && state.colorAnimSpeed !== undefined ? parseFloat(state.colorAnimSpeed) : (parseFloat(element.dataset.colorAnimSpeed) || transitionTime * 1000);
    let paused = state && state.colorAnimPause !== undefined ? state.colorAnimPause : (element.dataset.colorAnimPause === 'true');
    let reverse = state && state.colorAnimReverse !== undefined ? state.colorAnimReverse : (element.dataset.colorAnimReverse === 'true');
    let loop = state && state.colorAnimLoop !== undefined ? state.colorAnimLoop : (element.dataset.colorAnimLoop !== 'false');
    element.style.transition = `background-color ${transitionTime}s ease-in-out`;
    element.style.backgroundColor = startColor;
    const intervalId = setInterval(() => {
        if ((state && state.colorAnimPause) || element.dataset.colorAnimPause === 'true') return;
        if (!document.body.contains(element)) {
            clearInterval(intervalId);
            if (typeof onCleanup === 'function') onCleanup();
            return;
        }
        element.style.backgroundColor = isStartColor ? endColor : startColor;
        isStartColor = reverse ? !isStartColor : !isStartColor;
        // If not looping, stop after one cycle
        if (!loop && !isStartColor) {
            clearInterval(intervalId);
            if (typeof onCleanup === 'function') onCleanup();
        }
    }, speed);
    return intervalId;
}

/**
 * Start a gradient animation for an element. Supports 'rotate' and 'color-shift' styles.
 * Returns the intervalId. Caller must store/clear this in a Map keyed by uid.
 */
export function startGradientAnimation({ element, startColor, endColor, direction, gradientType, animStyle, uid }) {
    if (!element) return null;
    let angleVal = 0;
    let isStart = true;
    let intervalId = null;
    // Use state object if available
    let state = uid ? getElementAnimationState(uid) : null;
    let speed = state && state.gradientSpeed !== undefined ? parseInt(state.gradientSpeed) : (parseInt(element.dataset.gradientSpeed) || 50);
    let reverse = state && state.gradientReverse !== undefined ? state.gradientReverse : (element.dataset.gradientReverse === 'true');
    let loop = state && state.gradientLoop !== undefined ? state.gradientLoop : (element.dataset.gradientLoop !== 'false');
    let blendMode = state && state.gradientBlendMode !== undefined ? state.gradientBlendMode : element.dataset.gradientBlendMode;
    let opacity = state && state.gradientOpacity !== undefined ? state.gradientOpacity : element.dataset.gradientOpacity;
    if (blendMode) element.style.mixBlendMode = blendMode;
    if (opacity) element.style.opacity = opacity;
    if (animStyle === 'rotate' && (gradientType === 'linear' || gradientType === 'conic')) {
        intervalId = setInterval(() => {
            if ((state && state.gradientPause) || element.dataset.gradientPause === 'true') return;
            angleVal = (angleVal + (reverse ? -2 : 2) + 360) % 360;
            if (!document.body.contains(element)) {
                clearInterval(intervalId);
                return;
            }
            if (gradientType === 'conic') {
                element.style.background = `conic-gradient(from ${angleVal}deg, ${startColor}, ${endColor})`;
            } else {
                element.style.background = `linear-gradient(${angleVal}deg, ${startColor}, ${endColor})`;
            }
            if (!loop && (angleVal === 0 || angleVal === 360)) {
                clearInterval(intervalId);
            }
        }, speed);
    } else if (animStyle === 'color-shift') {
        intervalId = setInterval(() => {
            if ((state && state.gradientPause) || element.dataset.gradientPause === 'true') return;
            if (!document.body.contains(element)) {
                clearInterval(intervalId);
                return;
            }
            if (gradientType === 'radial') {
                element.style.background = `radial-gradient(circle, ${isStart ? startColor : endColor}, ${isStart ? endColor : startColor})`;
            } else if (gradientType === 'conic') {
                element.style.background = `conic-gradient(from 0deg, ${isStart ? startColor : endColor}, ${isStart ? endColor : startColor})`;
            } else {
                element.style.background = `linear-gradient(${direction}, ${isStart ? startColor : endColor}, ${isStart ? endColor : startColor})`;
            }
            isStart = reverse ? !isStart : !isStart;
            if (!loop && !isStart) {
                clearInterval(intervalId);
            }
        }, speed * 20);
    }
    return intervalId;
}

/**
 * Restore all animation (color/gradient) for an element from its animation state object.
 * @param {HTMLElement} element
 * @param {object} animationState
 * @param {object} intervalMaps - { color: Map, gradient: Map }
 * @param {string} uid
 */
export function restoreElementAnimation(element, animationState, intervalMaps, uid) {
    if (!element || !animationState || !uid) return;
    // Set dataset attributes for compatibility
    Object.entries(animationState).forEach(([key, value]) => {
        if (typeof value !== 'undefined' && value !== null) {
            element.dataset[key] = value;
        }
    });
    // Clear previous intervals
    if (intervalMaps && intervalMaps.color && intervalMaps.color.has(uid)) {
        clearInterval(intervalMaps.color.get(uid));
        intervalMaps.color.delete(uid);
    }
    if (intervalMaps && intervalMaps.gradient && intervalMaps.gradient.has(uid)) {
        clearInterval(intervalMaps.gradient.get(uid));
        intervalMaps.gradient.delete(uid);
    }
    // Start color transition if needed
    if (animationState.colorAnimActive) {
        const colorId = startColorTransitionAnimation({
            element,
            startColor: animationState.colorAnimStartColor,
            endColor: animationState.colorAnimEndColor,
            transitionTime: parseFloat(animationState.colorAnimTransitionTime) || 1,
            uid
        });
        if (intervalMaps && intervalMaps.color) intervalMaps.color.set(uid, colorId);
    }
    // Start gradient animation if needed
    if (animationState.gradientAnimActive) {
        const gradId = startGradientAnimation({
            element,
            startColor: animationState.gradientStartColor,
            endColor: animationState.gradientEndColor,
            direction: animationState.gradientDirection,
            gradientType: animationState.gradientType,
            animStyle: animationState.gradientAnimStyle,
            uid
        });
        if (intervalMaps && intervalMaps.gradient) intervalMaps.gradient.set(uid, gradId);
    }
}
/**
 * Cleanup utility: clear intervals for a given UID from provided Maps and clear animation state.
 */
export function clearIntervalsForUID(uid, ...intervalMaps) {
    if (!uid) return;
    intervalMaps.forEach(map => {
        if (map && map.has(uid)) {
            clearInterval(map.get(uid));
            map.delete(uid);
        }
    });
    clearElementAnimationState(uid);
}

/**
 * Validate and sanitize an animation state object. Returns a new object with defaults for missing/invalid values.
 * @param {object} state
 * @returns {object}
 */
export function validateAnimationState(state) {
    if (!state || typeof state !== 'object') return {};
    return {
        colorAnimActive: !!state.colorAnimActive,
        colorAnimStartColor: typeof state.colorAnimStartColor === 'string' ? state.colorAnimStartColor : '#ffffff',
        colorAnimEndColor: typeof state.colorAnimEndColor === 'string' ? state.colorAnimEndColor : '#000000',
        colorAnimTransitionTime: isFinite(state.colorAnimTransitionTime) ? parseFloat(state.colorAnimTransitionTime) : 1,
        colorAnimSpeed: isFinite(state.colorAnimSpeed) ? parseFloat(state.colorAnimSpeed) : 1000,
        colorAnimPause: !!state.colorAnimPause,
        colorAnimReverse: !!state.colorAnimReverse,
        colorAnimLoop: state.colorAnimLoop !== undefined ? !!state.colorAnimLoop : true,
        gradientAnimActive: !!state.gradientAnimActive,
        gradientStartColor: typeof state.gradientStartColor === 'string' ? state.gradientStartColor : '#ffffff',
        gradientEndColor: typeof state.gradientEndColor === 'string' ? state.gradientEndColor : '#000000',
        gradientDirection: typeof state.gradientDirection === 'string' ? state.gradientDirection : '90',
        gradientType: typeof state.gradientType === 'string' ? state.gradientType : 'linear',
        gradientAnimStyle: typeof state.gradientAnimStyle === 'string' ? state.gradientAnimStyle : 'rotate',
        gradientSpeed: isFinite(state.gradientSpeed) ? parseInt(state.gradientSpeed) : 50,
        gradientPause: !!state.gradientPause,
        gradientReverse: !!state.gradientReverse,
        gradientLoop: state.gradientLoop !== undefined ? !!state.gradientLoop : true,
        gradientBlendMode: typeof state.gradientBlendMode === 'string' ? state.gradientBlendMode : '',
        gradientOpacity: typeof state.gradientOpacity === 'string' ? state.gradientOpacity : '',
    };
}
// Add more animation/gradient helpers as needed
// Debug logging utility
export function logAnimationDebug(msg, ...args) {
    if (window && window.DEBUG_ANIMATION) {
        console.debug('[AnimationDebug]', msg, ...args);
    }
}
