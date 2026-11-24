import { useEffect, useRef, useState } from 'react';
import { api } from './services/api';

const semesters = [1, 2, 3, 4, 5, 6, 7, 8];

function errorMessage(error, fallback) {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || fallback;
}

function gradeFor(percentage) {
  if (percentage >= 90) return 'O';
  if (percentage >= 80) return 'A+';
  if (percentage >= 70) return 'A';
  if (percentage >= 60) return 'B+';
  if (percentage >= 50) return 'B';
  return percentage >= 40 ? 'C' : 'Fail';
}

/**
 * @param {object} props
 * @param {{ registrationNumber: string | null }[]} [props.students]
 * @param {boolean} [props.canEdit]
 * @param {boolean} [props.isStudent]
 */
export default function ResultsPanel({ students = [], canEdit = false, isStudent = false }) {
  const [record, setRecord] = useState(null);
  const [number, setNumber] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(null);
  const numberInput = useRef(null);
  const returnFocus = useRef(false);
  const autoStarted = useRef(false);

  const studentNumber = isStudent
    ? students.find((student) => student.registrationNumber)?.registrationNumber ?? null
    : null;

  useEffect(() => () => request.current?.abort(), []);

  async function performLookup(registrationNumber) {
    const controller = new AbortController();
    request.current = controller;
    setChecking(true);
    setError('');
    try {
      const { data } = await api.post('/results/lookup', { registrationNumber }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!data?.student?.id || !Array.isArray(data.marks)) throw new Error('Invalid marksheet');
      setNumber('');
      setRevealed(false);
      setRecord(data);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err.response?.status === 404
          ? 'No matching record. Check the number on your hall ticket and try again.'
          : errorMessage(err, 'Could not reach the results service. Please try again.'));
      }
    } finally {
      if (!controller.signal.aborted) setChecking(false);
      request.current = null;
    }
  }

  async function lookup(event) {
    event.preventDefault();
    if (request.current) return;
    const registrationNumber = number.trim();
    if (!registrationNumber) {
      setError('Enter your hall ticket or registration number.');
      return;
    }
    performLookup(registrationNumber);
  }

  // Students: their registration is already on file, so open their marksheet
  // automatically instead of asking for a hall ticket. Admin/staff keep the
  // hall-ticket box to look up any specific student.
  useEffect(() => {
    if (!isStudent || autoStarted.current || checking || record) return;
    if (students.length === 0) return; // student profile still loading
    if (!studentNumber) {
      setError('Your registration number is not assigned yet. Please contact the administration.');
      autoStarted.current = true;
      return;
    }
    autoStarted.current = true;
    performLookup(studentNumber);
  }, [isStudent, students, studentNumber, checking, record]);

  useEffect(() => {
    if (!record && returnFocus.current) numberInput.current?.focus();
  }, [record]);

  if (record) {
    return <Marksheet record={record} canEdit={canEdit} close={() => {
      returnFocus.current = true;
      autoStarted.current = false;
      setRecord(null);
    }} />;
  }

  // Student view: no hall-ticket box — results load from the registered account.
  if (isStudent) {
    return (
      <div className="exam-portal">
        <section className="exam-access">
          <div className="exam-access-form">
            <h2 id="results-heading" tabIndex={-1}>Semester results</h2>
            {checking ? (
              <p>Opening your marksheet…</p>
            ) : error ? (
              <>
                <p id="exam-access-error" role="alert" className="exam-error">{error}</p>
                <p>Your results could not be loaded. Please contact the administration.</p>
              </>
            ) : students.length === 0 ? (
              <p>Loading your registration…</p>
            ) : (
              <>
                <p id="exam-access-error" role="alert" className="exam-error">
                  Your registration number is not assigned yet. Please contact the administration.
                </p>
                <p>Results cannot be opened without a hall ticket on your account.</p>
              </>
            )}
          </div>
          <div className="exam-library" aria-hidden="true" />
        </section>
      </div>
    );
  }

  return (
    <div className="exam-portal">
      <section className="exam-access">
        <div className="exam-access-form">
          <h2 id="results-heading" tabIndex={-1}>Semester results</h2>
          <p>Enter the number issued by your institution to open a student marksheet.</p>
          <form onSubmit={lookup}>
            <label htmlFor="exam-registration">Hall ticket / registration number</label>
            <div className="exam-secret">
              <input id="exam-registration" ref={numberInput} type={revealed ? 'text' : 'password'}
                required maxLength={64} autoComplete="off" spellCheck={false} value={number} readOnly={checking}
                aria-invalid={Boolean(error)} aria-describedby={error ? 'exam-access-error' : undefined}
                onChange={(event) => { setNumber(event.target.value); setError(''); }} />
              <button type="button" aria-label={revealed ? 'Hide number' : 'Show number'}
                onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide' : 'Show'}</button>
            </div>
            {error && <p id="exam-access-error" role="alert" className="exam-error">{error}</p>}
            <button className="exam-primary" type="submit" disabled={checking}>
              {checking ? 'Opening marksheet…' : 'View results'} <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
        <div className="exam-library" aria-hidden="true" />
      </section>
    </div>
  );
}

