document.getElementById('export-btn').addEventListener('click', () => {
    const elements = Array.from(canvas.children).map(el => ({
        type: el.firstElementChild.tagName.toLowerCase(),
        left: el.style.left,
        top: el.style.top,
        width: el.style.width,
        height: el.style.height,
        backgroundColor: el.style.backgroundColor,
        content: el.innerHTML,
        zIndex: el.style.zIndex,
        fontSize: el.style.fontSize,
        color: el.style.color,
        textAlign: el.style.textAlign,
        rotation: el.dataset.rotation || 0,
        animation: el.style.animation || ''
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(elements, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "prototype.json");
    document.body.appendChild(downloadAnchorNode); // Required for Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});
