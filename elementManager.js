// elementManager.js
// Handles creation and manipulation of canvas elements

// Helper to generate a unique 9-character alphanumeric UID
function generateUID(length = 9) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uid = '';
    for (let i = 0; i < length; i++) {
        uid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return uid;
}

export function createElement(type, options = {}) {
    const element = document.createElement('div');
    element.className = 'element';
    element.style.left = options.left || '10px';
    element.style.top = options.top || '10px';
    element.style.width = options.width || '200px';
    element.style.height = options.height || '100px';
    element.style.backgroundColor = options.backgroundColor || getRandomColor();

    // --- Assign data-type, unique data-id, and unique 9-char alphanumeric UID ---
    element.setAttribute('data-type', type);
    element.setAttribute('data-id', 'el-' + Date.now() + '-' + Math.floor(Math.random() * 1000000));
    if (!element.hasAttribute('data-uid')) {
        element.setAttribute('data-uid', generateUID());
    }

    switch(type) {
        case 'header':
            element.innerHTML = '<div class="editable" contenteditable="true"><div class="text-format-toolbar"></div><h2>Header</h2></div>';
            break;
        case 'paragraph':
            element.innerHTML = '<div class="editable" contenteditable="true"><div class="text-format-toolbar"></div><p>This is a paragraph.</p></div>';
            break;
        case 'image':
            element.innerHTML = '<img src="https://github.com/mtrmagickey/mocking-board/blob/main/Mocking-Board_logo.png?raw=true" alt="Placeholder">';
            break;
        case 'button':
            element.innerHTML = '<div class="editable" contenteditable="true"><button>Click me</button></div>';
            break;
        case 'video':
            element.innerHTML = '<video width="100%" height="100%" controls><source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">Your browser does not support the video tag.</video>';
            break;
        case 'audio':
            element.innerHTML = '<audio controls><source src="https://www.w3schools.com/html/horse.ogg" type="audio/ogg">Your browser does not support the audio element.</audio>';
            break;
        case 'youtube':
            // YouTube logic should be handled in main.js for prompt
            break;
        case 'rectangle':
            element.innerHTML = '<svg width="100%" height="100%"><rect width="100%" height="100%" fill="#3498db"></rect></svg>';
            break;
        case 'circle':
            element.innerHTML = '<svg width="100%" height="100%"><circle cx="50%" cy="50%" r="50%" fill="#3498db"></circle></svg>';
            break;
        case 'line':
            element.innerHTML = '<svg width="100%" height="100%"><line x1="0" y1="0" x2="100%" y2="100%" stroke="#3498db" stroke-width="2"></line>';
            break;
        case 'arrow':
            element.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 100 100"><line x1="0" y1="50" x2="70" y2="50" stroke="#3498db" stroke-width="4"/><polygon points="70,40 70,60 100,50" fill="#3498db"/></svg>';
            break;
        case 'triangle':
            element.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 100 100"><polygon points="50,0 0,100 100,100" fill="#3498db"/></svg>';
            break;
    }

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    element.appendChild(resizeHandle);
    return element;
}

// Remove element with per-element cleanup (intervals/listeners)
// Pass a cleanup callback (e.g., clearAllIntervalsForElement) to ensure robust cleanup
// The cleanup callback should use UID-based cleanup for any per-element timers/animations.
// Example usage:
//   removeElement(element, el => clearAllIntervalsForElement(el));
export function removeElement(element, cleanupCallback) {
    if (typeof cleanupCallback === 'function') {
        cleanupCallback(element);
    }
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
}

function getRandomColor() {
    const colors = ['#f9dea2', '#cc0000', '#ffffff', '#8c8c8c', '#FAC800', '#6F7D1C', '#2b2622', '#b5a643', '#008473', '#990000', 'transparent'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Additional element manipulation utilities can be added here
