function createElement(type, color) {
    const element = document.createElement('div');
    element.className = 'svg-container';

    switch(type) {
        case 'rectangle':
            element.innerHTML = `<svg width="100%" height="100%"><rect width="100%" height="100%" fill="${color}"></rect></svg>`;
            break;
        case 'circle':
            element.innerHTML = `<svg width="100%" height="100%"><circle cx="50%" cy="50%" r="50%" fill="${color}"></circle></svg>`;
            break;
        case 'line':
            element.innerHTML = `<svg width="100%" height="100%"><line x1="0" y1="0" x2="100%" y2="100%" stroke="${color}" stroke-width="2"></line></svg>`;
            break;
        case 'arrow':
            element.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100"><line x1="0" y1="50" x2="70" y2="50" stroke="${color}" stroke-width="4"/><polygon points="70,40 70,60 100,50" fill="${color}"/></svg>`;
            break;
        case 'triangle':
            element.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100"><polygon points="50,0 0,100 100,100" fill="${color}"/></svg>`;
            break;
    }

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    element.appendChild(resizeHandle);

    element.addEventListener('mousedown', startDragging);
    element.addEventListener('contextmenu', showContextMenu);
    resizeHandle.addEventListener('mousedown', startResizing);
    canvas.appendChild(element);
}