let __uid_counter = 0;
function generateUID() {
    return 'el-' + (__uid_counter++).toString(36) + '-' + Date.now().toString(36);
}

function createElement(type, color) {
    const element = document.createElement('div');
    element.className = 'element svg-container';
    element.setAttribute('data-uid', generateUID());

    // Add excessive state attributes for future extensibility
    element.dataset.colorGradient = '';
    element.dataset.colorTransition = '';
    element.dataset.gradientType = '';
    element.dataset.gradientDirection = '';
    element.dataset.gradientAnimStyle = '';
    element.dataset.gradientStartColor = '';
    element.dataset.gradientEndColor = '';
    element.dataset.gradientAngle = '';
    element.dataset.gradientPreset = '';
    element.dataset.gradientActive = 'false';
    element.dataset.colorAnimActive = 'false';
    element.dataset.colorAnimType = '';
    element.dataset.colorAnimInterval = '';
    // Extended state attributes for more granular tracking
    element.dataset.gradientSpeed = '';
    element.dataset.gradientPause = 'false';
    element.dataset.gradientReverse = 'false';
    element.dataset.gradientLoop = 'false';
    element.dataset.gradientStep = '';
    element.dataset.gradientFrame = '';
    element.dataset.gradientLastUpdate = '';
    element.dataset.gradientCustomStops = '';
    element.dataset.gradientOpacity = '';
    element.dataset.gradientBlendMode = '';
    element.dataset.gradientMask = '';
    element.dataset.gradientClipPath = '';
    element.dataset.gradientZIndex = '';
    element.dataset.gradientFilter = '';
    element.dataset.gradientID = '';
    element.dataset.gradientUserPreset = '';
    element.dataset.gradientMeta = '';
    element.dataset.colorAnimSpeed = '';
    element.dataset.colorAnimPause = 'false';
    element.dataset.colorAnimReverse = 'false';
    element.dataset.colorAnimLoop = 'false';
    element.dataset.colorAnimStep = '';
    element.dataset.colorAnimFrame = '';
    element.dataset.colorAnimLastUpdate = '';
    element.dataset.colorAnimCustomStops = '';
    element.dataset.colorAnimOpacity = '';
    element.dataset.colorAnimBlendMode = '';
    element.dataset.colorAnimMask = '';
    element.dataset.colorAnimClipPath = '';
    element.dataset.colorAnimZIndex = '';
    element.dataset.colorAnimFilter = '';
    element.dataset.colorAnimID = '';
    element.dataset.colorAnimUserPreset = '';
    element.dataset.colorAnimMeta = '';
    // Add more as needed for future features

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