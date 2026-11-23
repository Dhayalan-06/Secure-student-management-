import { useState } from 'react';
import { Link } from 'react-router-dom';
import LoginFeatures from './LoginFeatures';
import InteractiveCTAButton from './InteractiveCTAButton';
import ShiningGoogleButton from './ShiningGoogleButton';
import { GoogleLogin } from '@react-oauth/google';

/* ─── Official Google SVG Icon with Exact 4-Color CSS Palette ──────────────── */
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
  isExiting = false,
}) {
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(e);
  }

  const inputCls =
    'w-full rounded-xl border-0 bg-neutral-100 px-4 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none transition-all duration-150 focus:bg-white focus:ring-2 focus:ring-blue-400/70 hover:bg-neutral-200/70';

  return (
    <main
      className={`relative flex min-h-screen w-full items-center justify-center p-4 sm:p-6 lg:p-10 font-['Plus_Jakarta_Sans',sans-serif] overflow-hidden${isExiting ? ' auth-zoom-exit' : ''}`}
      style={{ background: '#e8ebe4' }}
    >
      {/* Outer card shell */}
      <div
        className="relative z-10 w-full max-w-[1060px] rounded-[2.5rem] shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
        style={{ background: 'rgba(255,255,255,0.97)' }}
      >
        <div className="flex flex-col md:flex-row items-stretch min-h-[580px]">

          {/* ── LEFT: Form ── */}
          <div className="relative flex w-full flex-col justify-center md:w-[48%] px-8 py-10 sm:px-12 sm:py-14">

            {/* Logo + wordmark */}
            <div className="mb-8 flex items-center gap-2.5">
              <SSMLogo size={34} />
              <div className="leading-none">
                <span className="block text-[17px] font-bold text-neutral-900 tracking-tight">SSM</span>
                <span className="block text-[10px] font-medium text-neutral-400 tracking-widest uppercase">v.1.0.0</span>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h1
                id={`${mode}-heading`}
                tabIndex={-1}
                className="text-[30px] font-bold text-neutral-900 tracking-tight"
              >
                {mode === 'login' ? 'Login' : 'Create an account'}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                {mode === 'login'
                  ? 'Enter your credentials to get in'
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
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Full name
                    </label>
                    <input
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
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Department
                    </label>
                    <input
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
                      <label className="mb-1.5 block text-xs font-semibold text-neutral-600 uppercase tracking-wider">Age</label>
                      <input
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
                      <label className="mb-1.5 block text-xs font-semibold text-neutral-600 uppercase tracking-wider">CGPA</label>
                      <input
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
                <label className="mb-1.5 block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Email
                </label>
                <input
                  className={inputCls}
                  type="email"
                  autoComplete="email"
                  placeholder="aimerpaix@gmail.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
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
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-700 focus:outline-none"
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
                  <span className="text-sm text-neutral-600">Remember me</span>
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
                  <div className="flex-1 border-t border-neutral-200" />
                  <span className="mx-3 text-[11px] font-medium uppercase tracking-wider text-neutral-400">or continue with</span>
                  <div className="flex-1 border-t border-neutral-200" />
                </div>

                <div className="flex flex-col items-center justify-center gap-2">
                  {/* Shining Google Button with official 4-color gradient border & sweep shine */}
                  <ShiningGoogleButton
                    onClick={() => {
                      const hiddenBtn = document.querySelector('[data-google-btn-wrapper] button, [data-google-btn-wrapper] [role="button"]');
                      if (hiddenBtn) {
                        hiddenBtn.click();
                      } else {
                        setError('Google OAuth Client ID is not configured yet in .env.');
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
            <p className="mt-6 text-center text-sm text-neutral-500">
              {mode === 'login' ? (
                <>
                  Not a member?{' '}
                  <Link
                    to="/register"
                    viewTransition
                    onClick={() => { setError(''); setMessage(''); }}
                    className="font-semibold text-blue-800 hover:underline"
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
                    className="font-semibold text-blue-800 hover:underline"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </p>

            {/* Version watermark */}
            <p className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-neutral-400 tracking-widest select-none">
              SSM v.1.0.0 · Secure Student Management
            </p>
          </div>

          {/* ── RIGHT: Slideshow ── */}
          <div className="hidden md:flex w-full md:w-[52%] p-2.5">
            <LoginFeatures />
          </div>
        </div>
      </div>
    </main>
  );
}
