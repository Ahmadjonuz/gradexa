"use client";

import { useEffect, useId, useState } from "react";
import { REVEAL_DURATION, ribbonSvg } from "@/public/brand/gradexa-ribbon.mjs";

type MarkProps = {
  animated?: boolean;
  decorative?: boolean;
  className?: string;
};

export function GradexaMark({ animated = false, decorative = false, className = "" }: MarkProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [time, setTime] = useState(REVEAL_DURATION);

  useEffect(() => {
    if (!animated) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = (now - start) / 1000;
      setTime(elapsed);
      if (elapsed < 3.25) frame = requestAnimationFrame(tick);
      else setTime(REVEAL_DURATION);
    };
    const update = () => {
      cancelAnimationFrame(frame);
      if (preference.matches) setTime(REVEAL_DURATION);
      else { start = 0; frame = requestAnimationFrame(tick); }
    };
    update();
    preference.addEventListener("change", update);
    return () => { cancelAnimationFrame(frame); preference.removeEventListener("change", update); };
  }, [animated]);

  return <span
    className={`gradexa-mark ${className}`.trim()}
    role={decorative ? undefined : "img"}
    aria-label={decorative ? undefined : "Gradexa — oltin tasma"}
    aria-hidden={decorative ? true : undefined}
    // Only the local, deterministic vector generator supplies this markup.
    dangerouslySetInnerHTML={{ __html: ribbonSvg(animated ? time : REVEAL_DURATION, `gx-${id}`) }}
  />;
}
