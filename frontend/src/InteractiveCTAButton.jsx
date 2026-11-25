import { useRef } from 'react';

/**
 * InteractiveCTAButton
 *
 * Interactive call-to-action button featuring:
 * - Right-arrow SVG icon
 * - Custom radial glow effect driven by CSS variables (--cursor-x, --cursor-y) for cursor position
 * - Dynamic "Logging in…" indicator when busy during login
 * - Water bubble hover zoom with elastic spring curve
 */
export default function InteractiveCTAButton({
  children,
  busy = false,
  busyText = 'Logging in…',
  type = 'submit',
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const buttonRef = useRef(null);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--cursor-x', `${x}px`);
    e.currentTarget.style.setProperty('--cursor-y', `${y}px`);
  };

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled || busy}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className={`group interactive-cta-btn water-bubble-btn relative isolate flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(30,64,175,0.38)] transition-all duration-200 hover:shadow-[0_6px_28px_rgba(30,64,175,0.6)] active:scale-[0.98] disabled:opacity-60 cursor-pointer ${className}`}
      style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #172554 100%)',
      }}
      {...props}
    >
      {/* Dynamic Cursor-Tracking Glow Effect driven by CSS variables */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(160px circle at var(--cursor-x, 50%) var(--cursor-y, 50%), rgba(147, 197, 253, 0.45) 0%, rgba(56, 189, 248, 0.2) 40%, transparent 80%)',
        }}
      />

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {busy ? (
          <>
            <svg
              className="h-4 w-4 animate-spin text-blue-200"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>{busyText}</span>
          </>
        ) : (
          <>
            <span>{children}</span>
            <svg
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </>
        )}
      </span>
    </button>
  );
}
