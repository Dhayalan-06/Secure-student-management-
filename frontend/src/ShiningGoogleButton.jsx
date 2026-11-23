import React, { useRef, useState, useEffect } from 'react';

/**
 * Official Google 4-Color SVG Icon
 */
export function GoogleIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="var(--google-blue, #4285F4)"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="var(--google-green, #34A853)"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="var(--google-yellow, #FBBC05)"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="var(--google-red, #EA4335)"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

/**
 * ShiningGoogleButton - Glass Sheen Edition
 *
 * Features:
 * - Four equal vertical color zones: Blue (0-25%), Red (25-50%), Yellow (50-75%), Green (75-100%)
 * - Translucent glass-like sheen that reveals as cursor approaches within 40px
 * - Diagonal reflection line that follows cursor horizontally, tinted by zone color
 * - Smooth fade in/out with spring physics
 * - Keyboard focus shows the four-color sheen
 * - Respects prefers-reduced-motion (reflection stays stationary)
 */
export default function ShiningGoogleButton({ onClick, className = '' }) {
  const buttonRef = useRef(null);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100, isNear: false });
  const [isFocused, setIsFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if cursor is within 40px of button
    const distanceFromButton = Math.min(
      Math.abs(e.clientX - rect.left),
      Math.abs(e.clientX - rect.right),
      Math.abs(e.clientY - rect.top),
      Math.abs(e.clientY - rect.bottom)
    );

    const isNear = distanceFromButton <= 40 || (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height);

    setCursorPos({ x, y, isNear });
  };

  const handleMouseLeave = () => {
    setCursorPos({ x: -100, y: -100, isNear: false });
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  // Calculate sheen intensity based on cursor proximity
  const getSheenIntensity = () => {
    if (isFocused) return 0.6;
    if (!cursorPos.isNear) return 0;

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return 0;

    // Distance from cursor to button center
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const distance = Math.sqrt(
      Math.pow(cursorPos.x - centerX, 2) + Math.pow(cursorPos.y - centerY, 2)
    );

    // Max distance (corner to center)
    const maxDistance = Math.sqrt(Math.pow(rect.width / 2, 2) + Math.pow(rect.height / 2, 2));
    // Start fading in at 40px outside, full at center
    const effectiveDistance = Math.max(0, distance - 40);
    const intensity = 1 - Math.min(1, effectiveDistance / (maxDistance + 40));

    return Math.max(0, Math.min(1, intensity * 0.8)); // Cap at 0.8 for subtlety
  };

  const sheenIntensity = getSheenIntensity();
  const showSheen = sheenIntensity > 0 || isFocused;

  // Calculate reflection position (clamped to button bounds)
  const reflectionX = Math.max(0, Math.min(cursorPos.x, buttonRef.current?.offsetWidth || 0));
  const reflectionY = Math.max(0, Math.min(cursorPos.y, buttonRef.current?.offsetHeight || 0));

  // Determine which color zone the reflection is in
  const buttonWidth = buttonRef.current?.offsetWidth || 1;
  const zoneWidth = buttonWidth / 4;
  const zoneIndex = Math.min(3, Math.floor(reflectionX / zoneWidth));

  const zoneColors = [
    'rgba(66, 133, 244, 0.9)',   // Blue #4285F4
    'rgba(234, 67, 53, 0.9)',    // Red #EA4335
    'rgba(251, 188, 5, 0.9)',    // Yellow #FBBC05
    'rgba(52, 168, 83, 0.9)'     // Green #34A853
  ];

  const reflectionColor = zoneColors[zoneIndex];

  // Generate the four-color gradient for the base sheen
  const baseSheenGradient = `
    linear-gradient(
      90deg,
      rgba(66, 133, 244, ${sheenIntensity * 0.15}) 0%,
      rgba(66, 133, 244, ${sheenIntensity * 0.15}) 25%,
      rgba(234, 67, 53, ${sheenIntensity * 0.15}) 25%,
      rgba(234, 67, 53, ${sheenIntensity * 0.15}) 50%,
      rgba(251, 188, 5, ${sheenIntensity * 0.15}) 50%,
      rgba(251, 188, 5, ${sheenIntensity * 0.15}) 75%,
      rgba(52, 168, 83, ${sheenIntensity * 0.15}) 75%,
      rgba(52, 168, 83, ${sheenIntensity * 0.15}) 100%
    )
  `;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`group relative isolate flex w-full items-center justify-center overflow-hidden rounded-xl p-[1.5px] cursor-pointer transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285F4] water-bubble-btn ${className}`}
      style={{
        background:
          'linear-gradient(135deg, var(--google-blue, #4285F4) 0%, var(--google-red, #EA4335) 34%, var(--google-yellow, #FBBC05) 67%, var(--google-green, #34A853) 100%)',
      }}
      aria-label="Continue with Google"
    >
      {/* Four-color zone background - fixed zones */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: `
            linear-gradient(
              90deg,
              var(--google-blue, #4285F4) 0%,
              var(--google-blue, #4285F4) 25%,
              var(--google-red, #EA4335) 25%,
              var(--google-red, #EA4335) 50%,
              var(--google-yellow, #FBBC05) 50%,
              var(--google-yellow, #FBBC05) 75%,
              var(--google-green, #34A853) 75%,
              var(--google-green, #34A853) 100%
            )
          `,
          opacity: 1,
        }}
      />

      {/* Glass sheen layer - reveals on hover/focus */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-xl transition-opacity duration-300"
        style={{
          opacity: showSheen ? 1 : 0,
          background: baseSheenGradient,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Diagonal reflection line - follows cursor, tinted by zone */}
      {!prefersReducedMotion && cursorPos.isNear && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20"
          style={{
            left: `${reflectionX}px`,
            top: `${reflectionY}px`,
            width: '2px',
            height: `${(buttonRef.current?.offsetHeight || 48) * 1.5}px`,
            transform: 'translate(-50%, -50%) rotate(-25deg)',
            transformOrigin: 'center center',
            background: `linear-gradient(180deg, transparent 0%, ${reflectionColor} 50%, transparent 100%)`,
            filter: 'blur(0.5px)',
            opacity: sheenIntensity * 0.9,
            transition: 'left 0.1s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.1s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
            willChange: 'left, top, opacity',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Static reflection for reduced motion - centered, shows all four colors */}
      {prefersReducedMotion && (cursorPos.isNear || isFocused) && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background: `
              linear-gradient(
                -25deg,
                transparent 40%,
                rgba(66, 133, 244, 0.6) 42%,
                rgba(66, 133, 244, 0.6) 44%,
                rgba(234, 67, 53, 0.6) 44%,
                rgba(234, 67, 53, 0.6) 46%,
                rgba(251, 188, 5, 0.6) 46%,
                rgba(251, 188, 5, 0.6) 48%,
                rgba(52, 168, 83, 0.6) 48%,
                rgba(52, 168, 83, 0.6) 50%,
                transparent 52%
              )
            `,
            opacity: sheenIntensity * 0.5,
          }}
        />
      )}

      {/* Solid inner core for maximum readability */}
      <span className="relative z-30 flex w-full items-center justify-center gap-3 rounded-[10.5px] bg-white px-5 py-3 text-sm font-semibold text-neutral-800 shadow-sm transition-colors duration-150 group-hover:bg-neutral-50 dark:bg-[#172438] dark:text-neutral-100 dark:group-hover:bg-[#1e2f47]">
        <GoogleIcon className="h-5 w-5 shrink-0" />
        <span className="tracking-tight">Continue with Google</span>
      </span>
    </button>
  );
}