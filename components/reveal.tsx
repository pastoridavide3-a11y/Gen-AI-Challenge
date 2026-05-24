"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Fades + lifts its children into place the first time they enter the viewport
// (or immediately, if already visible on mount). Used to give the dashboard and
// CV pages a quick, staggered settle — pass `delay` to cascade siblings.
//
// Motion conveys "this was just composed for you"; it never blocks interaction.
// Under prefers-reduced-motion the content shows instantly with no transform.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Stagger offset in ms, applied once the element is revealed. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-shown={shown}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={cn(
        "translate-y-2 opacity-0 transition-[opacity,transform] duration-[450ms] ease-out-quint",
        "data-[shown=true]:translate-y-0 data-[shown=true]:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
