"use client";

import { useEffect, useState } from "react";

/**
 * Tracks vertical scroll position, whether the page has scrolled past a
 * threshold, and whether the user is scrolling down (vs. up) — handy for
 * hide-on-scroll navbars. `hidden` is true only while actively scrolling
 * down past the threshold; scrolling up (or being near the top) clears it.
 */
export function useScroll(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [y, setY] = useState(0);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const current = window.scrollY;
      setY(current);
      setScrolled(current > threshold);
      if (current <= threshold) {
        setHidden(false);
      } else if (current > lastY) {
        setHidden(true);
      } else if (current < lastY) {
        setHidden(false);
      }
      lastY = current;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return { scrolled, hidden, y };
}
