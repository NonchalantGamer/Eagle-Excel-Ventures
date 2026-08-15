import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Calculate scroll progress percentage (0 - 100)
      if (docHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrollY / docHeight) * 100));
        setScrollProgress(progress);
      }

      // Show button when user has scrolled down past 280px
      if (scrollY > 280) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check in case page is already scrolled
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // SVG circular progress calculation
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div
      id="scroll-to-top-container"
      className={`fixed bottom-5 left-5 sm:bottom-7 sm:left-7 z-30 transition-all duration-300 transform ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
          : 'opacity-0 translate-y-6 pointer-events-none scale-90'
      }`}
    >
      <button
        id="scroll-to-top-btn"
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll back to top of site"
        title="Back to top"
        className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-white/95 dark:bg-[#181818]/95 text-slate-800 dark:text-zinc-100 shadow-xl dark:shadow-2xl border border-slate-200/80 dark:border-white/10 hover:border-[#F27D26] dark:hover:border-[#F27D26] hover:bg-slate-50 dark:hover:bg-[#202020] hover:text-[#F27D26] dark:hover:text-[#F27D26] focus:outline-none focus:ring-2 focus:ring-[#F27D26] focus:ring-offset-2 dark:focus:ring-offset-[#121212] transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
      >
        {/* Subtle circular scroll progress ring */}
        <svg
          className="absolute inset-0 w-12 h-12 -rotate-90 pointer-events-none"
          viewBox="0 0 44 44"
          aria-hidden="true"
        >
          <circle
            cx="22"
            cy="22"
            r={radius}
            className="text-slate-200/50 dark:text-white/5"
            strokeWidth="2.5"
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx="22"
            cy="22"
            r={radius}
            className="text-[#F27D26] transition-[stroke-dashoffset] duration-150 ease-out"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>

        {/* Upward Arrow Icon */}
        <ArrowUp className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5" />

        {/* Tooltip on hover (positioned to stay in-bounds on bottom-left) */}
        <span className="absolute bottom-full mb-2 left-0 sm:left-1/2 sm:-translate-x-1/2 px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900/90 dark:bg-black/90 rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap backdrop-blur-xs">
          Back to top
        </span>
      </button>
    </div>
  );
};
