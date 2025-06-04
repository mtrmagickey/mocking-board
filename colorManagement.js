let selectedElement = null;

function openColorPopup() {
    document.getElementById('color-popup').style.display = 'block';
}

function closeColorPopup() {
    document.getElementById('color-popup').style.display = 'none';
}

function openColorTransitionPopup() {
    document.getElementById('color-transition-popup').style.display = 'block';
}

function closeColorTransitionPopup() {
    document.getElementById('color-transition-popup').style.display = 'none';
}

function openColorGradientPopup() {
    document.getElementById('color-gradient-popup').style.display = 'block';
}

function closeColorGradientPopup() {
    document.getElementById('color-gradient-popup').style.display = 'none';
}

document.getElementById('apply-color-btn').addEventListener('click', () => {
    if (selectedElement) {
        const hex = document.getElementById('hex-input').value;
        const transparency = 100 - document.getElementById('transparency-input').value;
        if (/^#[0-9A-F]{6}$/i.test(hex) && transparency >= 0 && transparency <= 100) {
            const rgba = hexToRgba(hex, transparency);
            if (selectedElement.tagName === 'SVG') {
                selectedElement.querySelector('*').setAttribute('fill', rgba);
            } else {
                selectedElement.style.backgroundColor = rgba;
            }
        }
    }
    closeColorPopup();
});

document.getElementById('apply-gradient-btn').addEventListener('click', () => {
    if (selectedElement) {
        const startColor = document.getElementById('start-gradient-color').value;
        const endColor = document.getElementById('end-gradient-color').value;
        const gradientDirection = document.getElementById('gradient-direction').value;

        if (selectedElement.tagName === 'SVG') {
            selectedElement.querySelector('*').setAttribute('fill', `url(#grad)`);
            const svgNS = "http://www.w3.org/2000/svg";
            const grad = document.createElementNS(svgNS, "linearGradient");
            grad.setAttribute("id", "grad");
            grad.setAttribute("x1", "0%");
            grad.setAttribute("y1", "0%");
            grad.setAttribute("x2", "100%");
            grad.setAttribute("y2", "0%");
            const start = document.createElementNS(svgNS, "stop");
            start.setAttribute("offset", "0%");
            start.setAttribute("style", `stop-color:${startColor};stop-opacity:1`);
            const end = document.createElementNS(svgNS, "stop");
            end.setAttribute("offset", "100%");
            end.setAttribute("style", `stop-color:${endColor};stop-opacity:1`);
            grad.appendChild(start);
            grad.appendChild(end);
            selectedElement.querySelector('svg').appendChild(grad);
        } else {
            selectedElement.style.backgroundImage = `linear-gradient(${gradientDirection}, ${startColor}, ${endColor})`;
        }
    }
    closeColorGradientPopup();
});

document.getElementById('apply-transition-btn').addEventListener('click', () => {
    if (selectedElement) {
        const startColor = document.getElementById('start-color').value;
        const endColor = document.getElementById('end-color').value;
        const transitionTime = document.getElementById('transition-time').value;

        selectedElement.style.transition = `background-color ${transitionTime}s`;
        selectedElement.style.backgroundColor = startColor;

        setTimeout(() => {
            selectedElement.style.backgroundColor = endColor;
        }, 0);
    }
    closeColorTransitionPopup();
});

function hexToRgba(hex, transparency) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = transparency / 100;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}