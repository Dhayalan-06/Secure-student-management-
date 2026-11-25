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
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const heading = useRef(null);
  const writePending = useRef(false);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  const termMarks = marks.filter((mark) => Number(mark.semester) === semester);
  const total = termMarks.reduce((sum, mark) => sum + Number(mark.total), 0);
  const max = termMarks.length * 100;
  const percentage = max ? total / max * 100 : null;

  function changeEditor(value) {
    setEditor(value);
    setError('');
    setMessage('');
  }

  async function save(event) {
    event.preventDefault();
    if (writePending.current || !editor) return;
    const form = Object.fromEntries(new FormData(event.currentTarget));
    writePending.current = true;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data: updatedMark } = await api.post('/results/marks', {
        studentId: record.student.id,
        markId: editor.subjectId,
        marks: Number(form.marks),
      });
      setMarks((current) => current.map((mark) =>
        mark.subjectId === updatedMark.subjectId ? updatedMark : mark,
      ));
      setEditor(null);
      setMessage('Mark saved.');
    } catch (err) {
      setError(errorMessage(err, 'Could not save this mark. Please try again.'));
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
          <label>Semester <select value={semester} disabled={saving} onChange={(event) => {
            setSemester(Number(event.target.value));
            changeEditor(null);
          }}>
            {semesters.map((n) => <option key={n} value={n}>Semester {n}</option>)}
          </select></label>
        </div>
        {editor && canEdit && (
          <form className="exam-editor" key={editor.subjectId} onSubmit={save}>
            <h3>Edit mark · {editor.subjectName}</h3>
            <label>Mark (out of 100)<input name="marks" type="number" min="0" max="100"
              defaultValue={editor.semesterMark} required /></label>
            <div className="exam-editor-actions">
              <button className="exam-primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save'}</button>
              <button className="exam-secondary" disabled={saving} type="button" onClick={() => changeEditor(null)}>Cancel</button>
            </div>
          </form>
        )}
        {error && <p role="alert" className="exam-error">{error}</p>}
        {message && <p role="status" className="exam-notice">{message}</p>}
        {termMarks.length > 0 ? (
          <div className="exam-table-scroll" tabIndex={0} role="region" aria-label="Subject marks table">
            <table>
              <caption className="sr-only">Semester {semester} marks for {record.student.name}</caption>
              <thead><tr><th scope="col">Subject</th><th scope="col">Marks</th><th scope="col">Total</th><th scope="col">Grade</th>{canEdit && <th scope="col">Action</th>}</tr></thead>
              <tbody>{termMarks.map((mark) => (
                <tr key={mark.subjectId}>
                  <th scope="row"><span>{mark.subjectCode}</span>{mark.subjectName}</th>
                  <td>{mark.semesterMark} / 100</td>
                  <td>{mark.total} / 100</td>
                  <td><span className={'exam-grade ' + (mark.grade === 'Fail' ? 'failed' : '')}>{mark.grade}</span></td>
                  {canEdit && <td><button className="exam-edit" type="button" disabled={saving}
                    aria-label={'Edit marks for ' + mark.subjectName} onClick={() => changeEditor(mark)}>Edit</button></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="exam-empty" role="status">No marks are recorded for this semester.</p>}
      </section>
    </div>
  );
}