import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from './services/api';
import ResultsPanel from './ResultsPanel';
import AuthPage from './AuthPage';
import CurlyBorderCard from './CurlyBorderCard';

const emptyForm = {
  name: '',
  email: '',
  department: '',
  age: '',
  cgpa: '',
};

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
    id: 'students',
    path: '/students',
    label: 'All Students',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'fees',
    path: '/fees',
    label: 'Student Fees',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'results',
    path: '/results',
    label: 'Semester Results',
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

/* ─── SSM Header Logo ──────────────────────────────────────────────────────── */
function SSMLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="36" height="36" rx="10" fill="url(#ssm-dash-grad)" />
      <path d="M9 24 C9 24 10.5 18 18 18 C25.5 18 27 12 27 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="18" cy="18" r="2.5" fill="white" />
      <defs>
        <linearGradient id="ssm-dash-grad" x1="0" y1="0" x2="36" y2="36">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

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
  const [searchResults, setSearchResults] = useState(null);
  const [fees, setFees] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const [showRecordsOverview, setShowRecordsOverview] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeForm, setFeeForm] = useState(emptyFeeForm);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState(emptyForm);
  const [refresh, setRefresh] = useState(0);

  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const canEdit = isAdmin || role === 'STAFF';
  const canViewFees = isAdmin || role === 'STUDENT';
  const workspacePage = workspacePages.find((page) =>
    page.path === path && (page.id !== 'fees' || canViewFees),
  ) ?? workspacePages[0];
  const query = search.trim();
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

  async function loadMe(signal) {
    try {
      const { data } = await api.get('/auth/me', { signal });
      if (!signal?.aborted) setUser(data.user ?? data);
    } catch {
      if (signal?.aborted) return;
      localStorage.removeItem('accessToken');
      setUser(null);
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
  }, [user, path, canViewFees, navigate]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();

    api
      .get('/students', { params: { page: 1, limit: 100 }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setStudents(studentRecords(data));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(getErrorMessage(e, 'Could not load students'));
      });

    if (canViewFees) {
      api
        .get('/fees', { signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted) setFees(Array.isArray(data) ? data : []);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(getErrorMessage(e, 'Could not load fee records'));
        });
    }

    return () => controller.abort();
  }, [user, canViewFees, refresh]);

  useEffect(() => {
    if (!user || !query) return;
    const controller = new AbortController();
    api.get('/students', { params: { page: 1, limit: 100, search: query }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setSearchResults({ query, records: studentRecords(data) });
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setSearchResults({ query, error: getErrorMessage(e, 'Could not search students') });
        }
      });
    return () => controller.abort();
  }, [user, query, refresh]);

  const currentSearch = searchResults?.query === query ? searchResults : null;
  const visibleStudents = query ? currentSearch?.records ?? [] : students;

  const totalFeeAmount = useMemo(() => {
    return fees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  }, [fees]);

  const paidFeeCount = useMemo(() => {
    return fees.filter((f) => f.status === 'PAID').length;
  }, [fees]);

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
    setStudents([]);
    setFees([]);
    setSearch('');
    setSearchResults(null);
    setError('');
    setMessage('');
    if (!rememberMe) {
      setEmail('');
    }
    setPassword('');
    setShowForm(false);
    setEditingStudent(null);
    setShowFeeForm(false);
    setFeeForm(emptyFeeForm);
    navigate('/', { replace: true });
  }

  function openCreateForm() {
    setEditingStudent(null);
    setStudentForm(emptyForm);
    setError('');
    setMessage('');
    setShowForm(true);
  }

  function openEditForm(student) {
    if (!student) {
      setError('Could not open this student. Please refresh and try again.');
      return;
    }

    setEditingStudent(student);
    setStudentForm({
      name: student.name ?? '',
      email: student.email ?? '',
      department: student.department ?? '',
      age: student.age ?? '',
      cgpa: student.cgpa ?? '',
    });
    setError('');
    setMessage('');
    setShowForm(true);

    window.setTimeout(() => {
      document.getElementById('student-form')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'start',
      });
    }, 0);
  }

  function closeForm() {
    setShowForm(false);
    setEditingStudent(null);
    setStudentForm(emptyForm);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setStudentForm((previous) => ({ ...previous, [name]: value }));
  }

  async function saveStudent(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    const payload = {
      name: studentForm.name.trim(),
      email: studentForm.email.trim(),
      department: studentForm.department.trim(),
      age: Number(studentForm.age),
      cgpa: Number(studentForm.cgpa),
    };

    try {
      if (editingStudent) {
        await api.patch(`/students/${editingStudent.id}`, payload);
        setMessage('Student updated successfully.');
      } else {
        await api.post('/students', payload);
        setMessage('Student created successfully.');
      }
      closeForm();
      setRefresh((previous) => previous + 1);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not save student'));
    } finally {
      setBusy(false);
    }
  }

  async function deleteStudent(student) {
    const confirmed = window.confirm(`Are you sure you want to delete ${student.name}?`);
    if (!confirmed) return;

    setError('');
    setMessage('');
    try {
      await api.delete(`/students/${student.id}`);
      setMessage('Student deleted successfully.');
      setRefresh((previous) => previous + 1);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not delete student'));
    }
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
      setError(getErrorMessage(e, 'Could not update fee status'));
    }
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
        isExiting={isExiting}
      />
    );
  }

  const allowedPages = workspacePages.filter((page) => page.id !== 'fees' || canViewFees);
  const displayName = user.name || user.email.split('@')[0];

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[var(--page-bg)] text-foreground dashboard-entering">
      {/* ─── SIDEBAR NAVIGATION (Desktop: fixed left bar matching sketch) ───── */}
      <aside className="hidden md:flex w-64 lg:w-72 shrink-0 flex-col justify-between border-r border-divider bg-surface p-5 lg:p-6 select-none">
        <div className="space-y-6">
          {/* SSM Brand Header */}
          <div className="flex items-center gap-3">
            <SSMLogo size={38} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-foreground">SSM</span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-muted">Secure Student Mgmt</p>
            </div>
          </div>

          {/* User Profile Card in Sidebar */}
          <div className="rounded-xl border border-divider bg-raised/70 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="truncate text-xs text-muted">{user.role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sketch Navigation Links: All Students, Student Fees, Semester Results */}
          <nav aria-label="Sidebar Workspace" className="space-y-1.5">
            <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted">Navigation</p>
            {allowedPages.map((page) => {
              const active = workspacePage.id === page.id;
              return (
                <Link
                  key={page.id}
                  to={page.path}
                  viewTransition={workspacePage !== page}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'text-muted hover:bg-raised hover:text-foreground'
                  }`}
                >
                  <span className={active ? 'text-white' : 'text-muted group-hover:text-foreground'}>
                    {page.icon}
                  </span>
                  <span>{page.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls: Theme Toggle & Logout */}
        <div className="pt-6 border-t border-divider space-y-2">
          <button
            type="button"
            onClick={() => setIsDark((current) => !current)}
            className="flex w-full items-center justify-between rounded-xl border border-divider px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-raised transition-colors cursor-pointer"
          >
            <span>Appearance</span>
            <span className="rounded-md bg-raised px-2 py-1 text-[11px] text-muted">
              {isDark ? '🌙 Dark' : '☀️ Light'}
            </span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="water-bubble-btn flex w-full items-center justify-center gap-2 rounded-xl bg-danger-surface px-3.5 py-2.5 text-xs font-semibold text-danger-text hover:bg-danger-hover transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ─── MOBILE TOP BAR (Responsive drawer & reading order) ─────────────── */}
      <div className="flex md:hidden items-center justify-between border-b border-divider bg-surface px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SSMLogo size={28} />
          <span className="font-bold text-foreground">SSM</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDark((c) => !c)}
            aria-label="Toggle theme"
            className="rounded-lg border border-divider p-2 text-foreground hover:bg-raised"
          >
            {isDark ? '🌙' : '☀️'}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            className="rounded-lg border border-divider p-2 text-foreground hover:bg-raised"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Nav Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-divider bg-surface px-4 py-3 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-divider">
            <span className="text-xs text-muted">{user.email}</span>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {user.role}
            </span>
          </div>
          <nav className="space-y-1">
            {allowedPages.map((page) => (
              <Link
                key={page.id}
                to={page.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  workspacePage.id === page.id ? 'bg-blue-600 text-white' : 'text-foreground hover:bg-raised'
                }`}
              >
                {page.icon}
                <span>{page.label}</span>
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={logout}
            className="water-bubble-btn w-full rounded-lg bg-danger-surface py-2 text-xs font-semibold text-danger-text cursor-pointer"
          >
            Log out
          </button>
        </div>
      )}

      {/* ─── MAIN CONTENT AREA (Top Welcome Greeting + Curly Workspace) ───── */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Top Header matching Sketch */}
        <header className="border-b border-divider bg-surface/80 backdrop-blur-md px-5 py-4 sm:px-8 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Welcome back, {displayName}
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                Secure Student Management Dashboard · Managing {students.length} students
              </p>
            </div>

            {/* Sketch [Records] button with water bubble hover zoom */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRecordsOverview((prev) => !prev)}
                className="water-bubble-btn flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-50/80 px-4 py-2.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100/90 dark:border-blue-700/60 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 cursor-pointer"
                aria-label="View quick records overview"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>[Records]</span>
              </button>
            </div>
          </div>

          {/* Records Quick Overview Banner (Toggled by [Records] button) */}
          {showRecordsOverview && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-divider bg-raised/80 p-4 transition-all">
              <div className="p-2">
                <span className="block text-xs text-muted">Total Students</span>
                <span className="text-lg font-bold text-foreground">{students.length}</span>
              </div>
              <div className="p-2">
                <span className="block text-xs text-muted">Departments</span>
                <span className="text-lg font-bold text-foreground">
                  {new Set(students.map((s) => s.department).filter(Boolean)).size}
                </span>
              </div>
              <div className="p-2">
                <span className="block text-xs text-muted">Total Fees Value</span>
                <span className="text-lg font-bold text-foreground">₹{totalFeeAmount.toFixed(0)}</span>
              </div>
              <div className="p-2">
                <span className="block text-xs text-muted">Fees Paid Rate</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {fees.length ? `${Math.round((paidFeeCount / fees.length) * 100)}%` : '—'}
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Global Notifications */}
        <div className="px-5 pt-4 sm:px-8">
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

        {/* ─── ACTIVE WORKSPACE WITH DYNAMIC CURLY MOVING BORDER ─────────────── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <CurlyBorderCard>
            <div className="p-4 sm:p-6 lg:p-7">
              {/* SECTION 1: ALL STUDENTS */}
              <section className="route-page" aria-labelledby="students-heading" hidden={workspacePage.id !== 'students'}>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 id="students-heading" tabIndex={-1} className="text-2xl font-bold text-foreground">
                      All Students
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Overview of registered students and academic records.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      className="rounded-xl border border-control bg-surface px-4 py-2.5 text-sm placeholder-muted focus:border-blue-500 focus:outline-none"
                      placeholder="Search students..."
                      aria-label="Search students"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {isAdmin && (
                      <button
                        onClick={openCreateForm}
                        className="water-bubble-btn rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 cursor-pointer"
                      >
                        + Create Student
                      </button>
                    )}
                  </div>
                </div>

                {/* Create / Edit Student Form */}
                {showForm && (
                  <form id="student-form" onSubmit={saveStudent} className="mb-6 rounded-2xl border border-divider bg-raised/50 p-5 sm:p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-foreground">
                      {editingStudent ? 'Edit Student Details' : 'Register New Student'}
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="text-sm font-medium text-foreground">
                        Full Name
                        <input
                          name="name"
                          value={studentForm.name}
                          onChange={handleFormChange}
                          className="mt-1 w-full rounded-xl border border-control bg-surface p-3 text-sm focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        Email Address
                        <input
                          name="email"
                          type="email"
                          value={studentForm.email}
                          onChange={handleFormChange}
                          className="mt-1 w-full rounded-xl border border-control bg-surface p-3 text-sm focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        Department
                        <input
                          name="department"
                          value={studentForm.department}
                          onChange={handleFormChange}
                          className="mt-1 w-full rounded-xl border border-control bg-surface p-3 text-sm focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        Age
                        <input
                          name="age"
                          type="number"
                          min="1"
                          value={studentForm.age}
                          onChange={handleFormChange}
                          className="mt-1 w-full rounded-xl border border-control bg-surface p-3 text-sm focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        CGPA
                        <input
                          name="cgpa"
                          type="number"
                          min="0"
                          max="10"
                          step="0.01"
                          value={studentForm.cgpa}
                          onChange={handleFormChange}
                          className="mt-1 w-full rounded-xl border border-control bg-surface p-3 text-sm focus:border-blue-500 focus:outline-none"
                          required
                        />
                      </label>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={busy}
                        className="water-bubble-btn rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        {busy ? 'Saving...' : editingStudent ? 'Save Changes' : 'Create Student'}
                      </button>
                      <button
                        type="button"
                        onClick={closeForm}
                        className="rounded-xl border border-divider px-5 py-2.5 text-sm font-semibold text-muted hover:bg-raised cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Students Table */}
                <div className="overflow-x-auto rounded-2xl border border-divider bg-surface shadow-sm">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="border-b border-divider bg-raised/60 text-xs font-semibold uppercase tracking-wider text-muted">
                      <tr>
                        {['ID', 'Name', 'Email', 'Department', 'Age', 'CGPA'].map((heading) => (
                          <th key={heading} className="whitespace-nowrap px-4 py-3.5">{heading}</th>
                        ))}
                        {canEdit && <th className="whitespace-nowrap px-4 py-3.5">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                      {visibleStudents.map((student, index) => (
                        <tr key={student.id ?? index} className="hover:bg-raised/40 transition-colors">
                          <td className="whitespace-nowrap px-4 py-3.5 font-medium text-foreground">{student.id ?? '—'}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-medium text-foreground">{student.name}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-muted">{student.email}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-muted">{student.department}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-muted">{student.age}</td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-foreground">{student.cgpa}</td>
                          {canEdit && (
                            <td className="whitespace-nowrap px-4 py-3.5">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    openEditForm(student);
                                  }}
                                  className="water-bubble-btn rounded-lg bg-warning-surface px-3 py-1.5 text-xs font-semibold text-warning-text hover:bg-warning-hover cursor-pointer"
                                >
                                  Edit
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => deleteStudent(student)}
                                    className="water-bubble-btn rounded-lg bg-danger-surface px-3 py-1.5 text-xs font-semibold text-danger-text hover:bg-danger-hover cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {!visibleStudents.length && (
                        <tr>
                          <td colSpan={canEdit ? 7 : 6} className="p-10 text-center text-muted">
                            <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                              <svg className="h-10 w-10 text-muted/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              <p className="font-semibold text-foreground">No students found</p>
                              <p className="text-xs text-muted mt-1">
                                {currentSearch?.error ?? (query && !currentSearch ? 'Searching students…' : 'There are currently no student records in the system.')}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

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
                      {fees.map((fee) => (
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
                      {!fees.length && (
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
                    </tbody>
                  </table>
                </div>
              </section>

              {/* SECTION 3: SEMESTER RESULTS (Gated by Dedicated Password Form) */}
              <section className="route-page" aria-labelledby="results-heading" hidden={workspacePage.id !== 'results'}>
                <ResultsPanel students={students} canEdit={canEdit} isStudent={role === 'STUDENT'} />
              </section>
            </div>
          </CurlyBorderCard>
        </main>
      </div>
    </div>
  );
}

function studentRecords(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}
