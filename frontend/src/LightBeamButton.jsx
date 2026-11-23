import React from 'react';

/**
 * LightBeamButton
 *
 * A futuristic button component featuring a rotating light beam border effect.
 * Uses hardware-accelerated CSS @property and conic gradient animation,
 * with a white laser hotspot and full fallback for all browsers.
 */
export default function LightBeamButton({
  children,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  ...props
}) {
  return (
    <>
      <style>{`
        @property --gradient-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes beam-rotate {
          0% {
            --gradient-angle: 0deg;
            transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
            --gradient-angle: 360deg;
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        .animate-beam-rotate {
          animation: beam-rotate 2.6s linear infinite;
        }
      `}</style>

      <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`group relative isolate overflow-hidden rounded-xl p-[2.5px] text-sm font-semibold text-white shadow-[0_0_22px_-2px_rgba(59,130,246,0.6)] transition-all duration-200 hover:shadow-[0_0_35px_-1px_rgba(59,130,246,0.85)] active:scale-[0.98] disabled:opacity-60 cursor-pointer bg-transparent ${className}`}
        {...props}
      >
        {/* Rotating Light Beam (Square centered at 50% 50% ensures seamless 360deg sweep without clipping) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-20 aspect-square w-[350%] min-w-[500px] animate-beam-rotate will-change-transform"
          style={{
            background:
              'conic-gradient(from var(--gradient-angle, 0deg) at 50% 50%, transparent 0%, transparent 15%, #2563eb 28%, #60a5fa 38%, #ffffff 48%, #38bdf8 52%, #60a5fa 62%, #1d4ed8 72%, transparent 85%, transparent 100%)',
          }}
        />

        {/* Inner Solid Card Body (Deep Navy theme) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[2px] -z-10 rounded-[10px]"
          style={{
            background: 'linear-gradient(135deg, #1E40AF 0%, #172554 100%)',
          }}
        />

        {/* Hover Radial Reflection */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(147,197,253,0.35)_0%,transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        {/* Content */}
        <span className="relative z-10 flex h-full w-full items-center justify-center gap-2 px-6 py-3.5 tracking-wide">
          {children}
        </span>
      </button>
    </>
  );
}
