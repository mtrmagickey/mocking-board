import { createElement as createElementFromManager } from './elementManager.js';
import { saveState, undo, redo } from './stateManager.js';
import { hexToRgba, rgbToHex, getRandomColor } from './colorAnimationUtils.js';
import { openPopup, closePopup, setupPopupEvents } from './popupManager.js';
import { startDragging, startResizing } from './dragResizeManager.js';
import { setupMediaDrop, setupUnsplashSearch } from './mediaManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const canvasContainer = document.getElementById('canvas-container');
    const elementButtons = document.querySelectorAll('.element-button');
    const loadBtn = document.getElementById('load-btn');
    const clearBtn = document.getElementById('clear-btn');
    const exportBtn = document.getElementById('export-btn');
    const fileInput = document.getElementById('file-input');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const lockBtn = document.getElementById('lock-btn');
    const backgroundBtn = document.getElementById('background-btn');
    const hexInput = document.getElementById('hex-input');
    const colorPicker = document.getElementById('color-picker');
    const transparencyInput = document.getElementById('transparency-input');
    const applyColorBtn = document.getElementById('apply-color-btn');
    const colorPopup = document.getElementById('color-popup');
    const contextMenu = document.getElementById('contextMenu');
    const sidebar = document.getElementById('sidebar');
    const toolbar = document.getElementById('toolbar');
    const widget = document.getElementById('widget');
    const fontColorPicker = document.createElement('input');
    fontColorPicker.type = 'color';
    fontColorPicker.style.display = 'none';
    document.body.appendChild(fontColorPicker);

    const animationPopup = document.getElementById('animation-popup');
    const animationTypeSelect = document.getElementById('animation-type');
    const animationPresetSelect = document.getElementById('animation-preset');
    const animationDurationInput = document.getElementById('animation-duration');
    const applyAnimationBtn = document.getElementById('apply-animation-btn');

    const colorTransitionPopup = document.getElementById('color-transition-popup');
    const startColorInput = document.getElementById('start-color');
    const endColorInput = document.getElementById('end-color');
    const transitionTimeInput = document.getElementById('transition-time');
    const applyTransitionBtn = document.getElementById('apply-transition-btn');

    const mediaPopup = document.getElementById('media-popup');
    const mediaUrlInput = document.getElementById('media-url-input');
    const searchQueryInput = document.getElementById('search-query-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results');
    const applyMediaBtn = document.getElementById('apply-media-btn');

    const colorGradientPopup = document.getElementById('color-gradient-popup');
    const startGradientColorInput = document.getElementById('start-gradient-color');
    const endGradientColorInput = document.getElementById('end-gradient-color');
    const gradientDirectionSelect = document.getElementById('gradient-direction');
    const applyGradientBtn = document.getElementById('apply-gradient-btn');

    let draggedElement = null;
    let offset = { x: 0, y: 0 };
    let selectedElement = null;
    let isResizing = false;
    let isLocked = false;
    let gridEnabled = false;
    const alignments = ['left', 'center', 'right'];
    let alignmentIndex = 0;
    const fonts = ['Roboto', 'Pacifico', 'Old Standard TT'];
    let fontIndex = 0;

    function reattachEventListeners() {
        const elements = canvas.querySelectorAll('.element');
        elements.forEach(el => {
            el.addEventListener('pointerdown', startDragging);
            el.addEventListener('contextmenu', showContextMenu);
            const resizeHandle = el.querySelector('.resize-handle');
            if (resizeHandle) {
                resizeHandle.addEventListener('pointerdown', startResizing);
            }
            const iframeElement = el.querySelector('iframe');
            if (iframeElement) {
                iframeElement.addEventListener('pointerdown', (e) => e.stopPropagation());
            }
            const mediaElements = el.querySelectorAll('video, audio');
            mediaElements.forEach(media => {
                media.addEventListener('pointerdown', (e) => e.stopPropagation());
            });
        });
    }

    // Sidebar event delegation for element creation
    sidebar.addEventListener('click', (e) => {
        const button = e.target.closest('.element-button');
        if (button && !isLocked) {
            const type = button.getAttribute('data-type');
            let element;
            if (type === 'youtube') {
                const youtubeUrl = prompt("Enter the YouTube URL:");
                const youtubeID = extractYouTubeID(youtubeUrl);
                if (youtubeID) {
                    element = createElementFromManager(type);
                    element.innerHTML = `<iframe src="https://www.youtube.com/embed/${youtubeID}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                } else {
                    alert("Invalid YouTube URL.");
                    return;
                }
            } else {
                element = createElementFromManager(type);
            }
            canvas.appendChild(element);
            saveState();
        }
    });

    // Canvas event delegation for dragging, resizing, and context menu
    canvas.addEventListener('pointerdown', (e) => {
        const element = e.target.closest('.element');
        if (!element || isLocked) return;
        if (e.target.classList.contains('resize-handle')) {
            startResizing(e, () => isLocked, setSelected);
        } else {
            startDragging(e, () => isLocked, setDragged, setOffset);
        }
    });

    canvas.addEventListener('contextmenu', (e) => {
        const element = e.target.closest('.element');
        if (!element || isLocked) return;
        e.preventDefault();
        selectedElement = element;
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
    });

    // Context menu event delegation
    contextMenu.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.id;
        if (id === 'changeColor') {
            if (selectedElement) openColorPopup();
        } else if (id === 'rotateElement') {
            if (selectedElement) {
                const currentRotation = selectedElement.dataset.rotation || 0;
                const newRotation = (parseInt(currentRotation) + 5) % 360;
                selectedElement.style.transform = `rotate(${newRotation}deg)`;
                selectedElement.dataset.rotation = newRotation;
            }
        } else if (id === 'rotate90Element') {
            if (selectedElement) {
                const currentRotation = selectedElement.dataset.rotation || 0;
                const newRotation = (parseInt(currentRotation) + 90) % 360;
                selectedElement.style.transform = `rotate(${newRotation}deg)`;
                selectedElement.dataset.rotation = newRotation;
            }
        } else if (id === 'changeLinkedMedia') {
            if (selectedElement) openMediaPopup();
        } else if (id === 'fontSize') {
            if (selectedElement) {
                const newSize = prompt("Enter the new font size (e.g., 16px, 2em, 150%):");
                if (newSize) {
                    selectedElement.style.fontSize = newSize;
                    saveState();
                }
            }
        } else if (id === 'fontColor') {
            fontColorPicker.click();
        } else if (id === 'textAlign') {
            if (selectedElement) {
                alignmentIndex = (alignmentIndex + 1) % alignments.length;
                const editableElements = selectedElement.querySelectorAll('.editable');
                editableElements.forEach(el => {
                    el.style.textAlign = alignments[alignmentIndex];
                });
                saveState();
            }
        } else if (id === 'changeFont') {
            if (selectedElement) {
                fontIndex = (fontIndex + 1) % fonts.length;
                const editableElements = selectedElement.querySelectorAll('.editable');
                editableElements.forEach(el => {
                    el.style.fontFamily = fonts[fontIndex];
                });
                saveState();
            }
        } else if (id === 'makeTransparent') {
            if (selectedElement) {
                selectedElement.style.backgroundColor = 'rgba(43, 38, 34, 0)';
                saveState();
            }
        } else if (id === 'createColorTransition') {
            if (selectedElement) openColorTransitionPopup();
        } else if (id === 'createColorGradient') {
            if (selectedElement) openColorGradientPopup();
        } else if (id === 'createAnimation') {
            if (selectedElement) openAnimationPopup();
        } else if (id === 'toggleLoop') {
            if (selectedElement) {
                const mediaElement = selectedElement.querySelector('video, audio');
                if (mediaElement) {
                    mediaElement.loop = !mediaElement.loop;
                    alert(`Looping ${mediaElement.loop ? 'enabled' : 'disabled'} for this element.`);
                }
            }
        } else if (id === 'toggleBorder') {
            if (selectedElement) {
                const currentBorder = selectedElement.style.border;
                selectedElement.style.border = currentBorder === '1px solid #bdc3c7' ? 'none' : '1px solid #bdc3c7';
            }
        } else if (id === 'moveForward') {
            if (selectedElement) {
                selectedElement.style.zIndex = (parseInt(selectedElement.style.zIndex) || 0) + 1;
            }
        } else if (id === 'moveBackward') {
            if (selectedElement) {
                selectedElement.style.zIndex = (parseInt(selectedElement.style.zIndex) || 0) - 1;
            }
        } else if (id === 'deleteElement') {
            if (selectedElement) {
                selectedElement.remove();
                saveState();
            }
        }
        contextMenu.style.display = 'none';
    });

    function createElement(type) {
        saveState();

        const element = document.createElement('div');
        element.className = 'element';
        element.style.left = '10px';
        element.style.top = '10px';
        element.style.width = '200px';
        element.style.height = '100px';
        element.style.backgroundColor = getRandomColor(); // Random background color from custom colors

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
                element.querySelector('video').addEventListener('pointerdown', (e) => e.stopPropagation());
                break;
            case 'audio':
                element.innerHTML = '<audio controls><source src="https://www.w3schools.com/html/horse.ogg" type="audio/ogg">Your browser does not support the audio element.</audio>';
                element.querySelector('audio').addEventListener('pointerdown', (e) => e.stopPropagation());
                break;
            case 'youtube':
                const youtubeUrl = prompt("Enter the YouTube URL:");
                const youtubeID = extractYouTubeID(youtubeUrl);
                if (youtubeID) {
                    element.innerHTML = `<iframe src="https://www.youtube.com/embed/${youtubeID}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                } else {
                    alert("Invalid YouTube URL.");
                }
                break;
            case 'colorTransition':
                openColorTransitionPopup();
                selectedElement = element;
                break;
            case 'colorGradient':
                openColorGradientPopup();
                selectedElement = element;
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

        element.addEventListener('pointerdown', startDragging);
        element.addEventListener('contextmenu', showContextMenu);
        resizeHandle.addEventListener('pointerdown', startResizing);
        canvas.appendChild(element);
    }

    function startDragging(e) {
        if (e.target.className === 'resize-handle' || isLocked) return;
        draggedElement = e.target.closest('.element');
        offset = {
            x: e.clientX - draggedElement.offsetLeft,
            y: e.clientY - draggedElement.offsetTop
        };

        // Long press detection for touch screens
        let longPressTimer;
        const longPressDuration = 500; // Duration in ms for detecting a long press

        const startLongPressTimer = () => {
            longPressTimer = setTimeout(() => {
                showContextMenu(e);
            }, longPressDuration);
        };

        const clearLongPressTimer = () => {
            clearTimeout(longPressTimer);
        };

        if (e.pointerType === 'touch') {
            startLongPressTimer();
            document.addEventListener('pointermove', clearLongPressTimer);
            document.addEventListener('pointerup', clearLongPressTimer);
        }

        document.addEventListener('pointermove', drag);
        document.addEventListener('pointerup', stopDragging);
    }

    let lastPointerMoveTime = 0;
    function drag(e) {
        if (!draggedElement) return;
        const now = Date.now();
        if (now - lastPointerMoveTime > 50) { // Throttle to 20 FPS
            draggedElement.style.left = `${e.clientX - offset.x}px`;
            draggedElement.style.top = `${e.clientY - offset.y}px`;

            if (gridEnabled) {
                const gridSize = 20;
                const left = Math.round((e.clientX - offset.x) / gridSize) * gridSize;
                const top = Math.round((e.clientY - offset.y) / gridSize) * gridSize;
                draggedElement.style.left = `${left}px`;
                draggedElement.style.top = `${top}px`;
            }
            lastPointerMoveTime = now;
        }
    }

    function stopDragging() {
        draggedElement = null;
        document.removeEventListener('pointermove', drag);
        document.removeEventListener('pointerup', stopDragging);
    }

    function startResizing(e) {
        if (isLocked) return;
        e.stopPropagation();
        isResizing = true;
        selectedElement = e.target.parentElement;
        document.addEventListener('pointermove', resize);
        document.addEventListener('pointerup', stopResizing);
    }

    function resize(e) {
        if (!isResizing) return;
        const newWidth = e.clientX - selectedElement.offsetLeft;
        const newHeight = e.clientY - selectedElement.offsetTop;
        selectedElement.style.width = `${newWidth}px`;
        selectedElement.style.height = `${newHeight}px`;

        if (gridEnabled) {
            const gridSize = 20;
            const width = Math.round(newWidth / gridSize) * gridSize;
            const height = Math.round(newHeight / gridSize) * gridSize;
            selectedElement.style.width = `${width}px`;
            selectedElement.style.height = `${height}px`;
        }
    }

    function stopResizing() {
        isResizing = false;
        document.removeEventListener('pointermove', resize);
        document.removeEventListener('pointerup', stopResizing);
    }

    function showContextMenu(e) {
        e.preventDefault();
        if (isLocked) return;
        selectedElement = e.target.closest('.element');
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
    }

    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });

    document.getElementById('changeColor').addEventListener('click', () => {
        if (selectedElement) {
            openColorPopup();
        }
    });

    applyColorBtn.addEventListener('click', () => {
        if (selectedElement) {
            const hex = hexInput.value;
            const transparency = 100 - transparencyInput.value;  // Correct transparency handling
            if (/^#[0-9A-F]{6}$/i.test(hex) && transparency >= 0 && transparency <= 100) {
                const rgba = hexToRgba(hex, transparency);
                changeElementColor(selectedElement, rgba);
            }
        }
        closeColorPopup();
    });

    function changeElementColor(element, color) {
        const svg = element.querySelector('svg');
        if (svg) {
            const shapes = svg.querySelectorAll('rect, circle, line, polygon');
            shapes.forEach(shape => {
                if (shape.tagName === 'line') {
                    shape.setAttribute('stroke', color);
                } else {
                    shape.setAttribute('fill', color);
                }
            });
        } else {
            element.style.backgroundColor = color;
        }
        saveState();
    }

    document.getElementById('rotateElement').addEventListener('click', () => {
        if (selectedElement) {
            const currentRotation = selectedElement.dataset.rotation || 0;
            const newRotation = (parseInt(currentRotation) + 5) % 360;
            selectedElement.style.transform = `rotate(${newRotation}deg)`;
            selectedElement.dataset.rotation = newRotation;
        }
    });

    document.getElementById('rotate90Element').addEventListener('click', () => {
        if (selectedElement) {
            const currentRotation = selectedElement.dataset.rotation || 0;
            const newRotation = (parseInt(currentRotation) + 90) % 360;
            selectedElement.style.transform = `rotate(${newRotation}deg)`;
            selectedElement.dataset.rotation = newRotation;
        }
    });

    document.getElementById('changeLinkedMedia').addEventListener('click', () => {
        if (selectedElement) {
            openMediaPopup();
        }
    });

    applyMediaBtn.addEventListener('click', () => {
        if (selectedElement) {
            const mediaUrl = mediaUrlInput.value;
            if (mediaUrl) {
                if (selectedElement.querySelector('button')) {
                    const buttonElement = selectedElement.querySelector('button');
                    buttonElement.addEventListener('click', () => {
                        if (buttonElement.dataset.toggled === 'true') {
                            const imgElement = selectedElement.querySelector('img');
                            if (imgElement) {
                                imgElement.remove();
                            }
                            buttonElement.dataset.toggled = 'false';
                        } else {
                            if (mediaUrl.match(/\.(jpeg|jpg|gif|png|svg|bmp)(\?|#|$)/i) != null) {
                                const imgElement = document.createElement('img');
                                imgElement.src = mediaUrl;
                                imgElement.style.position = 'absolute';
                                imgElement.style.left = '0';
                                imgElement.style.top = '0';
                                imgElement.style.width = '100%';
                                imgElement.style.height = '100%';
                                imgElement.style.pointerEvents = 'none';
                                selectedElement.appendChild(imgElement);
                                buttonElement.dataset.toggled = 'true';
                            } else {
                                window.open(mediaUrl, '_blank');
                            }
                        }
                    });
                } else {
                    if (mediaUrl.match(/\.(jpeg|jpg|gif|png|svg|bmp)(\?|#|$)/i) != null) {
                        const imgElement = document.createElement('img');
                        imgElement.src = mediaUrl;
                        imgElement.style.position = 'absolute';
                        imgElement.style.left = '0';
                        imgElement.style.top = '0';
                        imgElement.style.width = '100%';
                        imgElement.style.height = '100%';
                        imgElement.style.pointerEvents = 'none';
                        selectedElement.appendChild(imgElement);
                    } else if (mediaUrl.match(/\.(mp4|ogg|webm|mov)(\?|#|$)/i) != null) {
                        selectedElement.innerHTML = `<video width="100%" height="100%" controls><source src="${mediaUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
                        selectedElement.querySelector('video').addEventListener('pointerdown', (e) => e.stopPropagation());
                    } else if (mediaUrl.match(/\.(mp3|wav|ogg|flac)(\?|#|$)/i) != null) {
                        selectedElement.innerHTML = `<audio controls><source src="${mediaUrl}" type="audio/mpeg">Your browser does not support the audio element.</audio>`;
                        selectedElement.querySelector('audio').addEventListener('pointerdown', (e) => e.stopPropagation());
                    } else {
                        alert("Unsupported media type. Please use image, video, or audio URLs.");
                    }
                }
            }
            closeMediaPopup();
        }
    });

    searchBtn.addEventListener('click', () => {
        const query = searchQueryInput.value;
        if (query) {
            searchResults.innerHTML = '';
            fetch(`https://api.unsplash.com/search/photos?query=${query}&client_id=YOUR_UNSPLASH_ACCESS_KEY`)
                .then(response => response.json())
                .then(data => {
                    if (!data.results || !Array.isArray(data.results)) {
                        searchResults.innerHTML = '<div style="color:red">No results or API error.</div>';
                        return;
                    }
                    data.results.forEach(photo => {
                        const imgElement = document.createElement('img');
                        imgElement.src = photo.urls.small;
                        imgElement.alt = photo.alt_description;
                        imgElement.style.cursor = 'pointer';
                        imgElement.style.width = '100px';
                        imgElement.style.height = 'auto';
                        imgElement.addEventListener('click', () => {
                            mediaUrlInput.value = photo.urls.small;
                            searchResults.innerHTML = '';
                        });
                        searchResults.appendChild(imgElement);
                    });
                })
                .catch(err => {
                    searchResults.innerHTML = '<div style="color:red">Error fetching images.</div>';
                });
        }
    });

    document.getElementById('fontSize').addEventListener('click', () => {
        if (selectedElement) {
            const newSize = prompt("Enter the new font size (e.g., 16px, 2em, 150%):");
            if (newSize) {
                selectedElement.style.fontSize = newSize;
                saveState();
            }
        }
    });

    document.getElementById('fontColor').addEventListener('click', () => {
        fontColorPicker.click();
    });

    fontColorPicker.addEventListener('input', (event) => {
        if (selectedElement) {
            selectedElement.style.color = event.target.value;
            saveState();
        }
    });

    document.getElementById('textAlign').addEventListener('click', () => {
        if (selectedElement) {
            alignmentIndex = (alignmentIndex + 1) % alignments.length;
            const editableElements = selectedElement.querySelectorAll('.editable');
            editableElements.forEach(el => {
                el.style.textAlign = alignments[alignmentIndex];
            });
            saveState();
        }
    });

    document.getElementById('changeFont').addEventListener('click', () => {
        if (selectedElement) {
            fontIndex = (fontIndex + 1) % fonts.length;
            const editableElements = selectedElement.querySelectorAll('.editable');
            editableElements.forEach(el => {
                el.style.fontFamily = fonts[fontIndex];
            });
            saveState();
        }
    });

    document.getElementById('makeTransparent').addEventListener('click', () => {
        if (selectedElement) {
            selectedElement.style.backgroundColor = 'rgba(43, 38, 34, 0)';
            saveState();
        }
    });

    document.getElementById('createColorTransition').addEventListener('click', () => {
        if (selectedElement) {
            openColorTransitionPopup();
        }
    });

    document.getElementById('createColorGradient').addEventListener('click', () => {
        if (selectedElement) {
            openColorGradientPopup();
        }
    });

    document.getElementById('createAnimation').addEventListener('click', () => {
        if (selectedElement) {
            openAnimationPopup();
        }
    });

    // --- Improved Color Transition: Each element cycles independently ---
    applyTransitionBtn.addEventListener('click', () => {
        if (selectedElement) {
            const startColor = startColorInput.value;
            const endColor = endColorInput.value;
            const transitionTime = transitionTimeInput.value;

            selectedElement.style.transition = `background-color ${transitionTime}s ease-in-out`;
            selectedElement.style.backgroundColor = startColor;

            // Store transition info for stateManager
            selectedElement.dataset.colorTransition = JSON.stringify({
                startColor,
                endColor,
                transitionTime
            });

            // Clear any previous interval for this element
            import('./stateManager.js').then(({ setColorTransitionInterval, clearColorTransitionInterval }) => {
                clearColorTransitionInterval(selectedElement);
                let isStartColor = true;
                const intervalId = setInterval(() => {
                    selectedElement.style.backgroundColor = isStartColor ? endColor : startColor;
                    isStartColor = !isStartColor;
                }, transitionTime * 1000);
                setColorTransitionInterval(selectedElement, intervalId);
            });
        }
        closeColorTransitionPopup();
    });

    // --- Patch undo/redo to restore color transitions ---
    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            import('./stateManager.js').then(({ undo, setColorTransitionInterval, clearColorTransitionInterval }) => {
                undo(canvas, reattachEventListeners, setColorTransitionInterval, clearColorTransitionInterval);
            });
        } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
            event.preventDefault();
            import('./stateManager.js').then(({ redo, setColorTransitionInterval, clearColorTransitionInterval }) => {
                redo(canvas, reattachEventListeners, setColorTransitionInterval, clearColorTransitionInterval);
            });
        }
    });

    // Setup popups
    setupPopupEvents({
        colorPopup,
        colorTransitionPopup,
        colorGradientPopup,
        animationPopup,
        mediaPopup
    });

    // Replace open/close popup functions with popupManager usage
    function openColorPopup() {
        colorPicker.value = getRandomColor();
        hexInput.value = colorPicker.value;
        openPopup(colorPopup);
    }
    function closeColorPopup() { closePopup(colorPopup); }
    function openColorTransitionPopup() {
        startColorInput.value = getRandomColor();
        endColorInput.value = getRandomColor();
        openPopup(colorTransitionPopup);
    }
    function closeColorTransitionPopup() { closePopup(colorTransitionPopup); }
    function openColorGradientPopup() {
        startGradientColorInput.value = getRandomColor();
        endGradientColorInput.value = getRandomColor();
        openPopup(colorGradientPopup);
    }
    function closeColorGradientPopup() { closePopup(colorGradientPopup); }
    function openAnimationPopup() { openPopup(animationPopup); }
    function closeAnimationPopup() { closePopup(animationPopup); }
    function openMediaPopup() { openPopup(mediaPopup); }
    function closeMediaPopup() { closePopup(mediaPopup); }

    // Setup drag/resize logic
    // Replace startDragging, startResizing with dragResizeManager usage
    // Use setDragged, setOffset, setSelected to update local state
    function setDragged(el) { draggedElement = el; }
    function setOffset(val) { offset = val; }
    function setSelected(el) { selectedElement = el; }

    // Setup media drop and Unsplash search
    setupMediaDrop(canvas, createImageElement, createVideoElement, createAudioElement);
    setupUnsplashSearch(searchBtn, searchQueryInput, searchResults, mediaUrlInput);

    // --- Theme Selector ---
    // Add a button to open the theme selector popup
    const themeBtn = document.createElement('button');
    themeBtn.id = 'theme-btn';
    themeBtn.textContent = 'Theme';
    themeBtn.setAttribute('aria-haspopup', 'dialog');
    themeBtn.setAttribute('aria-controls', 'theme-popup');
    themeBtn.style.marginLeft = '8px';
    toolbar.appendChild(themeBtn);

    // Create the theme popup (if not present)
    let themePopup = document.getElementById('theme-popup');
    if (!themePopup) {
        themePopup = document.createElement('div');
        themePopup.id = 'theme-popup';
        themePopup.setAttribute('role', 'dialog');
        themePopup.setAttribute('aria-modal', 'true');
        themePopup.setAttribute('tabindex', '-1');
        themePopup.style.display = 'none';
        themePopup.style.position = 'fixed';
        themePopup.style.left = '50%';
        themePopup.style.top = '50%';
        themePopup.style.transform = 'translate(-50%, -50%)';
        themePopup.style.background = '#fff';
        themePopup.style.border = '2px solid #888';
        themePopup.style.borderRadius = '8px';
        themePopup.style.padding = '24px 16px 16px 16px';
        themePopup.style.zIndex = '10000';
        themePopup.style.minWidth = '320px';
        themePopup.innerHTML = `
            <h2 id="theme-popup-title" style="margin-top:0">Select a Color Theme</h2>
            <div style="margin-bottom:8px;">
                <label style="font-size:14px;cursor:pointer;">
                    <input type="checkbox" id="force-theme-override" style="margin-right:6px;vertical-align:middle;">Override all element backgrounds
                </label>
            </div>
            <div id="theme-swatches" style="display:flex; flex-direction:column; gap:16px;"></div>
            <button id="close-theme-popup" style="margin-top:16px;">Close</button>
        `;
        document.body.appendChild(themePopup);
    }

    // Example palettes (Material, Flat UI, Tailwind inspired)
    const colorThemes = [
        {
            name: 'Material',
            colors: ['#2196f3', '#e91e63', '#ffeb3b', '#4caf50', '#ff9800', '#9c27b0']
        },
        {
            name: 'Flat UI',
            colors: ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#e74c3c']
        },
        {
            name: 'Tailwind',
            colors: ['#0ea5e9', '#f59e42', '#10b981', '#f43f5e', '#6366f1', '#fbbf24']
        },
        {
            name: 'Dark',
            colors: ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4', '#22223b']
        },
        {
            name: 'Solarized',
            colors: ['#002b36', '#073642', '#586e75', '#b58900', '#cb4b16', '#2aa198', '#859900']
        },
        {
            name: 'Pastel',
            colors: ['#ffd6e0', '#e2f0cb', '#b5ead7', '#c7ceea', '#ffdac1', '#ffb7b2']
        },
        {
            name: 'Nord',
            colors: ['#2e3440', '#3b4252', '#434c5e', '#4c566a', '#8fbcbb', '#88c0d0', '#81a1c1', '#5e81ac']
        },
        {
            name: 'Monokai',
            colors: ['#272822', '#f92672', '#a6e22e', '#fd971f', '#66d9ef', '#f8f8f2', '#75715e']
        },
        {
            name: 'Vibrant',
            colors: ['#ff1744', '#f50057', '#d500f9', '#651fff', '#2979ff', '#00e676', '#ffd600']
        },
        {
            name: 'Muted',
            colors: ['#b0bec5', '#90a4ae', '#bdbdbd', '#a1887f', '#bcaaa4', '#cfd8dc']
        },
        {
            name: 'Grayscale',
            colors: ['#111', '#333', '#555', '#777', '#aaa', '#ccc', '#eee']
        },
        {
            name: 'Retro',
            colors: ['#f4e285', '#f4a259', '#5b8e7d', '#bc4b51', '#c9cba3', '#8cb369']
        },
        {
            name: 'Rainbow',
            colors: ['#ff0000', '#ff9900', '#ffee00', '#33cc33', '#0099ff', '#6633cc', '#cc33cc']
        },
        {
            name: 'Autumn',
            colors: ['#d2691e', '#ff7f50', '#ffb347', '#ffd700', '#b22222', '#8b4513']
        },
        {
            name: 'Spring',
            colors: ['#f7cac9', '#92a8d1', '#b5ead7', '#ffdac1', '#e2f0cb', '#c7ceea']
        },
        {
            name: 'Ocean',
            colors: ['#011f4b', '#03396c', '#005b96', '#6497b1', '#b3cde0', '#e0f7fa']
        },
        {
            name: 'Magic Key',
            colors: ['#2B2622', '#F9DEA2', '#8C8C8C', '#B5A642', '#FFFFFF', '#F9DEA2']
        }
    ];

    // Render swatches
    function renderThemeSwatches() {
        const swatches = themePopup.querySelector('#theme-swatches');
        swatches.innerHTML = '';
        colorThemes.forEach((theme, idx) => {
            const row = document.createElement('div');
            row.setAttribute('tabindex', '0');
            row.setAttribute('role', 'button');
            row.setAttribute('aria-label', `Apply ${theme.name} theme`);
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.cursor = 'pointer';
            row.style.outline = 'none';
            row.style.gap = '8px';
            row.style.padding = '4px 0';
            row.addEventListener('click', () => applyTheme(idx));
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    applyTheme(idx);
                }
            });
            // Palette preview bar
            const previewBar = document.createElement('div');
            previewBar.style.display = 'flex';
            previewBar.style.height = '28px';
            previewBar.style.borderRadius = '4px';
            previewBar.style.overflow = 'hidden';
            previewBar.style.boxShadow = '0 0 0 1px #ccc';
            theme.colors.forEach(color => {
                const swatch = document.createElement('div');
                swatch.style.width = `${100 / theme.colors.length}%`;
                swatch.style.height = '100%';
                swatch.style.background = color;
                previewBar.appendChild(swatch);
            });
            row.appendChild(previewBar);
            const label = document.createElement('span');
            label.textContent = theme.name;
            label.style.marginLeft = '12px';
            row.appendChild(label);
            swatches.appendChild(row);
        });
    }

    // Apply theme to canvas and all elements
    function applyTheme(idx) {
        const theme = colorThemes[idx];
        if (!theme) return;
        // Set canvas background
        canvas.style.background = theme.colors[0];
        // Check if override is selected
        const forceOverride = themePopup.querySelector('#force-theme-override').checked;
        // Set all element backgrounds (cycle through theme colors)
        const elements = canvas.querySelectorAll('.element');
        elements.forEach((el, i) => {
            if (forceOverride) {
                el.style.backgroundColor = theme.colors[(i + 1) % theme.colors.length];
            } else {
                // Only update if not transparent
                if (!el.style.backgroundColor || el.style.backgroundColor === '' || el.style.backgroundColor === 'rgba(43, 38, 34, 0)') {
                    el.style.backgroundColor = theme.colors[(i + 1) % theme.colors.length];
                }
            }
        });
        // Save theme in state for undo/redo
        saveState();
    }

    // Initial render
    renderThemeSwatches();
});