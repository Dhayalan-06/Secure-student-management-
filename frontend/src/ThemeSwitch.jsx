import { forwardRef } from 'react';

/**
 * Shared theme switch component used on both the login page and workspace sidebar.
 * Renders a toggle switch with the same visual design and accessible behavior.
 *
 * @param {boolean} isDark - Current theme state
 * @param {function} onToggle - Callback when theme is toggled
 * @param {string} [className] - Optional additional CSS classes
 * @param {string} [ariaLabel] - Optional custom aria-label (default: "Dark mode")
 */
export const ThemeSwitch = forwardRef(function ThemeSwitch({ isDark, onToggle, className = '', ariaLabel = 'Dark mode' }, ref) {
  return (
    <label
      ref={ref}
      className={`auth-theme-control ${className}`}
      title={isDark ? 'Use light mode' : 'Use dark mode'}
    >
      <input
        type="checkbox"
        role="switch"
        aria-label={ariaLabel}
        className="sr-only"
        checked={isDark}
        onChange={onToggle}
      />
      <span className="auth-theme-track" aria-hidden="true">
        <span className="auth-theme-orb" />
      </span>
    </label>
  );
});

ThemeSwitch.displayName = 'ThemeSwitch';