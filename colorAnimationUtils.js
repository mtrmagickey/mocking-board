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

// Add more animation/gradient helpers as needed
