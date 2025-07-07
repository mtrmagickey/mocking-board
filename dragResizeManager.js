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

export function startDragging(e, isLocked, setDragged, setOffset) {
    if (e.target.className === 'resize-handle' || isLocked()) return;
    draggedElement = e.target.closest('.element');
    setDragged(draggedElement);
    setOffset({
        x: e.clientX - draggedElement.offsetLeft,
        y: e.clientY - draggedElement.offsetTop
    });
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
    draggedElement.style.left = `${dragEvent.clientX - offset.x}px`;
    draggedElement.style.top = `${dragEvent.clientY - offset.y}px`;
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
    const newWidth = resizeEvent.clientX - selectedElement.offsetLeft;
    const newHeight = resizeEvent.clientY - selectedElement.offsetTop;
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
