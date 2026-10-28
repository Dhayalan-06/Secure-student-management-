import { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { api } from './services/api';

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

export default function App() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registrationProfile, setRegistrationProfile] = useState(emptyRegistrationProfile);
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [fees, setFees] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [feeForm, setFeeForm] = useState(emptyFeeForm);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState(emptyForm);
  const [refresh, setRefresh] = useState(0);

  const role = String(user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const canEdit = isAdmin || role === 'STAFF';

  function getErrorMessage(e, fallback) {
    const msg = e?.response?.data?.message;
    return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
  }

  async function loadMe() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user ?? data);
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  }

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      loadMe();
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    api
      .get('/students', { params: { page: 1, limit: 100, search } })
      .then(({ data }) => {
        const records = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.items)
              ? data.items
              : [];
        setStudents(records);
        setError('');
      })
      .catch((e) => {
        setError(getErrorMessage(e, 'Could not load students'));
      });

    api
      .get('/fees')
      .then(({ data }) => {
        setFees(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        setError(getErrorMessage(e, 'Could not load fee records'));
      });
  }, [user, search, refresh]);

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
        setMode('login');
        setMessage('Registration successful. Please log in.');
        setPassword('');
        setRegistrationProfile(emptyRegistrationProfile);
      } else {
        const { data } = await api.post('/auth/login', { email, password });
        if (!data?.accessToken) {
          throw new Error('Login response did not include an accessToken.');
        }
        localStorage.setItem('accessToken', data.accessToken);
        if (data.user) {
          setUser(data.user);
        } else {
          await loadMe();
        }
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
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
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
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
    setShowForm(false);
    setEditingStudent(null);
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
        behavior: 'smooth',
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

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-lg">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Secure Student Management</h1>
            <p className="mt-2 text-sm text-slate-500">
              {mode === 'login' ? 'Welcome back' : 'Create student account'}
            </p>
            <p className="mt-1 text-xs text-slate-400">JWT authentication and role-based access</p>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-1 w-full rounded-lg border p-3 outline-none focus:border-blue-500"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {mode === 'register' && (
            <>
              <label className="block text-sm font-medium text-slate-700">
                Student name
                <input
                  className="mt-1 w-full rounded-lg border p-3 outline-none focus:border-blue-500"
                  type="text"
                  minLength={2}
                  required
                  value={registrationProfile.name}
                  onChange={(e) => setRegistrationProfile((current) => ({ ...current, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Department
                <input
                  className="mt-1 w-full rounded-lg border p-3 outline-none focus:border-blue-500"
                  type="text"
                  minLength={2}
                  maxLength={100}
                  required
                  value={registrationProfile.department}
                  onChange={(e) => setRegistrationProfile((current) => ({ ...current, department: e.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  Age
                  <input
                    className="mt-1 w-full rounded-lg border p-3 outline-none focus:border-blue-500"
                    type="number"
                    min="16"
                    max="100"
                    required
                    value={registrationProfile.age}
                    onChange={(e) => setRegistrationProfile((current) => ({ ...current, age: e.target.value }))}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  CGPA
                  <input
                    className="mt-1 w-full rounded-lg border p-3 outline-none focus:border-blue-500"
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    required
                    value={registrationProfile.cgpa}
                    onChange={(e) => setRegistrationProfile((current) => ({ ...current, cgpa: e.target.value }))}
                  />
                </label>
              </div>
            </>
          )}

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-1 w-full rounded-lg border p-3 outline-none focus:border-blue-500"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
          </button>

          {mode === 'login' && (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={submitGoogleCredential}
                onError={() => setError('Google sign-in failed. Please try again.')}
                useOneTap={false}
              />
            </div>
          )}

          <button
            type="button"
            className="w-full text-sm font-medium text-blue-700 hover:underline"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
              setMessage('');
            }}
          >
            {mode === 'login' ? 'Need an account? Register' : 'Already registered? Login'}
          </button>
          <p className="text-center text-xs text-slate-500">
            Public registration should create a Student role on the backend.
          </p>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 px-6 py-4 text-white">
        <div>
          <h1 className="text-xl font-bold">Student Management</h1>
          <p className="text-sm text-slate-300">{user.email} · {user.role}</p>
        </div>
        <button onClick={logout} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
          Logout
        </button>
      </header>

      <section className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Students</h2>
            <p className="mt-1 text-slate-500">Visible records are restricted by your role.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              className="rounded-lg border bg-white p-3"
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

        {message && <p className="mb-4 rounded-lg bg-green-50 p-3 text-green-700">{message}</p>}
        {error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}

        {showForm && (
          <form id="student-form" onSubmit={saveStudent} className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xl font-bold text-slate-900">
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
                className="rounded-lg border px-5 py-3 hover:bg-slate-100">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                {['ID', 'Name', 'Email', 'Department', 'Age', 'CGPA'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap p-4 font-semibold">{heading}</th>
                ))}
                {canEdit && <th className="whitespace-nowrap p-4">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id ?? index} className="border-t hover:bg-slate-50">
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
                          className="rounded-md bg-amber-100 px-3 py-2 font-medium text-amber-800 hover:bg-amber-200">
                          Edit
                        </button>
                        {isAdmin && (
                          <button onClick={() => deleteStudent(student)}
                            className="rounded-md bg-rose-100 px-3 py-2 font-medium text-rose-700 hover:bg-rose-200">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!students.length && (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="p-8 text-center text-slate-500">
                    No student records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Fee transactions</h2>
              <p className="mt-1 text-slate-500">Track each fee as pending or paid.</p>
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
            <form onSubmit={saveFee} className="mb-5 grid gap-4 rounded-xl border bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm font-medium">
                Student
                <select
                  className="mt-1 w-full rounded-lg border bg-white p-3"
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
                {!students.length && <p className="mt-2 text-sm text-amber-700">Create a student record before adding a fee.</p>}
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  {['Student', 'Department', 'Fee', 'Amount', 'Due date', 'Status', 'Paid on'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap p-4 font-semibold">{heading}</th>
                  ))}
                  {isAdmin && <th className="whitespace-nowrap p-4">Action</th>}
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id} className="border-t hover:bg-slate-50">
                    <td className="whitespace-nowrap p-4">{fee.studentName}</td>
                    <td className="whitespace-nowrap p-4">{fee.departmentName || '—'}</td>
                    <td className="p-4">{fee.description}</td>
                    <td className="whitespace-nowrap p-4">{Number(fee.amount).toFixed(2)}</td>
                    <td className="whitespace-nowrap p-4">{fee.dueDate}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${fee.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {fee.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-4">{fee.paidAt ? new Date(fee.paidAt).toLocaleDateString() : '—'}</td>
                    {isAdmin && (
                      <td className="whitespace-nowrap p-4">
                        <button
                          type="button"
                          onClick={() => changeFeeStatus(fee, fee.status === 'PAID' ? 'PENDING' : 'PAID')}
                          className="rounded-md border px-3 py-2 font-medium hover:bg-slate-100"
                        >
                          Mark {fee.status === 'PAID' ? 'pending' : 'paid'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {!fees.length && (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-slate-500">No fee transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <p className="mt-4 text-xs text-slate-500">Logged in as {user.role}.</p>
      </section>
    </main>
  );
}
