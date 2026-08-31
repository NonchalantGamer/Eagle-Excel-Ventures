import { useEffect } from 'react';

/**
 * Traverses up the DOM tree from the event target to find if the cursor
 * is positioned over a horizontally scrollable list/container.
 */
function getHorizontalScrollContainer(target: HTMLElement | null): HTMLElement | null {
  let curr: HTMLElement | null = target;

  while (curr && curr !== document.body && curr !== document.documentElement) {
    const tagName = curr.tagName.toLowerCase();
    // Do not intercept text areas or standard text inputs
    if (tagName === 'textarea' || (tagName === 'input' && (curr as HTMLInputElement).type === 'text')) {
      return null;
    }

    // Check if the element has horizontal overflow
    const hasHorizontalOverflow = curr.scrollWidth > curr.clientWidth + 1;

    if (hasHorizontalOverflow) {
      const style = window.getComputedStyle(curr);
      const overflowX = style.overflowX;

      if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') {
        const hasVerticalOverflow = curr.scrollHeight > curr.clientHeight + 1;
        const overflowY = style.overflowY;
        const isVerticallyScrollable =
          hasVerticalOverflow && (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay');

        // If the container is strictly horizontal (no vertical scroll)
        if (!isVerticallyScrollable) {
          return curr;
        }

        // If the container has both, treat as horizontal if horizontal ratio exceeds vertical
        const hRatio = curr.scrollWidth / curr.clientWidth;
        const vRatio = curr.scrollHeight / curr.clientHeight;
        if (hRatio >= vRatio) {
          return curr;
        }
      }
    }

    curr = curr.parentElement;
  }

  return null;
}

/**
 * Global hook to enforce strict scroll isolation:
 * - As long as the mouse is over a horizontal list, ONLY horizontal scroll is possible
 *   (vertical page scrolling is completely locked and wheel motion is converted to horizontal).
 * - When the mouse is outside horizontal lists, standard vertical scrolling proceeds normally.
 */
export function useHorizontalWheelScroll() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // If user is holding Ctrl or Meta (e.g. browser zoom), do not intercept
      if (e.ctrlKey || e.metaKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const container = getHorizontalScrollContainer(target);
      if (!container) {
        // Cursor is NOT over a horizontal list -> normal vertical scroll proceeds, no horizontal scroll
        return;
      }

      // Cursor IS over a horizontal list:
      // STRICT RULE: Lock out vertical scroll completely while mouse is placed on the horizontal list
      e.preventDefault();

      // Determine delta (from vertical wheel deltaY, shift+wheel, or horizontal trackpad deltaX)
      let delta = 0;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && e.deltaX !== 0) {
        delta = e.deltaX;
      } else {
        delta = e.deltaY;
      }

      if (delta === 0) return;

      // Normalize delta based on deltaMode (pixel vs line vs page)
      if (e.deltaMode === 1) {
        // DOM_DELTA_LINE (e.g. standard notched mouse wheel on Windows/Linux/Firefox)
        delta *= 28;
      } else if (e.deltaMode === 2) {
        // DOM_DELTA_PAGE
        delta *= container.clientWidth * 0.75;
      }

      // Perform the horizontal scroll
      container.scrollLeft += delta;
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);
}

