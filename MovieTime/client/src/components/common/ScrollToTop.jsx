import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowUp } from "lucide-react";

/**
 * ScrollToTop
 * - :root must define --color-primary and --color-primary-dull
 * - Props:
 *    threshold (px) default 300
 */
export default function ScrollToTop({ threshold = 300 }) {
  const [visible, setVisible] = useState(false);
  const ticking = useRef(false);

  const checkScroll = useCallback(() => {
    const scrolled = window.scrollY || document.documentElement.scrollTop;
    setVisible(scrolled >= threshold);
    ticking.current = false;
  }, [threshold]);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(checkScroll);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    checkScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [checkScroll]);

  const handleClick = useCallback(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) window.scrollTo({ top: 0 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!visible) return null;

  // inline gradient using CSS variables so it works even if Tailwind config isn't set
  const gradient = "linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-dull) 100%)";

  return (
    <button
      aria-label="Scroll to top"
      title="Back to top"
      onClick={handleClick}
      className="
        fixed z-50 right-6 bottom-6 md:right-8 md:bottom-8
        inline-flex items-center justify-center
        w-12 h-12 md:w-14 md:h-14 rounded-full
        text-white shadow-xl
        hover:-translate-y-0.5 active:scale-95
        transition transform duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
      "
      style={{
        background: gradient,
        WebkitTapHighlightColor: "transparent",
        // fallback if variables are missing:
        // backgroundColor: "var(--color-primary, #f84565)"
      }}
    >
      <ArrowUp className="w-5 h-5" />
      <span className="sr-only">Back to top</span>
    </button>
  );
}