function Marksheet({ record, canEdit, close }) {
  const [semester, setSemester] = useState(() => Math.max(1, ...record.marks.map((row) => Number(row.semester))));
  const [marks, setMarks] = useState(record.marks);
  const [subjects, setSubjects] = useState([]);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [catalogState, setCatalogState] = useState('loading');
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const heading = useRef(null);
  const writePending = useRef(false);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogState('loading');
    api.get('/results/subjects', { signal: controller.signal })
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error('Invalid subject list');
        if (!controller.signal.aborted) {
          setSubjects(data);
          setCatalogState('ready');
        }
      })
      .catch(() => { if (!controller.signal.aborted) setCatalogState('error'); });
    return () => controller.abort();
  }, [catalogVersion]);

  const termMarks = marks.filter(mark => Number(mark.semester) === semester);
  const bySubject = new Map(termMarks.map(mark => [mark.subjectId, mark]));
  const courses = subjects.filter(subject => Number(subject.semester) === semester);
  // A published result remains readable if the separate subject catalogue is unavailable.
  const catalogIds = new Set(courses.map(subject => subject.id));
  for (const mark of termMarks) {
    if (!catalogIds.has(mark.subjectId)) courses.push({
      id: mark.subjectId, name: mark.subjectName, code: mark.subjectCode,
      maxInternal: mark.maxInternal, maxSemester: mark.maxSemester,
    });
  }
  const total = termMarks.reduce((sum, row) => sum + Number(row.total), 0);
  const max = termMarks.reduce((sum, row) => sum + Number(row.maxInternal) + Number(row.maxSemester), 0);
  const percentage = max ? total / max * 100 : null;

  function changeEditor(value) {
    setEditor(value);
    setError('');
    setMessage('');
  }

  async function save(event) {
    event.preventDefault();
    if (writePending.current) return;
    const form = Object.fromEntries(new FormData(event.currentTarget));
    writePending.current = true;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editor === 'subject') {
        const { data: subject } = await api.post('/results/subjects', {
          name: form.name.trim(), code: form.code.trim().toUpperCase(), semester,
          maxInternal: Number(form.maxInternal), maxSemester: Number(form.maxSemester),
        });
        setSubjects(current => [...current.filter(item => item.id !== subject.id), subject]);
        setEditor(null);
        setMessage('Subject saved.');
        // The API upserts by code. Re-read graded marks in case the subject's maxima or semester changed.
        try {
          const { data } = await api.get('/results/marks', { params: { studentId: record.student.id } });
          setMarks(data);
        } catch {
          setError('The subject was saved. Reopen this marksheet to refresh grades.');
        }
      } else {
        const { data: mark } = await api.post('/results/marks', {
          studentId: record.student.id, subjectId: editor.id,
          internalMark: Number(form.internalMark), semesterMark: Number(form.semesterMark),
        });
        setMarks(current => [...current.filter(item => item.subjectId !== mark.subjectId), mark]);
        setEditor(null);
        setMessage('Marks saved.');
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not save your changes. Please try again.'));
    } finally {
      writePending.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="exam-portal">
      <header className="exam-record-head">
        <div>
          <h2 id="results-heading" ref={heading} tabIndex={-1}>Semester results</h2>
          <p>{record.student.name} <span aria-hidden="true">·</span> {record.student.registrationNumber}</p>
        </div>
        <button className="exam-secondary" type="button" disabled={saving} onClick={close}>Close marksheet</button>
      </header>

      <dl className="exam-totals">
        <div><dt>Published marks</dt><dd>{max ? <>{total}<small> / {max}</small></> : '—'}</dd></div>
        <div><dt>Percentage</dt><dd>{percentage === null ? '—' : percentage.toFixed(2) + '%'}</dd></div>
        <div><dt>Grade to date</dt><dd>{percentage === null ? '—' : gradeFor(percentage)}</dd></div>
      </dl>

      <section className="exam-register" aria-label="Semester marks">
        <div className="exam-toolbar">
          <label>Semester <select value={semester} disabled={saving} onChange={event => {
            setSemester(Number(event.target.value)); changeEditor(null);
          }}>
            {semesters.map(n => <option key={n} value={n}>Semester {n}</option>)}
          </select></label>
          {canEdit && !editor && <button className="exam-secondary" type="button" disabled={catalogState === 'loading'}
            onClick={() => changeEditor('subject')}>Add subject</button>}
        </div>
        {editor && canEdit && (
          <form className="exam-editor" key={editor.id ?? 'subject'} onSubmit={save}>
            <h3>{editor === 'subject' ? 'Add subject' : 'Edit marks · ' + editor.name}</h3>
            {editor === 'subject' ? (
              <>
                <label>Subject name<input name="name" minLength={2} maxLength={120} required /></label>
                <label>Subject code<input name="code" minLength={2} maxLength={30} pattern="[A-Za-z0-9._\-]+" required /></label>
                <label>Internal maximum<input name="maxInternal" type="number" min="1" max="32767" defaultValue="20" required /></label>
                <label>Exam maximum<input name="maxSemester" type="number" min="1" max="32767" defaultValue="80" required /></label>
              </>
            ) : (
              <>
                <label>Internal mark (out of {editor.maxInternal})<input name="internalMark" type="number" min="0"
                  max={editor.maxInternal} defaultValue={bySubject.get(editor.id)?.internalMark ?? ''} required /></label>
                <label>Exam mark (out of {editor.maxSemester})<input name="semesterMark" type="number" min="0"
                  max={editor.maxSemester} defaultValue={bySubject.get(editor.id)?.semesterMark ?? ''} required /></label>
              </>
            )}
            <div className="exam-editor-actions">
              <button className="exam-primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save'}</button>
              <button className="exam-secondary" disabled={saving} type="button" onClick={() => changeEditor(null)}>Cancel</button>
            </div>
          </form>
        )}
        {error && <p role="alert" className="exam-error">{error}</p>}
        {message && <p role="status" className="exam-notice">{message}</p>}
        {catalogState === 'error' && <p role="alert" className="exam-error">The subject list could not be loaded.{' '}
          <button type="button" onClick={() => setCatalogVersion(n => n + 1)}>Try again</button></p>}
        {courses.length > 0 ? (
          <div className="exam-table-scroll" tabIndex={0} role="region" aria-label="Subject marks table">
            <table>
              <caption className="sr-only">Semester {semester} marks for {record.student.name}</caption>
              <thead><tr><th scope="col">Subject</th><th scope="col">Internal</th><th scope="col">Exam</th><th scope="col">Total</th><th scope="col">Grade</th>{canEdit && <th scope="col">Action</th>}</tr></thead>
              <tbody>{courses.map(course => {
                const mark = bySubject.get(course.id);
                return <tr key={course.id}>
                  <th scope="row"><span>{course.code}</span>{course.name}</th>
                  <td>{mark ? mark.internalMark + ' / ' + course.maxInternal : '—'}</td>
                  <td>{mark ? mark.semesterMark + ' / ' + course.maxSemester : '—'}</td>
                  <td>{mark ? mark.total + ' / ' + (Number(course.maxInternal) + Number(course.maxSemester)) : '—'}</td>
                  <td><span className={'exam-grade ' + (!mark ? 'pending' : mark.grade === 'Fail' ? 'failed' : '')}>{mark?.grade ?? 'Pending'}</span></td>
                  {canEdit && <td><button className="exam-edit" type="button" disabled={saving} aria-label={'Edit marks for ' + course.name} onClick={() => changeEditor(course)}>Edit</button></td>}
                </tr>;
              })}</tbody>
            </table>
          </div>
        ) : catalogState !== 'error' && <p className="exam-empty" role="status">{catalogState === 'loading' ? 'Loading subjects…' : 'No subjects have been added for this semester.'}</p>}
      </section>
    </div>
  );
}
