import React from 'react';

/**
 * CurlyBorderCard
 *
 * Implements the sketch's moving curly border container:
 * "it dynamically renders a Moving Border that is moving in smooth motion curly wise."
 *
 * Employs hardware-accelerated conic gradient rotation with organic scaling oscillation
 * so the glowing beam flows around the container perimeter in a smooth, curly motion.
 */
export default function CurlyBorderCard({ children, className = '' }) {
  return (
    <div className={`relative isolate rounded-2xl p-[2.5px] overflow-hidden shadow-lg ${className}`}>
      {/* Moving Curly Border Beam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-20 aspect-square w-[280%] min-w-[650px] animate-curly-beam will-change-transform"
        style={{
          background:
            'conic-gradient(from 0deg at 50% 50%, transparent 0%, transparent 16%, #2563eb 28%, #60a5fa 36%, #ffffff 42%, #38bdf8 48%, #818cf8 56%, #c084fc 64%, #3b82f6 72%, transparent 84%, transparent 100%)',
        }}
      />

      {/* Solid Inner Workspace Panel */}
      <div className="relative z-10 w-full h-full rounded-[calc(1rem-0.5px)] bg-surface text-foreground transition-colors duration-200">
        {children}
      </div>
    </div>
  );
}
