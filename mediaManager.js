// mediaManager.js
// Handles file drops, Unsplash search, and media URL logic

export function setupMediaDrop(canvas, createImage, createVideo, createAudio) {
    canvas.addEventListener('dragover', (e) => e.preventDefault());
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                if (file.type.startsWith('image/')) {
                    createImage(dataUrl);
                } else if (file.type.startsWith('video/')) {
                    createVideo(dataUrl);
                } else if (file.type.startsWith('audio/')) {
                    createAudio(dataUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

export function setupUnsplashSearch(searchBtn, searchQueryInput, searchResults, mediaUrlInput) {
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
}
