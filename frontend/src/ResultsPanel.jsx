import { useEffect, useMemo, useState } from 'react';
import { api } from './services/api';

const emptySubject = { name: '', code: '', semester: '1', maxInternal: '20', maxSemester: '80' };

function gradeFor(percentage) {
  if (percentage >= 90) return 'O';
  if (percentage >= 80) return 'A+';
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B+';
  if (percentage >= 50) return 'B';
  if (percentage >= 40) return 'C';
  return 'Fail';
}

export default function ResultsPanel({ students, canEdit, isStudent, initialUnlocked = false }) {
  const [isUnlocked, setIsUnlocked] = useState(initialUnlocked);
  const [password, setPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [semester, setSemester] = useState('1');
  const [studentId, setStudentId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [marks, setMarks] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [subjectForm, setSubjectForm] = useState(emptySubject);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isUnlocked && !studentId && students.length) {
      setStudentId(String(students[0].id));
    }
  }, [students, studentId, isUnlocked]);

  useEffect(() => {
    // Keep results locked, including through direct routes and data requests.
    if (!isUnlocked) return undefined;

    if (!isStudent && !studentId) {
      setSubjects([]);
      setMarks([]);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/results/subjects', { params: { semester: Number(semester) } }),
      api.get('/results/marks', {
        params: { semester: Number(semester), ...(!isStudent && studentId ? { studentId } : {}) },
      }),
    ])
      .then(([subjectResponse, markResponse]) => {
        if (!active) return;
        const loadedSubjects = Array.isArray(subjectResponse.data) ? subjectResponse.data : [];
        const loadedMarks = Array.isArray(markResponse.data) ? markResponse.data : [];
        setSubjects(loadedSubjects);
        setMarks(loadedMarks);
        setDrafts(
          Object.fromEntries(
            loadedMarks.map((mark) => [
              mark.subjectId,
              {
                internalMark: String(mark.internalMark),
                semesterMark: String(mark.semesterMark),
              },
            ]),
          ),
        );
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Could not load results.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [semester, studentId, isStudent, isUnlocked]);

  const marksBySubject = useMemo(
    () => new Map(marks.map((mark) => [mark.subjectId, mark])),
    [marks],
  );
  const total = marks.reduce((sum, mark) => sum + Number(mark.total), 0);
  const possible = marks.reduce((sum, mark) => sum + Number(mark.maxInternal) + Number(mark.maxSemester), 0);
  const overallPercentage = possible ? (total / possible) * 100 : 0;

  async function handleUnlockSubmit(event) {
    event.preventDefault();
    setUnlockError('');
    setUnlockBusy(true);

    try {
      // Attempt verification against server without hardcoding or inventing credentials
      const { data } = await api.post('/results/verify-access', { password });
      if (data?.verified || data?.success) {
        setIsUnlocked(true);
      } else {
        setUnlockError(data?.message || 'Results access hasn’t been configured yet.');
      }
    } catch {
      // Per specification: If verification is unavailable, show "Results access hasn’t been configured yet."
      setUnlockError('Results access hasn’t been configured yet.');
    } finally {
      setUnlockBusy(false);
    }
  }

  async function createSubject(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/results/subjects', {
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim().toUpperCase(),
        semester: Number(subjectForm.semester),
        maxInternal: Number(subjectForm.maxInternal),
        maxSemester: Number(subjectForm.maxSemester),
      });
      setSemester(subjectForm.semester);
      setSubjectForm(emptySubject);
      setShowSubjectForm(false);
      setMessage('Subject saved successfully.');
      const { data } = await api.get('/results/subjects', {
        params: { semester: Number(subjectForm.semester) },
      });
      setSubjects(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not save the subject.');
    }
  }

  async function saveMark(subject) {
    const draft = drafts[subject.id] || { internalMark: '', semesterMark: '' };
    setError('');
    setMessage('');
    setSavingId(subject.id);
    try {
      const { data } = await api.post('/results/marks', {
        studentId: Number(studentId),
        subjectId: subject.id,
        internalMark: Number(draft.internalMark),
        semesterMark: Number(draft.semesterMark),
      });
      setMarks((current) => [...current.filter((mark) => mark.subjectId !== subject.id), data]);
      setMessage(`${subject.name} marks saved successfully.`);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not save marks.');
    } finally {
      setSavingId(null);
    }
  }

  // ── Locked State: Dedicated Password Form ───────────────────────────────
  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-divider bg-surface p-6 sm:p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <div className="text-center">
          <h2 id="results-heading" tabIndex={-1} className="text-2xl font-bold text-foreground">
            Semester Results
          </h2>
          <p className="mt-2 text-sm text-muted">
            Academic records are protected. Enter the results access password to view examination marks.
          </p>
        </div>

        {unlockError && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200"
          >
            {unlockError}
          </div>
        )}

        <form onSubmit={handleUnlockSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="results-password" className="block text-sm font-semibold text-foreground">
              Semester Results Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="results-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (unlockError) setUnlockError('');
                }}
                placeholder="Enter password"
                className="w-full rounded-xl border border-control bg-surface p-3 pr-10 text-sm text-foreground placeholder-muted outline-none transition-colors focus:border-blue-500"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={unlockBusy}
            className="water-bubble-btn w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            {unlockBusy ? 'Verifying…' : 'View results'}
          </button>
        </form>
      </div>
    );
  }

  // ── Unlocked State: Full Results Workspace ──────────────────────────────
  return (
    <div className="rounded-2xl border border-divider bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="results-heading" tabIndex={-1} className="text-2xl font-bold text-foreground">
            Semester Results
          </h1>
          <p className="mt-1 text-sm text-muted">
            Enter internal and semester examination marks. Grades are calculated automatically.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowSubjectForm((shown) => !shown)}
            className="water-bubble-btn rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            {showSubjectForm ? 'Cancel' : '+ Add Subject'}
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-foreground">
          Semester
          <select
            value={semester}
            onChange={(event) => setSemester(event.target.value)}
            className="mt-1 w-full rounded-lg border p-3"
          >
            {Array.from({ length: 8 }, (_, index) => String(index + 1)).map((number) => (
              <option key={number} value={number}>
                Semester {number}
              </option>
            ))}
          </select>
        </label>
        {!isStudent && (
          <label className="text-sm font-medium text-foreground">
            Student
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="mt-1 w-full rounded-lg border p-3"
              required
            >
              <option value="">Select a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} (#{student.id})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {showSubjectForm && canEdit && (
        <form onSubmit={createSubject} className="mt-5 grid gap-3 rounded-xl bg-raised p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium">
            Subject name
            <input
              required
              minLength="2"
              value={subjectForm.name}
              onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border p-3"
              placeholder="Mathematics"
            />
          </label>
          <label className="text-sm font-medium">
            Subject code
            <input
              required
              minLength="2"
              maxLength="30"
              pattern="[A-Za-z0-9._-]+"
              value={subjectForm.code}
              onChange={(event) => setSubjectForm((current) => ({ ...current, code: event.target.value }))}
              className="mt-1 w-full rounded-lg border p-3"
              placeholder="MAT101"
            />
          </label>
          <label className="text-sm font-medium">
            Semester
            <input
              required
              type="number"
              min="1"
              max="8"
              value={subjectForm.semester}
              onChange={(event) => setSubjectForm((current) => ({ ...current, semester: event.target.value }))}
              className="mt-1 w-full rounded-lg border p-3"
            />
          </label>
          <label className="text-sm font-medium">
            Internal max mark
            <input
              required
              type="number"
              min="1"
              value={subjectForm.maxInternal}
              onChange={(event) => setSubjectForm((current) => ({ ...current, maxInternal: event.target.value }))}
              className="mt-1 w-full rounded-lg border p-3"
            />
          </label>
          <label className="text-sm font-medium">
            Semester exam max mark
            <input
              required
              type="number"
              min="1"
              value={subjectForm.maxSemester}
              onChange={(event) => setSubjectForm((current) => ({ ...current, maxSemester: event.target.value }))}
              className="mt-1 w-full rounded-lg border p-3"
            />
          </label>
          <button
            type="submit"
            className="water-bubble-btn rounded-lg bg-secondary-action px-4 py-3 font-semibold text-white sm:col-span-2 lg:col-span-4 cursor-pointer"
          >
            Save Subject
          </button>
        </form>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-danger-surface p-3 text-sm text-danger-text">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-success-surface p-3 text-sm text-success-text">{message}</p>}

      {isStudent && marks.length > 0 && (
        <div className="mt-5 grid gap-3 rounded-xl bg-info-surface p-4 sm:grid-cols-3">
          <p>
            <span className="block text-xs text-muted">Semester total</span>
            <strong>{total} / {possible}</strong>
          </p>
          <p>
            <span className="block text-xs text-muted">Percentage</span>
            <strong>{overallPercentage.toFixed(2)}%</strong>
          </p>
          <p>
            <span className="block text-xs text-muted">Overall grade</span>
            <strong>{gradeFor(overallPercentage)}</strong>
          </p>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading && <p className="py-6 text-center text-muted">Loading results...</p>}
        {!loading &&
          subjects.map((subject) => {
            const saved = marksBySubject.get(subject.id);
            const draft = drafts[subject.id] || { internalMark: '', semesterMark: '' };
            return (
              <article key={subject.id} className="rounded-xl border border-divider p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {subject.code} · {subject.name}
                    </h3>
                    <p className="text-xs text-muted">
                      Internal max {subject.maxInternal} · Semester max {subject.maxSemester}
                    </p>
                  </div>
                  {saved && (
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        saved.grade === 'Fail'
                          ? 'bg-danger-surface text-danger-text'
                          : 'bg-success-surface text-success-text'
                      }`}
                    >
                      {saved.grade}
                    </span>
                  )}
                </div>
                {canEdit ? (
                  <div className="mt-4 grid items-end gap-3 sm:grid-cols-3">
                    <label className="text-sm">
                      Internal mark
                      <input
                        type="number"
                        min="0"
                        max={subject.maxInternal}
                        value={draft.internalMark}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [subject.id]: { ...draft, internalMark: event.target.value },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border p-3"
                      />
                    </label>
                    <label className="text-sm">
                      Semester exam mark
                      <input
                        type="number"
                        min="0"
                        max={subject.maxSemester}
                        value={draft.semesterMark}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [subject.id]: { ...draft, semesterMark: event.target.value },
                          }))
                        }
                        className="mt-1 w-full rounded-lg border p-3"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!studentId || savingId === subject.id}
                      onClick={() => saveMark(subject)}
                      className="water-bubble-btn rounded-lg bg-secondary-action px-4 py-3 font-semibold text-white disabled:opacity-50 cursor-pointer"
                    >
                      {savingId === subject.id ? 'Saving...' : saved ? 'Update Marks' : 'Save Marks'}
                    </button>
                  </div>
                ) : saved ? (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                    <span>Internal: {saved.internalMark}/{saved.maxInternal}</span>
                    <span>Semester: {saved.semesterMark}/{saved.maxSemester}</span>
                    <span>Total: {saved.total}/{Number(saved.maxInternal) + Number(saved.maxSemester)}</span>
                    <span>{Number(saved.percentage).toFixed(2)}%</span>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">Marks have not been entered.</p>
                )}
                {canEdit && saved && (
                  <p className="mt-2 text-sm text-muted">
                    Total {saved.total}/{Number(saved.maxInternal) + Number(saved.maxSemester)} · {Number(saved.percentage).toFixed(2)}%
                  </p>
                )}
              </article>
            );
          })}
        {!loading && !subjects.length && (
          <p className="rounded-xl bg-raised p-8 text-center text-muted">
            No subjects have been added for this semester.
          </p>
        )}
      </div>
    </div>
  );
}
