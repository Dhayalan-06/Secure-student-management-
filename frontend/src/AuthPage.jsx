import { useState } from 'react';
import { Link } from 'react-router-dom';
import LoginFeatures from './LoginFeatures';
import InteractiveCTAButton from './InteractiveCTAButton';
import ShiningGoogleButton from './ShiningGoogleButton';
import { GoogleLogin } from '@react-oauth/google';

/* ─── SSM Logo ─────────────────────────────────────────────────────────────── */
function SSMLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="url(#ssm-grad)" />
      <path d="M9 24 C9 24 10.5 18 18 18 C25.5 18 27 12 27 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="18" cy="18" r="2.5" fill="white" />
      <defs>
        <linearGradient id="ssm-grad" x1="0" y1="0" x2="36" y2="36">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Main AuthPage ──────────────────────────────────────────────────────────*/
export default function AuthPage({
  mode,
  email,
  setEmail,
  password,
  setPassword,
  registrationProfile,
  setRegistrationProfile,
  rememberMe,
  setRememberMe,
  busy,
  error,
  message,
  setError,
  setMessage,
  onSubmit,
  onSubmitGoogleCredential,
  isDark,
  onToggleTheme,
  isExiting = false,
}) {
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(e);
  }

  const inputCls =
    'w-full rounded-xl border-0 bg-raised px-4 py-3 text-base text-foreground placeholder:text-muted outline-none transition-shadow duration-150 focus:ring-2 focus:ring-blue-400/70';

  return (
    <main
      className={`auth-page relative flex min-h-screen w-full items-center justify-center p-4 sm:p-6 lg:p-10 font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden${isExiting ? ' auth-zoom-exit' : ''}`}
      data-campus-lighting={isDark ? 'night' : 'day'}
    >
      {/* Outer card shell */}
      <div
        className="bg-surface relative z-10 w-full max-w-[1060px] rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="flex flex-col md:flex-row items-stretch min-h-[580px]">

          {/* ── LEFT: Form ── */}
          <div className="relative flex w-full flex-col justify-center md:w-[48%] px-8 py-10 sm:px-9 sm:py-10">

            {/* Logo + wordmark */}
            <div className="mb-7 flex items-center gap-2.5 border-b border-divider pb-4">
              <SSMLogo size={34} />
              <span className="text-sm font-semibold tracking-tight text-foreground">Secure Student Management</span>
              <label className="auth-theme-control" title={isDark ? 'Use light mode' : 'Use dark mode'}>
                <input type="checkbox" role="switch" aria-label="Dark mode" className="sr-only"
                  checked={isDark} onChange={onToggleTheme} />
                <span className="auth-theme-track" aria-hidden="true"><span className="auth-theme-orb" /></span>
              </label>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h1
                id={`${mode}-heading`}
                tabIndex={-1}
                className="text-[30px] font-bold text-foreground tracking-tight"
              >
                {mode === 'login' ? 'Login' : 'Create an account'}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {mode === 'login'
                  ? 'Access your student records.'
                  : 'Register as a student to get started'}
              </p>
            </div>

            {/* Alerts */}
            {message && (
              <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
                <svg className="h-4 w-4 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {message}
              </div>
            )}
            {error && (
              <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
                <svg className="h-4 w-4 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Registration-only fields */}
              {mode === 'register' && (
                <>
                  <div>
                    <label htmlFor="auth-full-name" className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">
                      Full name
                    </label>
                    <input
                      id="auth-full-name"
                      className={inputCls}
                      type="text"
                      placeholder="John Doe"
                      minLength={2}
                      required
                      value={registrationProfile.name}
                      onChange={(e) => setRegistrationProfile((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-department" className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">
                      Department
                    </label>
                    <input
                      id="auth-department"
                      className={inputCls}
                      type="text"
                      placeholder="Computer Science"
                      minLength={2}
                      maxLength={100}
                      required
                      value={registrationProfile.department}
                      onChange={(e) => setRegistrationProfile((c) => ({ ...c, department: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="auth-age" className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">Age</label>
                      <input
                        id="auth-age"
                        className={inputCls}
                        type="number"
                        min="16"
                        max="100"
                        placeholder="20"
                        required
                        value={registrationProfile.age}
                        onChange={(e) => setRegistrationProfile((c) => ({ ...c, age: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="auth-cgpa" className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">CGPA</label>
                      <input
                        id="auth-cgpa"
                        className={inputCls}
                        type="number"
                        min="0"
                        max="10"
                        step="0.01"
                        placeholder="8.50"
                        required
                        value={registrationProfile.cgpa}
                        onChange={(e) => setRegistrationProfile((c) => ({ ...c, cgpa: e.target.value }))}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="auth-email"
                  className={inputCls}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.edu"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="auth-password" className="mb-1.5 block text-xs font-semibold text-muted uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    className={inputCls + ' pr-11'}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-link hover:bg-raised"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me row */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex cursor-pointer select-none items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-neutral-300 accent-blue-700 focus:ring-0"
                  />
                  <span className="text-sm text-muted">Remember me</span>
                </label>
              </div>

              {/* Interactive CTA Submit Button with Cursor Glow & Arrow */}
              <div className="pt-1">
                <InteractiveCTAButton
                  type="submit"
                  disabled={busy}
                  busy={busy}
                  busyText={mode === 'login' ? 'Logging in…' : 'Creating Account…'}
                  className="w-full"
                >
                  {mode === 'login' ? 'Login' : 'Create Account'}
                </InteractiveCTAButton>
              </div>
            </form>

            {/* Google in login mode */}
            {mode === 'login' && (
              <div className="mt-5">
                <div className="relative my-4 flex items-center">
                  <div className="flex-1 border-t border-divider" />
                  <span className="mx-3 text-[11px] font-medium uppercase tracking-wider text-muted">or continue with</span>
                  <div className="flex-1 border-t border-divider" />
                </div>

                <div className="flex flex-col items-center justify-center gap-2">
                  <ShiningGoogleButton
                    disabled={busy}
                    onClick={() => {
                      const hiddenBtn = document.querySelector('[data-google-btn-wrapper] button, [data-google-btn-wrapper] [role="button"]');
                      if (hiddenBtn) {
                        hiddenBtn.click();
                      } else {
                        setError('Google sign-in is unavailable. Please use your email and password.');
                      }
                    }}
                  />

                  {/* Underlying GoogleLogin for OAuth provider & test mock compatibility */}
                  <div className="hidden" data-google-btn-wrapper aria-hidden="true">
                    <GoogleLogin
                      onSuccess={onSubmitGoogleCredential}
                      onError={() => setError('Google sign-in failed. Please try again.')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Switch mode */}
            <p className="mt-6 text-center text-sm text-muted">
              {mode === 'login' ? (
                <>
                  New to the portal?{' '}
                  <Link
                    to="/register"
                    viewTransition
                    onClick={() => { setError(''); setMessage(''); }}
                    className="auth-link font-semibold text-link"
                  >
                    Create an account
                  </Link>
                </>
              ) : (
                <>
                  Already a member?{' '}
                  <Link
                    to="/"
                    viewTransition
                    onClick={() => { setError(''); setMessage(''); }}
                    className="auth-link font-semibold text-link"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </p>

          </div>

          {/* ── RIGHT: Slideshow ── */}
          <div className="flex w-full min-w-0 md:w-[52%] p-2.5">
            <LoginFeatures />
          </div>
        </div>
      </div>
    </main>
  );
}
