import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from './services/api';
import ResultsPanel from './ResultsPanel';
import AuthPage from './AuthPage';

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
  { id: 'students', path: '/students', label: 'Students' },
  { id: 'results', path: '/results', label: 'Semester Results' },
  { id: 'fees', path: '/fees', label: 'Fees' },
];

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
      // Keep the selected theme for the current page when storage is unavailable.
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
    document.title = `${pageTitle} | Student Management`;
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

        // Zoom into UI only when credentials are valid
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

    // The edit form is above the table; scroll to it after React renders it.
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

  return (
    <div className="min-h-screen dashboard-entering">
      <header className="workspace-header">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1 basis-36">
            <p className="text-lg font-semibold text-foreground">Student Management</p>
            <p className="break-all text-sm text-muted">{user.email} · {user.role}</p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setIsDark((current) => !current)}
              className="min-h-11 rounded-lg border border-control px-3 text-sm font-medium text-foreground hover:bg-raised">
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>
            <button type="button" onClick={logout}
              className="min-h-11 rounded-lg border border-divider px-3 text-sm font-medium text-foreground hover:bg-raised">
              Logout
            </button>
          </div>
        </div>
        <nav aria-label="Workspace" className="workspace-nav mx-auto flex max-w-6xl gap-2 px-4 sm:px-6">
          {workspacePages.filter((page) => page.id !== 'fees' || canViewFees).map((page) => (
            <Link
              key={page.id}
              to={page.path}
              viewTransition={workspacePage !== page}
              aria-current={workspacePage === page ? 'page' : undefined}
            >
              {page.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {message && <p role="status" className="mb-4 rounded-lg bg-success-surface p-3 text-success-text">{message}</p>}
        {error && <p role="alert" className="mb-4 rounded-lg bg-danger-surface p-3 text-danger-text">{error}</p>}

        <section className="route-page" aria-labelledby="students-heading" hidden={workspacePage.id !== 'students'}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 id="students-heading" tabIndex={-1} className="text-2xl font-bold text-foreground">Students</h1>
              <p className="mt-1 text-muted">Visible records are restricted by your role.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                className="rounded-lg border p-3"
                placeholder="Search students..."
                aria-label="Search students"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {isAdmin && (
                <button
                  onClick={openCreateForm}
                  className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  + Create Student
                </button>
              )}
            </div>
          </div>

          {showForm && (
            <form id="student-form" onSubmit={saveStudent} className="mb-6 rounded-xl border bg-surface p-6 shadow-sm">
              <h3 className="mb-4 text-xl font-bold text-foreground">
                {editingStudent ? 'Edit Student' : 'Create Student'}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Name
                  <input name="name" value={studentForm.name} onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border p-3" required />
                </label>
                <label className="text-sm font-medium">
                  Email
                  <input name="email" type="email" value={studentForm.email} onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border p-3" required />
                </label>
                <label className="text-sm font-medium">
                  Department
                  <input name="department" value={studentForm.department} onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border p-3" required />
                </label>
                <label className="text-sm font-medium">
                  Age
                  <input name="age" type="number" min="1" value={studentForm.age} onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border p-3" required />
                </label>
                <label className="text-sm font-medium">
                  CGPA
                  <input name="cgpa" type="number" min="0" max="10" step="0.01"
                    value={studentForm.cgpa} onChange={handleFormChange}
                    className="mt-1 w-full rounded-lg border p-3" required />
                </label>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="submit" disabled={busy}
                  className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {busy ? 'Saving...' : editingStudent ? 'Save Changes' : 'Create Student'}
                </button>
                <button type="button" onClick={closeForm}
                  className="rounded-lg border px-5 py-3 hover:bg-raised">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border bg-surface shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-raised text-muted">
                <tr>
                  {['ID', 'Name', 'Email', 'Department', 'Age', 'CGPA'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap p-4 font-semibold">{heading}</th>
                  ))}
                  {canEdit && <th className="whitespace-nowrap p-4">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student, index) => (
                  <tr key={student.id ?? index} className="border-t hover:bg-raised">
                    <td className="whitespace-nowrap p-4 font-medium">{student.id ?? '—'}</td>
                    <td className="whitespace-nowrap p-4">{student.name}</td>
                    <td className="whitespace-nowrap p-4">{student.email}</td>
                    <td className="whitespace-nowrap p-4">{student.department}</td>
                    <td className="whitespace-nowrap p-4">{student.age}</td>
                    <td className="whitespace-nowrap p-4">{student.cgpa}</td>
                    {canEdit && (
                      <td className="whitespace-nowrap p-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              openEditForm(student);
                            }}
                            className="rounded-md bg-warning-surface px-3 py-2 font-medium text-warning-text hover:bg-warning-hover">
                            Edit
                          </button>
                          {isAdmin && (
                            <button onClick={() => deleteStudent(student)}
                              className="rounded-md bg-danger-surface px-3 py-2 font-medium text-danger-text hover:bg-danger-hover">
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
                    <td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-muted">
                      {currentSearch?.error ?? (query && !currentSearch ? 'Searching students…' : 'No student records found.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="route-page" aria-labelledby="results-heading" hidden={workspacePage.id !== 'results'}>
          <ResultsPanel students={students} canEdit={canEdit} isStudent={role === 'STUDENT'} />
        </section>

        <section className="route-page" aria-labelledby="fees-heading" hidden={workspacePage.id !== 'fees'}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 id="fees-heading" tabIndex={-1} className="text-2xl font-bold text-foreground">Fee transactions</h1>
              <p className="mt-1 text-muted">Track each fee as pending or paid.</p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setFeeForm(emptyFeeForm);
                  setShowFeeForm((shown) => !shown);
                }}
                className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
              >
                {showFeeForm ? 'Cancel' : '+ Add Fee'}
              </button>
            )}
          </div>

          {showFeeForm && isAdmin && (
            <form onSubmit={saveFee} className="mb-5 grid gap-4 rounded-xl border bg-surface p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium">
                Student
                <select
                  className="mt-1 w-full rounded-lg border p-3"
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
              <label className="text-sm font-medium">
                Fee description
                <input
                  className="mt-1 w-full rounded-lg border p-3"
                  required
                  minLength={2}
                  maxLength={120}
                  value={feeForm.description}
                  onChange={(e) => setFeeForm((current) => ({ ...current, description: e.target.value }))}
                  placeholder="Semester fee"
                />
              </label>
              <label className="text-sm font-medium">
                Amount
                <input
                  className="mt-1 w-full rounded-lg border p-3"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={feeForm.amount}
                  onChange={(e) => setFeeForm((current) => ({ ...current, amount: e.target.value }))}
                />
              </label>
              <label className="text-sm font-medium">
                Due date
                <input
                  className="mt-1 w-full rounded-lg border p-3"
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
                  className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? 'Saving...' : 'Create pending fee'}
                </button>
                {!students.length && <p className="mt-2 text-sm text-warning-text">Create a student record before adding a fee.</p>}
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border bg-surface shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-raised text-muted">
                <tr>
                  {['Student', 'Department', 'Fee', 'Amount', 'Due date', 'Status', 'Paid on'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap p-4 font-semibold">{heading}</th>
                  ))}
                  {isAdmin && <th className="whitespace-nowrap p-4">Action</th>}
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="border-t hover:bg-raised">
                    <td className="whitespace-nowrap p-4">{fee.studentName}</td>
                    <td className="whitespace-nowrap p-4">{fee.departmentName || '—'}</td>
                    <td className="p-4">{fee.description}</td>
                    <td className="whitespace-nowrap p-4">{Number(fee.amount).toFixed(2)}</td>
                    <td className="whitespace-nowrap p-4">{fee.dueDate}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${fee.status === 'PAID' ? 'bg-success-surface text-success-text' : 'bg-warning-surface text-warning-text'}`}>
                        {fee.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-4">{fee.paidAt ? new Date(fee.paidAt).toLocaleDateString() : '—'}</td>
                    {isAdmin && (
                      <td className="whitespace-nowrap p-4">
                        <button
                          type="button"
                          onClick={() => changeFeeStatus(fee, fee.status === 'PAID' ? 'PENDING' : 'PAID')}
                          className="rounded-md border px-3 py-2 font-medium hover:bg-raised"
                        >
                          Mark {fee.status === 'PAID' ? 'pending' : 'paid'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {!fees.length && (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-muted">No fee transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function studentRecords(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}
