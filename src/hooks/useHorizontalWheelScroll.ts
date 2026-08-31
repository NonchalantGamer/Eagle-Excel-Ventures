import { useEffect } from 'react';

/**
 * Checks if an element is a horizontally scrollable container
 * and can still scroll in the given direction.
 */
function getHorizontalScrollContainer(
  target: HTMLElement | null,
  deltaY: number
): HTMLElement | null {
  let curr: HTMLElement | null = target;

  while (curr && curr !== document.body && curr !== document.documentElement) {
    // Check if the element has horizontal overflow
    const hasHorizontalOverflow = curr.scrollWidth > curr.clientWidth + 1;

    if (hasHorizontalOverflow) {
      const style = window.getComputedStyle(curr);
      const overflowX = style.overflowX;

      if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') {
        const hasVerticalOverflow = curr.scrollHeight > curr.clientHeight + 1;
        const overflowY = style.overflowY;
        const isVerticallyScrollable =
          hasVerticalOverflow && (overflowY === 'auto' || overflowY === 'scroll');

        // Check if the container can scroll horizontally in the direction of deltaY
        const canScrollRight = deltaY > 0 && curr.scrollLeft < curr.scrollWidth - curr.clientWidth - 1;
        const canScrollLeft = deltaY < 0 && curr.scrollLeft > 1;

        // If the container is primarily a horizontal list / table or cannot scroll vertically
        if (!isVerticallyScrollable && (canScrollRight || canScrollLeft)) {
          return curr;
        }

        // If it can scroll both directions (e.g. 2D table or code block), prioritize horizontal if vertical is constrained or at bounds
        if (isVerticallyScrollable && (canScrollRight || canScrollLeft)) {
          const canScrollDown = deltaY > 0 && curr.scrollTop < curr.scrollHeight - curr.clientHeight - 1;
          const canScrollUp = deltaY < 0 && curr.scrollTop > 1;

          // If it cannot scroll vertically in this direction, convert to horizontal scroll
          if (!canScrollDown && !canScrollUp) {
            return curr;
          }
        }
      }
    }

    curr = curr.parentElement;
  }

  return null;
}

/**
 * Global hook to enable seamless horizontal scrolling via mouse wheel.
 * When the mouse cursor is over any horizontally scrollable list, ribbon,
 * thumbnail gallery, or table, mouse wheel events smoothly scroll it horizontally.
 */
export function useHorizontalWheelScroll() {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // If the event is already primarily horizontal (trackpad swipe or horizontal tilt wheel), let default happen
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.deltaY === 0) {
        return;
      }

      // If user is holding Shift or Ctrl/Meta (e.g. zooming), don't intercept
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const container = getHorizontalScrollContainer(target, e.deltaY);
      if (!container) return;

      // Calculate pixel delta based on deltaMode
      let delta = e.deltaY;
      if (e.deltaMode === 1) {
        // DOM_DELTA_LINE (Firefox default)
        delta *= 28;
      } else if (e.deltaMode === 2) {
        // DOM_DELTA_PAGE
        delta *= container.clientWidth * 0.8;
      }

      // Prevent vertical page scroll and perform horizontal scroll seamlessly
      e.preventDefault();
      container.scrollLeft += delta;
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);
}
