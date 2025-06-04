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

    const undoStack = [];
    const redoStack = [];

    function saveState() {
        const state = canvas.innerHTML;
        undoStack.push(state);
        redoStack.length = 0; // Clear redo stack
    }

    function undo() {
        if (undoStack.length > 0) {
            redoStack.push(canvas.innerHTML);
            const prevState = undoStack.pop();
            canvas.innerHTML = prevState;
            reattachEventListeners();
        }
    }

    function redo() {
        if (redoStack.length > 0) {
            undoStack.push(canvas.innerHTML);
            const nextState = redoStack.pop();
            canvas.innerHTML = nextState;
            reattachEventListeners();
        }
    }

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

    function getRandomColor() {
        const colors = ['#f9dea2', '#cc0000', '#ffffff', '#8c8c8c', '#FAC800', '#6F7D1C', '#2b2622', '#b5a643', '#008473', '#990000', 'transparent'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    elementButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!isLocked) {
                const type = button.getAttribute('data-type');
                createElement(type);
            }
        });
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
                            if (mediaUrl.match(/\.(jpeg|jpg|gif|png|svg|bmp)$/i) != null) {
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
                    if (mediaUrl.match(/\.(jpeg|jpg|gif|png|svg|bmp)$/i) != null) {
                        const imgElement = document.createElement('img');
                        imgElement.src = mediaUrl;
                        imgElement.style.position = 'absolute';
                        imgElement.style.left = '0';
                        imgElement.style.top = '0';
                        imgElement.style.width = '100%';
                        imgElement.style.height = '100%';
                        imgElement.style.pointerEvents = 'none';
                        selectedElement.appendChild(imgElement);
                    } else if (mediaUrl.match(/\.(mp4|ogg|webm|mov)$/i) != null) {
                        selectedElement.innerHTML = `<video width="100%" height="100%" controls><source src="${mediaUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
                        selectedElement.querySelector('video').addEventListener('pointerdown', (e) => e.stopPropagation());
                    } else if (mediaUrl.match(/\.(mp3|wav|ogg|flac)$/i) != null) {
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

    function openColorPopup() {
        colorPopup.style.display = 'block';
    }

    function closeColorPopup() {
        colorPopup.style.display = 'none';
    }

    function openColorTransitionPopup() {
        colorTransitionPopup.style.display = 'block';
    }

    function closeColorTransitionPopup() {
        colorTransitionPopup.style.display = 'none';
    }

    function openColorGradientPopup() {
        colorGradientPopup.style.display = 'block';
    }

    function closeColorGradientPopup() {
        colorGradientPopup.style.display = 'none';
    }

    function openAnimationPopup() {
        animationPopup.style.display = 'block';
    }

    function closeAnimationPopup() {
        animationPopup.style.display = 'none';
    }

    function openMediaPopup() {
        mediaPopup.style.display = 'block';
    }

    function closeMediaPopup() {
        mediaPopup.style.display = 'none';
    }

    applyAnimationBtn.addEventListener('click', () => {
        if (selectedElement) {
            const animationType = animationTypeSelect.value;
            const animationPreset = animationPresetSelect.value;
            const duration = animationDurationInput.value;
            selectedElement.style.animation = `${animationType}${animationPreset} ${duration}s infinite alternate`;
        }
        closeAnimationPopup();
    });

    applyTransitionBtn.addEventListener('click', () => {
        if (selectedElement) {
            const startColor = startColorInput.value;
            const endColor = endColorInput.value;
            const transitionTime = transitionTimeInput.value;

            selectedElement.style.transition = `background-color ${transitionTime}s ease-in-out`;
            selectedElement.style.backgroundColor = startColor;

            let isStartColor = true;
            setInterval(() => {
                selectedElement.style.backgroundColor = isStartColor ? endColor : startColor;
                isStartColor = !isStartColor;
            }, transitionTime * 1000);
        }
        closeColorTransitionPopup();
    });

    applyGradientBtn.addEventListener('click', () => {
        if (selectedElement) {
            const startGradientColor = startGradientColorInput.value;
            const endGradientColor = endGradientColorInput.value;
            const gradientDirection = gradientDirectionSelect.value;

            selectedElement.style.background = `linear-gradient(${gradientDirection}, ${startGradientColor}, ${endGradientColor})`;
        }
        closeColorGradientPopup();
    });

    function rgbToHex(rgb) {
        const rgbArray = rgb.match(/\d+/g).map(Number);
        return `#${((1 << 24) + (rgbArray[0] << 16) + (rgbArray[1] << 8) + rgbArray[2]).toString(16).slice(1).toUpperCase()}`;
    }

    colorPicker.addEventListener('input', (event) => {
        hexInput.value = event.target.value;
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

    document.getElementById('toggleLoop').addEventListener('click', () => {
        if (selectedElement) {
            const mediaElement = selectedElement.querySelector('video, audio');
            if (mediaElement) {
                mediaElement.loop = !mediaElement.loop;
                alert(`Looping ${mediaElement.loop ? 'enabled' : 'disabled'} for this element.`);
            }
        }
    });

    document.getElementById('toggleBorder').addEventListener('click', () => {
        if (selectedElement) {
            const currentBorder = selectedElement.style.border;
            selectedElement.style.border = currentBorder === '1px solid #bdc3c7' ? 'none' : '1px solid #bdc3c7';
        }
    });

    document.getElementById('moveForward').addEventListener('click', () => {
        if (selectedElement) {
            selectedElement.style.zIndex = (parseInt(selectedElement.style.zIndex) || 0) + 1;
        }
    });

    document.getElementById('moveBackward').addEventListener('click', () => {
        if (selectedElement) {
            selectedElement.style.zIndex = (parseInt(selectedElement.style.zIndex) || 0) - 1;
        }
    });

    document.getElementById('deleteElement').addEventListener('click', () => {
        if (selectedElement) {
            selectedElement.remove();
            saveState();
        }
    });

    loadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const savedLayout = JSON.parse(e.target.result);
                if (savedLayout) {
                    canvas.innerHTML = '';
                    savedLayout.forEach(el => {
                        const element = document.createElement('div');
                        element.className = 'element';
                        element.style.left = el.left;
                        element.style.top = el.top;
                        element.style.width = el.width;
                        element.style.height = el.height;
                        element.style.backgroundColor = el.backgroundColor;
                        element.style.zIndex = el.zIndex;
                        element.style.fontSize = el.fontSize;
                        element.style.color = el.color;
                        element.style.textAlign = el.textAlign;
                        element.style.transform = `rotate(${el.rotation}deg)`;
                        element.style.animation = el.animation;
                        element.innerHTML = el.content;
                        
                        const resizeHandle = document.createElement('div');
                        resizeHandle.className = 'resize-handle';
                        element.appendChild(resizeHandle);

                        element.addEventListener('pointerdown', startDragging);
                        element.addEventListener('contextmenu', showContextMenu);
                        resizeHandle.addEventListener('pointerdown', startResizing);
                        const iframeElement = element.querySelector('iframe');
                        if (iframeElement) {
                            iframeElement.addEventListener('pointerdown', (e) => e.stopPropagation());
                        }
                        const mediaElements = element.querySelectorAll('video, audio');
                        mediaElements.forEach(media => {
                            media.addEventListener('pointerdown', (e) => e.stopPropagation());
                        });
                        canvas.appendChild(element);
                    });
                    alert('Layout loaded!');
                    saveState();
                } else {
                    alert('Invalid layout file.');
                }
            };
            reader.readAsText(file);
        }
    });

    clearBtn.addEventListener('click', () => {
        canvas.innerHTML = '';
        saveState();
    });

    exportBtn.addEventListener('click', () => {
        const elements = Array.from(canvas.children).map(el => ({
            type: el.firstElementChild ? el.firstElementChild.tagName.toLowerCase() : '',
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

    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            canvasContainer.style.marginLeft = '0';
        } else {
            canvasContainer.style.marginLeft = '250px';
        }
    });

    toolbar.addEventListener('mouseover', () => {
        toolbar.classList.remove('collapsed');
    });

    toolbar.addEventListener('mouseout', () => {
        toolbar.classList.add('collapsed');
    });

    backgroundBtn.addEventListener('click', () => {
        openColorPopup();
        selectedElement = canvas;  // Set the canvas as the selected element to change background color
    });

    document.getElementById('toggle-grid-btn').addEventListener('click', () => {
        const grid = document.getElementById('grid');
        grid.style.display = grid.style.display === 'none' ? 'block' : 'none';
    });

    function hexToRgba(hex, transparency) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const a = transparency / 100;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    function extractYouTubeID(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            undo();
        } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
            event.preventDefault();
            redo();
        }
    });

    lockBtn.addEventListener('click', () => {
        isLocked = !isLocked;
        lockBtn.textContent = isLocked ? 'Unlock' : 'Lock';
        const elements = document.querySelectorAll('.element');
        elements.forEach(el => {
            el.classList.toggle('locked', isLocked);
            el.contentEditable = !isLocked;
            el.querySelectorAll('.editable').forEach(editable => {
                editable.contentEditable = !isLocked;
            });
        });
    });

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                if (file.type.startsWith('image/')) {
                    createImageElement(dataUrl);
                } else if (file.type.startsWith('video/')) {
                    createVideoElement(dataUrl);
                } else if (file.type.startsWith('audio/')) {
                    createAudioElement(dataUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    });

    function createImageElement(dataUrl) {
        const element = document.createElement('div');
        element.className = 'element';
        element.style.left = '10px';
        element.style.top = '10px';
        element.style.width = '200px';
        element.style.height = '100px';
        element.style.backgroundColor = 'transparent';
        element.innerHTML = `<img src="${dataUrl}" alt="Dropped Image">`;
        attachElementEvents(element);
        canvas.appendChild(element);
        saveState();
    }

    function createVideoElement(dataUrl) {
        const element = document.createElement('div');
        element.className = 'element';
        element.style.left = '10px';
        element.style.top = '10px';
        element.style.width = '200px';
        element.style.height = '100px';
        element.style.backgroundColor = 'transparent';
        element.innerHTML = `<video width="100%" height="100%" controls><source src="${dataUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
        element.querySelector('video').addEventListener('pointerdown', (e) => e.stopPropagation());
        attachElementEvents(element);
        canvas.appendChild(element);
        saveState();
    }

    function createAudioElement(dataUrl) {
        const element = document.createElement('div');
        element.className = 'element';
        element.style.left = '10px';
        element.style.top = '10px';
        element.style.width = '200px';
        element.style.height = '100px';
        element.style.backgroundColor = 'transparent';
        element.innerHTML = `<audio controls><source src="${dataUrl}" type="audio/mpeg">Your browser does not support the audio element.</audio>`;
        element.querySelector('audio').addEventListener('pointerdown', (e) => e.stopPropagation());
        attachElementEvents(element);
        canvas.appendChild(element);
        saveState();
    }

    function attachElementEvents(element) {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        element.appendChild(resizeHandle);

        element.addEventListener('pointerdown', startDragging);
        element.addEventListener('contextmenu', showContextMenu);
        resizeHandle.addEventListener('pointerdown', startResizing);
    }
});
