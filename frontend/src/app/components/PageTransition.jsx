"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const TRANSITION_DURATION = 250;

export default function PageTransition({ children }) {
  const pathname = usePathname();
  const latestChildrenRef = useRef(children);
  const isFirstRenderRef = useRef(true);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [animationState, setAnimationState] = useState("fade-in");

  useEffect(() => {
    latestChildrenRef.current = children;
  }, [children]);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      setDisplayedChildren(latestChildrenRef.current);
      return;
    }

    setAnimationState("fade-out");

    const timeout = setTimeout(() => {
      setDisplayedChildren(latestChildrenRef.current);
      setAnimationState("fade-in");
    }, TRANSITION_DURATION);

    return () => {
      clearTimeout(timeout);
    };
  }, [pathname]);

  return (
    <div
      className={`page-transition ${animationState}`}
      style={{ "--page-transition-duration": `${TRANSITION_DURATION}ms` }}
    >
      {displayedChildren}
    </div>
  );
}
