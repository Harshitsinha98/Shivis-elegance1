"use client";

import { useEffect, useState } from "react";

/** Tracks vertical scroll position and whether the page has scrolled past a threshold. */
export function useScroll(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  const [y, setY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setY(window.scrollY);
      setScrolled(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return { scrolled, y };
}
