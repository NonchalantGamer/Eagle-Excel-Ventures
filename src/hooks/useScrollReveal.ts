import { useEffect, useRef } from 'react';

/**
 * High-performance hook for silky-smooth scroll reveal animations.
 * Utilizes a shared, lightweight IntersectionObserver with hardware-accelerated transitions
 * and automatic unobserve once elements are in view to maximize 60/120 FPS scrolling performance.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(deps: any[] = []) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    // Check if browser supports IntersectionObserver
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback: immediately reveal all elements
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observerCallback: IntersectionObserverCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          // Once revealed, unobserve to free up browser memory and compositor cycles
          observer.unobserve(entry.target);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '40px 0px 40px 0px',
      threshold: 0.02,
    });

    let rafId: number | null = null;

    const observePendingElements = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rootNode = containerRef.current || document;
        const elements = rootNode.querySelectorAll('.reveal-on-scroll:not(.is-revealed)');
        
        elements.forEach((el) => {
          observer.observe(el);
        });

        if (containerRef.current && !containerRef.current.classList.contains('is-revealed')) {
          observer.observe(containerRef.current);
        }
      });
    };

    // Initial check
    observePendingElements();

    // Secondary check for dynamically loaded / lazy components
    const timer = setTimeout(observePendingElements, 120);

    // MutationObserver throttled with requestAnimationFrame to avoid main-thread frame drops
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        observePendingElements();
      });
      mutationObserver.observe(containerRef.current || document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(timer);
      observer.disconnect();
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
    };
  }, deps);

  return containerRef;
}
