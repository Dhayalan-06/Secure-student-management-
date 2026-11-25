import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from './services/api';
import ResultsPanel from './ResultsPanel';
import StudentRegister from './StudentRegister';
import AuthPage from './AuthPage';
import RegistryShell from './RegistryShell';
import WorkspaceHome from './WorkspaceHome';
import './registry.css';
import './results.css';

const emptyRegistrationProfile = {
  name: '',
  department: '',
  age: '',
  cgpa: '',
};

const emptyFeeForm = {
  studentId: '',
  description: '',
  amount: '',
  dueDate: '',
};

const workspacePages = [
  {
    id: 'home', path: '/home', label: 'Overview',
    icon: <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10" strokeLinejoin="round" /></svg>,
  },
  {
    id: 'students',
    path: '/students',
    label: 'Student register',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'fees',
    path: '/fees',
    label: 'Fee ledger',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'results',
    path: '/results',
    label: 'Semester results',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const FEE_PAGE_SIZE = 12;

export default function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const path = pathname.toLowerCase().replace(/\/+$/, '');
  const mode = path === '/register' ? 'register' : 'login';
  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  const [checkingSession, setCheckingSession] = useState(() => Boolean(localStorage.getItem('accessToken')));
  const [email, setEmail] = useState(() => localStorage.getItem('student_remember_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('student_remember_email')));
  const [registrationProfile, setRegistrationProfile] = useState(emptyRegistrationProfile);
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const [studentTotal, setStudentTotal] = useState(0);
  const [studentStatus, setStudentStatus] = useState('loading');
  const [feeStatus, setFeeStatus] = useState('loading');

  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeForm, setFeeForm] = useState(emptyFeeForm);
  const [refresh, setRefresh] = useState(0);

  // Fee pagination state
  const [feePage, setFeePage] = useState(1);
  const [feePageSize, setFeePageSize] = useState(FEE_PAGE_SIZE);
  const [feeTotal, setFeeTotal] = useState(0);
  const [feeTotalPages, setFeeTotalPages] = useState(1);
  const [feePageRevision, setFeePageRevision] = useState(0);

  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isStudent = role === 'STUDENT';
  const canEdit = isAdmin || role === 'STAFF';
  const canViewFees = isAdmin || role === 'STUDENT';
  const allowedPages = workspacePages.filter((page) =>
    page.id !== 'fees' || canViewFees
  ).filter((page) => !(isStudent && page.id === 'home'));
  const workspacePage = workspacePages.find((page) =>
    page.path === path && (page.id !== 'fees' || canViewFees) && !(isStudent && page.id === 'home'),
  ) ?? allowedPages[0];
  const pageId = user ? workspacePage.id : mode;
  const visiblePage = checkingSession ? null : pageId;
  const previousPage = useRef(visiblePage);

  useLayoutEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#172438' : '#ffffff');
    try {
      localStorage.setItem('student-management-theme', theme);
    } catch {
      // Keep selected theme in memory
    }
  }, [isDark]);

  function getErrorMessage(e, fallback) {
    const msg = e?.response?.data?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
  }

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setStudents([]);
      setFees([]);
      setError('Your session expired. Please sign in again.');
      navigate('/', { replace: true });
    }
    window.addEventListener('student-session-expired', handleSessionExpired);
    return () => window.removeEventListener('student-session-expired', handleSessionExpired);
  }, [navigate]);

  async function loadMe(signal) {
    try {
      const { data } = await api.get('/auth/me', { signal });
      if (!signal?.aborted) setUser(data.user ?? data);
    } catch (e) {
      if (signal?.aborted) return;
      localStorage.removeItem('accessToken');
      setUser(null);
      if (e?.response?.status === 401) {
        setError('Your session expired. Please sign in again.');
      }
    }
  }

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return;
    const controller = new AbortController();
    loadMe(controller.signal).finally(() => {
      if (!controller.signal.aborted) setCheckingSession(false);
    });
    return () => controller.abort();
  }, []);

  useLayoutEffect(() => {
    const oldPage = previousPage.current;
    previousPage.current = visiblePage;
    if (!oldPage || oldPage === visiblePage || !visiblePage) return;
    document.getElementById(`${visiblePage}-heading`)?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [visiblePage]);

  useEffect(() => {
    const pageTitle = user ? workspacePage.label : mode === 'register' ? 'Create an account' : 'Sign in';
    document.title = `${pageTitle} | Secure Student Management`;
  }, [user, workspacePage.label, mode]);

  useEffect(() => {
    if (user && path === '/fees' && !canViewFees) {
      navigate('/students', { replace: true });
    }
    if (user && isStudent && path === '/home') {
      navigate('/students', { replace: true });
    }
  }, [user, path, canViewFees, navigate, isStudent]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();

    setStudentStatus('loading');
    setFeeStatus('loading');
    api
      .get('/students', { params: { page: 1, limit: 100 }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const rows = studentRecords(data);
        setStudents(rows);
        setStudentTotal(data?.total ?? rows.length);
        setStudentStatus('ready');
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setStudentStatus('error');
        if (e?.response?.status === 401) return;
        setError(getErrorMessage(e, 'Could not load students'));
      });

    if (canViewFees) {
      // Load fee totals for dashboard
      api
        .get('/fees/totals', { signal: controller.signal })
        .then(() => {
          if (controller.signal.aborted) return;
          // Dashboard uses totals from this response
        })
        .catch(() => {
          // Totals are optional, don't fail the whole load
        });

      // Load paginated fee records
      api
        .get('/fees', { params: { page: feePage, limit: feePageSize }, signal: controller.signal })
        .then(({ data }) => {
          if (controller.signal.aborted) return;
          setFees(data?.data ?? []);
          setFeeTotal(data?.total ?? 0);
          setFeeTotalPages(data?.totalPages ?? 1);
          setFeeStatus('ready');
        })
        .catch((e) => {
          if (controller.signal.aborted) return;
          setFeeStatus('error');
          if (e?.response?.status === 401) return;
          setError(getErrorMessage(e, 'Could not load fee records'));
        });
    }

    return () => controller.abort();
  }, [user, canViewFees, refresh, feePage, feePageSize, feePageRevision]);

  // Reset to page 1 when page size changes
  function handlePageSizeChange(newSize) {
    const size = Math.min(100, Math.max(1, Number(newSize) || FEE_PAGE_SIZE));
    setFeePageSize(size);
    setFeePage(1);
    setFeePageRevision((v) => v + 1);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'register') {
        await api.post('/auth/register', {
          email,
          password,
          name: registrationProfile.name.trim(),
          department: registrationProfile.department.trim(),
          age: Number(registrationProfile.age),
          cgpa: Number(registrationProfile.cgpa),
        });
        navigate('/', { replace: true, viewTransition: true });
        setMessage('Registration successful. Please log in.');
        setPassword('');
        setRegistrationProfile(emptyRegistrationProfile);
      } else {
        const { data } = await api.post('/auth/login', { email, password });
        if (!data?.accessToken) {
          throw new Error('Login response did not include an accessToken.');
        }
        if (rememberMe) {
          localStorage.setItem('student_remember_email', email);
        } else {
          localStorage.removeItem('student_remember_email');
        }
        localStorage.setItem('accessToken', data.accessToken);

        setIsExiting(true);
        await new Promise((resolve) => setTimeout(resolve, 480));

        if (data.user) {
          setUser(data.user);
        } else {
          await loadMe();
        }
        setIsExiting(false);
        setPassword('');
      }
    } catch (e) {
      setError(getErrorMessage(e, e.message || 'Request failed'));
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogleCredential(credentialResponse) {
    if (!credentialResponse?.credential) {
      setError('Google did not return a sign-in credential. Please try again.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');

    try {
      const { data } = await api.post('/auth/google', {
        credential: credentialResponse.credential,
      });
      if (!data?.accessToken || !data?.user) {
        throw new Error('Google login response was incomplete.');
      }
      if (rememberMe && data.user?.email) {
        localStorage.setItem('student_remember_email', data.user.email);
      }
      localStorage.setItem('accessToken', data.accessToken);

      setIsExiting(true);
      await new Promise((resolve) => setTimeout(resolve, 480));

      setUser(data.user);
      setIsExiting(false);
      setPassword('');
    } catch (e) {
      setError(getErrorMessage(e, e.message || 'Google sign-in failed'));
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem('accessToken');
    setUser(null);
    setStudentStatus('loading');
    setFeeStatus('loading');
    setStudents([]);
    setFees([]);
    setError('');
    setMessage('');
    if (!rememberMe) {
      setEmail('');
    }
    setPassword('');
    setShowFeeForm(false);
    setFeeForm(emptyFeeForm);
    navigate('/', { replace: true });
  }

  async function saveFee(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.post('/fees', {
        studentId: Number(feeForm.studentId),
        description: feeForm.description.trim(),
        amount: Number(feeForm.amount),
        dueDate: feeForm.dueDate,
      });
      setShowFeeForm(false);
      setFeeForm(emptyFeeForm);
      setMessage('Fee record created as pending.');
      setRefresh((previous) => previous + 1);
    } catch (e) {
      if (e?.response?.status === 401 && !localStorage.getItem('accessToken')) return;
      setError(getErrorMessage(e, 'Could not create fee record'));
    } finally {
      setBusy(false);
    }
  }

  async function changeFeeStatus(fee, status) {
    setError('');
    setMessage('');
    try {
      await api.patch(`/fees/${fee.id}/status`, { status });
      setMessage(`Fee marked ${status.toLowerCase()}.`);
      setRefresh((previous) => previous + 1);
    } catch (e) {
      if (e?.response?.status === 401 && !localStorage.getItem('accessToken')) return;
      setError(getErrorMessage(e, 'Could not update fee status'));
    }
  }

  function renderPageNumbers() {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, feePage - Math.floor(maxVisible / 2));
    let end = Math.min(feeTotalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push({ type: 'button', page: 1, label: '1', current: feePage === 1 });
      if (start > 2) {
        pages.push({ type: 'ellipsis' });
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push({
        type: 'button',
        page: i,
        label: String(i),
        current: i === feePage,
      });
    }

    if (end < feeTotalPages) {
      if (end < feeTotalPages - 1) {
        pages.push({ type: 'ellipsis' });
      }
      pages.push({ type: 'button', page: feeTotalPages, label: String(feeTotalPages), current: feePage === feeTotalPages });
    }

    return pages;
  }

  if (checkingSession) {
    return <main className="grid min-h-screen place-items-center" aria-busy="true">Checking your session…</main>;
  }

  if (!user) {
    return (
      <AuthPage
        key={mode}
        mode={mode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        registrationProfile={registrationProfile}
        setRegistrationProfile={setRegistrationProfile}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
        busy={busy}
        error={error}
        message={message}
        setError={setError}
        setMessage={setMessage}
        onSubmit={submit}
        onSubmitGoogleCredential={submitGoogleCredential}
        isDark={isDark}
        onToggleTheme={() => setIsDark((current) => !current)}
        isExiting={isExiting}
      />
    );
  }

  const displayName = user.name || user.email.split('@')[0];

  return (
    <RegistryShell pages={allowedPages} activePage={workspacePage} user={user} name={displayName}
      isDark={isDark} onTheme={() => setIsDark((current) => !current)} onLogout={logout}>
        {/* Global Notifications */}
        <div>
          {message && (
            <div role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-success-surface p-3.5 text-sm text-success-text shadow-sm">
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl bg-danger-surface p-3.5 text-sm text-danger-text shadow-sm">
              <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {workspacePage.id === 'home' && (
          <WorkspaceHome user={user} students={students} total={studentTotal} fees={fees}
            studentStatus={studentStatus} feeStatus={feeStatus} />
        )}
              {workspacePage.id === 'students' && (
                <StudentRegister role={role} onRecordsChanged={() => setRefresh((v) => v + 1)} />
              )}
              {/* SECTION 2: STUDENT FEES */}
              <section className="route-page" aria-labelledby="fees-heading" hidden={workspacePage.id !== 'fees'}>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 id="fees-heading" tabIndex={-1} className="text-2xl font-bold text-foreground">
                      Student Fees
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Monitor tuition schedules, fee dues, and transactions.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setFeeForm(emptyFeeForm);
                        setShowFeeForm((shown) => !shown);
                      }}
                      className="water-bubble-btn rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
                    >
                      {showFeeForm ? 'Cancel' : '+ Add Fee'}
                    </button>
                  )}
                </div>

                {showFeeForm && isAdmin && (
                  <form onSubmit={saveFee} className="mb-6 grid gap-4 rounded-2xl border border-divider bg-raised/50 p-5 sm:p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-sm font-medium text-foreground">
                      Student
                      <select
                        className="mt-1 w-full rounded-xl border border-control bg-surface p-3 text-sm focus:border-blue-500 focus:outline-none"
                        required
                        value={feeForm.studentId}
                        onChange={(e) => setFeeForm((current) => ({ ...current, studentId: e.target.value }))}
                      >
                        <option value="">Select a student</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>{student.name} (#{student.id})</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Fee Description
                      <input
                        className="mt-1 w-full rounded-xl border border-control bg-surface p-3 text-sm focus:border-blue-500 focus:outline-none"
                        required
                        minLength={2}
                        maxLength={120}
                        value={feeForm.description}
                        onChange={(e) => setFeeForm((current) => ({ ...current, description: e.target.value }))}
                        placeholder="Semester fee"
                      />
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Amount (₹)
                      <input
                        className="mt-1 w-full rounded-xl border border-control bg-surface p-3 text-sm focus:border-blue-500 focus:outline-none"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={feeForm.amount}
                        onChange={(e) => setFeeForm((current) => ({ ...current, amount: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm font-medium text-foreground">
                      Due Date
                      <input
                        className="mt-1 w-full rounded-xl border border-control bg-surface p-3 text-sm focus:border-blue-500 focus:outline-none"
                        type="date"
                        required
                        value={feeForm.dueDate}
                        onChange={(e) => setFeeForm((current) => ({ ...current, dueDate: e.target.value }))}
                      />
                    </label>
                    <div className="sm:col-span-2 lg:col-span-4">
                      <button
                        type="submit"
                        disabled={busy || !students.length}
                        className="water-bubble-btn rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        {busy ? 'Saving...' : 'Create Pending Fee'}
                      </button>
                      {!students.length && (
                        <p className="mt-2 text-sm text-warning-text">Create a student record before adding a fee.</p>
                      )}
                    </div>
                  </form>
                )}

                {/* Fee Table with Pagination Toolbar */}
                <div className="fee-pagination-toolbar">
                  <label className="flex items-center gap-2 text-sm text-muted" htmlFor="fee-page-size">
                    <span className="sr-only">Rows per page</span>
                    Rows per page
                    <input
                      id="fee-page-size"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      value={feePageSize}
                      onChange={(e) => handlePageSizeChange(e.target.value)}
                      onBlur={(e) => handlePageSizeChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePageSizeChange(e.target.value)}
                      className="w-20 rounded-xl border border-control bg-surface p-2 text-sm text-right focus:border-blue-500 focus:outline-none"
                      aria-label="Rows per page"
                    />
                  </label>
                  {feeTotal > 0 && (
                    <span className="range-info text-sm text-muted whitespace-nowrap">
                      {(feePage - 1) * feePageSize + 1}–{Math.min(feePage * feePageSize, feeTotal)} of {feeTotal}
                    </span>
                  )}
                </div>

                {/* Fees Table */}
                <div className="overflow-x-auto rounded-2xl border border-divider bg-surface shadow-sm">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="border-b border-divider bg-raised/60 text-xs font-semibold uppercase tracking-wider text-muted">
                      <tr>
                        {['Student', 'Department', 'Fee', 'Amount', 'Due Date', 'Status', 'Paid On'].map((heading) => (
                          <th key={heading} className="whitespace-nowrap px-4 py-3.5">{heading}</th>
                        ))}
                        {isAdmin && <th className="whitespace-nowrap px-4 py-3.5">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                      {feeStatus === 'loading' && (
                        <tr>
                          <td colSpan={isAdmin ? 8 : 7} className="p-10 text-center text-muted">
                            <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                              <svg className="h-8 w-8 animate-spin text-muted/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <p className="font-semibold text-foreground">Loading fee records…</p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {feeStatus === 'error' && (
                        <tr>
                          <td colSpan={isAdmin ? 8 : 7} className="p-10 text-center text-muted">
                            <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                              <svg className="h-10 w-10 text-danger-text/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <p className="font-semibold text-foreground">Failed to load fee records</p>
                              <button
                                type="button"
                                onClick={() => setFeePageRevision((v) => v + 1)}
                                className="mt-2 water-bubble-btn rounded-lg border border-divider px-3 py-1.5 text-xs font-medium hover:bg-raised cursor-pointer"
                              >
                                Retry
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {feeStatus === 'ready' && !fees.length && (
                        <tr>
                          <td colSpan={isAdmin ? 8 : 7} className="p-10 text-center text-muted">
                            <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                              <svg className="h-10 w-10 text-muted/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <p className="font-semibold text-foreground">No fee transactions found</p>
                              <p className="text-xs text-muted mt-1">There are no fee records matching your view.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                      {feeStatus === 'ready' && fees.map((fee) => (
                        <tr key={fee.id} className="hover:bg-raised/40 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3.5 font-medium text-foreground">{fee.studentName}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-muted">{fee.departmentName || '—'}</td>
                          <td className="px-4 py-3.5 text-foreground">{fee.description}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-foreground">
                            ₹{Number(fee.amount).toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-muted">{fee.dueDate}</td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                fee.status === 'PAID'
                                  ? 'bg-success-surface text-success-text'
                                  : 'bg-warning-surface text-warning-text'
                              }`}
                            >
                              {fee.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-muted">
                            {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString() : '—'}
                          </td>
                          {isAdmin && (
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <button
                                type="button"
                                onClick={() => changeFeeStatus(fee, fee.status === 'PAID' ? 'PENDING' : 'PAID')}
                                className="water-bubble-btn rounded-lg border border-divider px-3 py-1.5 text-xs font-medium hover:bg-raised cursor-pointer"
                              >
                                Mark {fee.status === 'PAID' ? 'pending' : 'paid'}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {feeStatus === 'ready' && feeTotalPages > 1 && (
                  <div className="fee-pagination-controls" role="navigation" aria-label="Fee ledger pagination">
                    <button
                      type="button"
                      className="page-btn prev-next-btn"
                      onClick={() => setFeePage((p) => Math.max(1, p - 1))}
                      disabled={feePage === 1}
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1" aria-label="Page numbers">
                      {renderPageNumbers().map((item, idx) => {
                        if (item.type === 'ellipsis') {
                          return <span key={idx} className="ellipsis" aria-hidden="true">…</span>;
                        }
                        if (item.type === 'button') {
                          return (
                            <button
                              key={idx}
                              type="button"
                              className={`page-btn ${item.current ? 'page-current' : ''}`}
                              onClick={() => setFeePage(item.page)}
                              aria-current={item.current ? 'page' : undefined}
                              aria-label={`Page ${item.label}`}
                            >
                              {item.label}
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <button
                      type="button"
                      className="page-btn prev-next-btn"
                      onClick={() => setFeePage((p) => Math.min(feeTotalPages, p + 1))}
                      disabled={feePage === feeTotalPages}
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                )}
              </section>

        {workspacePage.id === 'results' && (
          <section aria-labelledby="results-heading">
            <ResultsPanel students={students} canEdit={canEdit} isStudent={role === 'STUDENT'} />
          </section>
        )}
    </RegistryShell>
  );
}

function studentRecords(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}
