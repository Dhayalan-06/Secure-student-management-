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

export default function ResultsPanel({ students, canEdit, isStudent }) {
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
    if (!studentId && students.length) setStudentId(String(students[0].id));
  }, [students, studentId]);

  useEffect(() => {
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
        setDrafts(Object.fromEntries(loadedMarks.map((mark) => [mark.subjectId, {
          internalMark: String(mark.internalMark),
          semesterMark: String(mark.semesterMark),
        }])));
      })
      .catch((requestError) => {
        if (active) setError(requestError?.response?.data?.message || 'Could not load results.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [semester, studentId, isStudent]);

  const marksBySubject = useMemo(
    () => new Map(marks.map((mark) => [mark.subjectId, mark])),
    [marks],
  );
  const total = marks.reduce((sum, mark) => sum + Number(mark.total), 0);
  const possible = marks.reduce((sum, mark) => sum + Number(mark.maxInternal) + Number(mark.maxSemester), 0);
  const overallPercentage = possible ? (total / possible) * 100 : 0;

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
      const { data } = await api.get('/results/subjects', { params: { semester: Number(subjectForm.semester) } });
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

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Semester Results</h2>
          <p className="mt-1 text-sm text-slate-500">Enter internal and semester examination marks. Grades are calculated automatically.</p>
        </div>
        {canEdit && (
          <button type="button" onClick={() => setShowSubjectForm((shown) => !shown)}
            className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">
            {showSubjectForm ? 'Cancel' : '+ Add Subject'}
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Semester
          <select value={semester} onChange={(event) => setSemester(event.target.value)}
            className="mt-1 w-full rounded-lg border bg-white p-3">
            {Array.from({ length: 8 }, (_, index) => String(index + 1)).map((number) => (
              <option key={number} value={number}>Semester {number}</option>
            ))}
          </select>
        </label>
        {!isStudent && (
          <label className="text-sm font-medium text-slate-700">
            Student
            <select value={studentId} onChange={(event) => setStudentId(event.target.value)}
              className="mt-1 w-full rounded-lg border bg-white p-3" required>
              <option value="">Select a student</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.name} (#{student.id})</option>)}
            </select>
          </label>
        )}
      </div>

      {showSubjectForm && canEdit && (
        <form onSubmit={createSubject} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium">Subject name
            <input required minLength="2" value={subjectForm.name} onChange={(event) => setSubjectForm((current) => ({ ...current, name: event.target.value }))}
              className="mt-1 w-full rounded-lg border bg-white p-3" placeholder="Mathematics" />
          </label>
          <label className="text-sm font-medium">Subject code
            <input required minLength="2" maxLength="30" pattern="[A-Za-z0-9._-]+" value={subjectForm.code} onChange={(event) => setSubjectForm((current) => ({ ...current, code: event.target.value }))}
              className="mt-1 w-full rounded-lg border bg-white p-3" placeholder="MAT101" />
          </label>
          <label className="text-sm font-medium">Semester
            <input required type="number" min="1" max="8" value={subjectForm.semester} onChange={(event) => setSubjectForm((current) => ({ ...current, semester: event.target.value }))}
              className="mt-1 w-full rounded-lg border bg-white p-3" />
          </label>
          <label className="text-sm font-medium">Internal max mark
            <input required type="number" min="1" value={subjectForm.maxInternal} onChange={(event) => setSubjectForm((current) => ({ ...current, maxInternal: event.target.value }))}
              className="mt-1 w-full rounded-lg border bg-white p-3" />
          </label>
          <label className="text-sm font-medium">Semester exam max mark
            <input required type="number" min="1" value={subjectForm.maxSemester} onChange={(event) => setSubjectForm((current) => ({ ...current, maxSemester: event.target.value }))}
              className="mt-1 w-full rounded-lg border bg-white p-3" />
          </label>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white sm:col-span-2 lg:col-span-4">Save Subject</button>
        </form>
      )}

      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}

      {isStudent && marks.length > 0 && (
        <div className="mt-5 grid gap-3 rounded-xl bg-blue-50 p-4 sm:grid-cols-3">
          <p><span className="block text-xs text-slate-500">Semester total</span><strong>{total} / {possible}</strong></p>
          <p><span className="block text-xs text-slate-500">Percentage</span><strong>{overallPercentage.toFixed(2)}%</strong></p>
          <p><span className="block text-xs text-slate-500">Overall grade</span><strong>{gradeFor(overallPercentage)}</strong></p>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading && <p className="py-6 text-center text-slate-500">Loading results...</p>}
        {!loading && subjects.map((subject) => {
          const saved = marksBySubject.get(subject.id);
          const draft = drafts[subject.id] || { internalMark: '', semesterMark: '' };
          return (
            <article key={subject.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{subject.code} · {subject.name}</h3>
                  <p className="text-xs text-slate-500">Internal max {subject.maxInternal} · Semester max {subject.maxSemester}</p>
                </div>
                {saved && <span className={`rounded-full px-3 py-1 text-sm font-bold ${saved.grade === 'Fail' ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>{saved.grade}</span>}
              </div>
              {canEdit ? (
                <div className="mt-4 grid items-end gap-3 sm:grid-cols-3">
                  <label className="text-sm">Internal mark
                    <input type="number" min="0" max={subject.maxInternal} value={draft.internalMark}
                      onChange={(event) => setDrafts((current) => ({ ...current, [subject.id]: { ...draft, internalMark: event.target.value } }))}
                      className="mt-1 w-full rounded-lg border p-3" />
                  </label>
                  <label className="text-sm">Semester exam mark
                    <input type="number" min="0" max={subject.maxSemester} value={draft.semesterMark}
                      onChange={(event) => setDrafts((current) => ({ ...current, [subject.id]: { ...draft, semesterMark: event.target.value } }))}
                      className="mt-1 w-full rounded-lg border p-3" />
                  </label>
                  <button type="button" disabled={!studentId || savingId === subject.id} onClick={() => saveMark(subject)}
                    className="rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">
                    {savingId === subject.id ? 'Saving...' : saved ? 'Update Marks' : 'Save Marks'}
                  </button>
                </div>
              ) : saved ? (
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                  <span>Internal: {saved.internalMark}/{saved.maxInternal}</span>
                  <span>Semester: {saved.semesterMark}/{saved.maxSemester}</span>
                  <span>Total: {saved.total}/{Number(saved.maxInternal) + Number(saved.maxSemester)}</span>
                  <span>{Number(saved.percentage).toFixed(2)}%</span>
                </div>
              ) : <p className="mt-3 text-sm text-slate-500">Marks have not been entered.</p>}
              {canEdit && saved && <p className="mt-2 text-sm text-slate-600">Total {saved.total}/{Number(saved.maxInternal) + Number(saved.maxSemester)} · {Number(saved.percentage).toFixed(2)}%</p>}
            </article>
          );
        })}
        {!loading && !subjects.length && <p className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">No subjects have been added for this semester.</p>}
      </div>

    </section>
  );
}
