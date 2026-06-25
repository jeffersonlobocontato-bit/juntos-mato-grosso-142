import { memo } from "react";

/**
 * Fundo decorativo full-bleed com 4 ribbons orgânicos (verdes + dourados).
 * Respeita prefers-reduced-motion via classes utilitárias .animate-ribbon-*.
 */
const OrganicBackground = () => {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-organic-canvas">
      {/* Top-right green ribbon */}
      <svg
        viewBox="0 0 600 600"
        className="absolute -top-24 -right-24 w-[60vw] max-w-[720px] animate-ribbon-slow"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M0,120 C140,40 320,40 460,160 C600,280 560,420 380,500 C240,560 100,520 40,380 C-20,260 -30,200 0,120 Z"
          fill="hsl(145 70% 26%)"
          opacity="0.92"
        />
        <path
          d="M80,160 C200,80 360,100 480,220 C560,300 520,420 380,460 C260,490 140,460 100,360 C70,290 60,220 80,160 Z"
          fill="hsl(145 60% 38%)"
          opacity="0.55"
        />
      </svg>

      {/* Right-mid gold ribbon */}
      <svg
        viewBox="0 0 600 600"
        className="absolute top-[28%] -right-32 w-[55vw] max-w-[680px] animate-ribbon-med hidden md:block"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M40,200 C160,80 360,80 500,200 C600,300 560,440 400,500 C260,560 100,500 40,380 C0,300 -10,260 40,200 Z"
          fill="hsl(45 95% 55%)"
          opacity="0.95"
        />
        <path
          d="M120,260 C220,160 380,180 480,280 C540,360 500,460 380,490 C260,520 160,470 120,380 C100,330 90,290 120,260 Z"
          fill="hsl(48 100% 75%)"
          opacity="0.5"
        />
      </svg>

      {/* Bottom-right green ribbon */}
      <svg
        viewBox="0 0 600 600"
        className="absolute -bottom-24 -right-16 w-[70vw] max-w-[820px] animate-ribbon-slow"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M20,300 C160,180 360,180 500,300 C600,400 560,520 400,560 C260,580 100,540 40,440 C0,380 -10,360 20,300 Z"
          fill="hsl(150 75% 16%)"
          opacity="0.92"
        />
        <path
          d="M100,360 C220,260 380,280 480,360 C540,420 500,500 380,520 C260,530 160,500 120,440 C100,400 90,380 100,360 Z"
          fill="hsl(145 70% 26%)"
          opacity="0.6"
        />
      </svg>

      {/* Soft cream highlight top-left */}
      <svg
        viewBox="0 0 400 400"
        className="absolute -top-20 -left-20 w-[40vw] max-w-[420px] hidden md:block"
        preserveAspectRatio="xMidYMid meet"
      >
        <circle cx="200" cy="200" r="180" fill="hsl(48 80% 92%)" opacity="0.7" />
      </svg>
    </div>
  );
};

export default memo(OrganicBackground);