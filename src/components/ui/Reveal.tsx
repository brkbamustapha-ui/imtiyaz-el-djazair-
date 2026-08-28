"use client";

import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Direction = "up" | "down" | "left" | "right" | "fade" | "scale";

const OFFSET: Record<Direction, { x?: number; y?: number; scale?: number }> = {
  up: { y: 28 },
  down: { y: -28 },
  left: { x: 34 },
  right: { x: -34 },
  fade: {},
  scale: { scale: 0.94 },
};

const VIEWPORT = { once: true, amount: 0.18, margin: "0px 0px -60px 0px" } as const;

/**
 * Whether the entrance animation may run yet.
 *
 * This is the whole point of the hook. Driving the animation with framer's
 * `initial="hidden"` makes the SERVER render every wrapped element with an
 * inline `opacity: 0`, and only JavaScript ever removes it. On a slow phone
 * that means the visitor stares at a blank page until the bundle lands, and if
 * the bundle never lands — blocked, errored, JS off — the page stays blank for
 * good. The header renders, nothing else does.
 *
 * So the markup ships visible (`initial={false}`) and the animation is applied
 * afterwards, only once we are on the client. Anything already on screen at
 * that moment simply stays visible; anything below the fold is put into its
 * hidden state while nobody can see it, then animates in on scroll as intended.
 */
function useAnimationReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}

/** Scroll-triggered entrance. Collapses to a plain div when motion is reduced. */
export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.7,
  className,
  once = true,
  as = "div",
}: {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  as?: "div" | "section" | "li" | "article" | "span";
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { ...VIEWPORT, once });
  const ready = useAnimationReady();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const variants: Variants = {
    hidden: { opacity: 0, ...OFFSET[direction] },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { duration, delay, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={false}
      animate={!ready || inView ? "visible" : "hidden"}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}

/** Staggers direct children that are wrapped in <RevealItem>. */
export function RevealGroup({
  children,
  className,
  stagger = 0.09,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  as?: "div" | "ul" | "ol" | "section";
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.12 });
  const ready = useAnimationReady();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={false}
      animate={!ready || inView ? "visible" : "hidden"}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </MotionTag>
  );
}

export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  // No `initial` here either: the item inherits "visible"/"hidden" from the
  // group above it, which is what staggers them.
  return (
    <MotionTag
      className={className}
      initial={false}
      variants={{
        hidden: { opacity: 0, y: 26 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.66, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </MotionTag>
  );
}
