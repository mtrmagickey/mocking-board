// popupManager.js
// Handles all popup open/close logic and related event listeners

export function openPopup(popup) {
    popup.style.display = 'block';
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('tabindex', '-1');
    // Focus the first focusable element inside the popup
    const focusable = popup.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) {
        focusable.focus();
    } else if (popup.focus) {
        popup.focus();
    }
}

export function closePopup(popup) {
    popup.style.display = 'none';
    popup.removeAttribute('aria-modal');
    popup.removeAttribute('role');
    popup.removeAttribute('tabindex');
}

export function setupPopupEvents({
    colorPopup, colorTransitionPopup, colorGradientPopup, animationPopup, mediaPopup
}) {
    // Add close logic for all popups
    [colorPopup, colorTransitionPopup, colorGradientPopup, animationPopup, mediaPopup].forEach(popup => {
        if (!popup) return;
        const cancelBtn = popup.querySelector('.cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closePopup(popup));
        }
        // Trap focus inside popup
        popup.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const focusableEls = popup.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
                const first = focusableEls[0];
                const last = focusableEls[focusableEls.length - 1];
                if (e.shiftKey) {
                    if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
            if (e.key === 'Escape') {
                closePopup(popup);
            }
        });
    });
}
