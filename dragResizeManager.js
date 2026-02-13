// dragResizeManager.js
// Handles drag, resize, and related throttling logic

let draggedElement = null;
let offset = { x: 0, y: 0 };
let isResizing = false;
let selectedElement = null;
let lastPointerMoveTime = 0;
let dragAnimationFrame = null;
let resizeAnimationFrame = null;
let dragEvent = null;
let resizeEvent = null;

/** Get the scale factor of the canvas CSS transform */
function getScale(el) {
    if (!el) return 1;
    const canvas = el.closest('.canvas') || el.parentElement;
    if (!canvas) return 1;
    const rect = canvas.getBoundingClientRect();
    return rect.width / (canvas.offsetWidth || 1);
}

/** Convert screen coords to canvas coords */
function screenToCanvasCoords(el, screenX, screenY) {
    const canvas = el.closest('.canvas') || el.parentElement;
    if (!canvas) return { x: screenX, y: screenY };
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / (canvas.offsetWidth || 1);
    return {
        x: (screenX - rect.left) / scale,
        y: (screenY - rect.top) / scale,
    };
}

export function startDragging(e, isLocked, setDragged, setOffset) {
    if (e.target.className === 'resize-handle' || isLocked()) return;
    draggedElement = e.target.closest('.element');
    setDragged(draggedElement);
    const canvasPos = screenToCanvasCoords(draggedElement, e.clientX, e.clientY);
    offset = {
        x: canvasPos.x - draggedElement.offsetLeft,
        y: canvasPos.y - draggedElement.offsetTop
    };
    setOffset(offset);
    dragEvent = e;
    dragAnimationFrame = requestAnimationFrame(dragRAF);
    document.addEventListener('pointermove', dragRAFHandler);
    document.addEventListener('pointerup', stopDragging);
}

function dragRAFHandler(e) {
    dragEvent = e;
}

function dragRAF() {
    if (!draggedElement || !dragEvent) return;
    const canvasPos = screenToCanvasCoords(draggedElement, dragEvent.clientX, dragEvent.clientY);
    draggedElement.style.left = `${canvasPos.x - offset.x}px`;
    draggedElement.style.top = `${canvasPos.y - offset.y}px`;
    dragAnimationFrame = requestAnimationFrame(dragRAF);
}

function stopDragging() {
    cancelAnimationFrame(dragAnimationFrame);
    dragAnimationFrame = null;
    dragEvent = null;
    draggedElement = null;
    document.removeEventListener('pointermove', dragRAFHandler);
    document.removeEventListener('pointerup', stopDragging);
}

export function startResizing(e, isLocked, setSelected) {
    if (isLocked()) return;
    e.stopPropagation();
    isResizing = true;
    selectedElement = e.target.parentElement;
    setSelected(selectedElement);
    resizeEvent = e;
    resizeAnimationFrame = requestAnimationFrame(resizeRAF);
    document.addEventListener('pointermove', resizeRAFHandler);
    document.addEventListener('pointerup', stopResizing);
}

function resizeRAFHandler(e) {
    resizeEvent = e;
}

function resizeRAF() {
    if (!isResizing || !resizeEvent) return;
    const canvasPos = screenToCanvasCoords(selectedElement, resizeEvent.clientX, resizeEvent.clientY);
    const newWidth = canvasPos.x - selectedElement.offsetLeft;
    const newHeight = canvasPos.y - selectedElement.offsetTop;
    selectedElement.style.width = `${newWidth}px`;
    selectedElement.style.height = `${newHeight}px`;
    resizeAnimationFrame = requestAnimationFrame(resizeRAF);
}

function stopResizing() {
    cancelAnimationFrame(resizeAnimationFrame);
    resizeAnimationFrame = null;
    resizeEvent = null;
    isResizing = false;
    document.removeEventListener('pointermove', resizeRAFHandler);
    document.removeEventListener('pointerup', stopResizing);
}
