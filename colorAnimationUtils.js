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
    const colors = ['#f9dea2', '#cc0000', '#ffffff', '#8c8c8c', '#FAC800', '#6F7D1C', '#2b2622', '#b5a643', '#008473', '#990000', 'transparent'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// --- UID-based Animation Helpers ---
// These helpers do NOT store intervals themselves; caller must store intervalId in a Map keyed by uid.

/**
 * Start a color transition animation for an element, toggling between two colors.
 * Returns the intervalId. Caller must store/clear this in a Map keyed by uid.
 */
export function startColorTransitionAnimation({ element, startColor, endColor, transitionTime, onCleanup }) {
    if (!element) return null;
    let isStartColor = true;
    element.style.transition = `background-color ${transitionTime}s ease-in-out`;
    element.style.backgroundColor = startColor;
    const intervalId = setInterval(() => {
        if (!document.body.contains(element)) {
            clearInterval(intervalId);
            if (typeof onCleanup === 'function') onCleanup();
            return;
        }
        element.style.backgroundColor = isStartColor ? endColor : startColor;
        isStartColor = !isStartColor;
    }, transitionTime * 1000);
    return intervalId;
}

/**
 * Start a gradient animation for an element. Supports 'rotate' and 'color-shift' styles.
 * Returns the intervalId. Caller must store/clear this in a Map keyed by uid.
 */
export function startGradientAnimation({ element, startColor, endColor, direction, gradientType, animStyle }) {
    if (!element) return null;
    let angleVal = 0;
    let isStart = true;
    let intervalId = null;
    if (animStyle === 'rotate' && (gradientType === 'linear' || gradientType === 'conic')) {
        intervalId = setInterval(() => {
            angleVal = (angleVal + 2) % 360;
            if (!document.body.contains(element)) {
                clearInterval(intervalId);
                return;
            }
            if (gradientType === 'conic') {
                element.style.background = `conic-gradient(from ${angleVal}deg, ${startColor}, ${endColor})`;
            } else {
                element.style.background = `linear-gradient(${angleVal}deg, ${startColor}, ${endColor})`;
            }
        }, 50);
    } else if (animStyle === 'color-shift') {
        intervalId = setInterval(() => {
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
            isStart = !isStart;
        }, 1000);
    }
    return intervalId;
}

/**
 * Cleanup utility: clear intervals for a given UID from provided Maps.
 */
export function clearIntervalsForUID(uid, ...intervalMaps) {
    if (!uid) return;
    intervalMaps.forEach(map => {
        if (map && map.has(uid)) {
            clearInterval(map.get(uid));
            map.delete(uid);
        }
    });
}

// Add more animation/gradient helpers as needed
