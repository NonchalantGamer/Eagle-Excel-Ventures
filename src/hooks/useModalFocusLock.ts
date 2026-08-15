import { useEffect } from 'react';

// Global counter for active modals/drawers/popups
let activeModalCount = 0;

/**
 * useModalFocusLock hook
 * When a modal, popup, or drawer is active:
 * 1. Blurs the background page (#main-content-area, header, footer)
 * 2. Prevents all pointer events and user interactions on the background
 * 3. Locks body scrolling
 * 4. Listens for Escape key to close
 */
export function useModalFocusLock(isOpen: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    activeModalCount++;

    const mainContent = document.getElementById('main-content-area');
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');

    // Add locking class to body
    document.body.classList.add('menu-open-locked', 'modal-open-locked');

    // Add blur and disable interaction on the main page background
    if (mainContent) mainContent.classList.add('menu-backdrop-blurred');
    if (header) header.classList.add('menu-backdrop-blurred');
    if (footer) footer.classList.add('menu-backdrop-blurred');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      window.removeEventListener('keydown', handleKeyDown);

      if (activeModalCount === 0) {
        document.body.classList.remove('menu-open-locked', 'modal-open-locked');
        if (mainContent) mainContent.classList.remove('menu-backdrop-blurred');
        if (header) header.classList.remove('menu-backdrop-blurred');
        if (footer) footer.classList.remove('menu-backdrop-blurred');
      }
    };
  }, [isOpen, onClose]);
}
