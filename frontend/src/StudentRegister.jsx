import { useEffect, useRef, useState } from 'react';
import { api } from './services/api';
import './student-register.css';

const PAGE_SIZE = 12;
const blankStudent = { name: '', email: '', registrationNumber: '', department: '', age: '', cgpa: '' };
const formFields = [
  { name: 'name', label: 'Full name', type: 'text', minLength: 2, autoComplete: 'name' },
  { name: 'email', label: 'Email address', type: 'email', autoComplete: 'email' },
  { name: 'registrationNumber', label: 'Registration number (optional)', type: 'text', maxLength: 64, pattern: '[A-Za-z0-9][A-Za-z0-9\\/\\-]{0,63}', title: 'Start with a letter or digit. Use letters, digits, slashes and hyphens.' },
  { name: 'department', label: 'Department', type: 'text', minLength: 2, maxLength: 100 },
  { name: 'age', label: 'Age', type: 'number', min: 16, max: 100, step: 1 },
  { name: 'cgpa', label: 'CGPA', type: 'number', min: 0, max: 10, step: 'any' },
];

function errorText(error, fallback) {
  const message = error?.response?.data?.message;
  return (Array.isArray(message) ? message.join(', ') : message) || fallback;
}

function initials(name) {
  const parts = (name || '').trim().split(/\s+/);
  return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
}

export default function StudentRegister({ role, onRecordsChanged }) {
  const admin = role === 'ADMIN';
  const canEdit = admin || role === 'STAFF';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const editor = useRef(null);
  const query = search.trim();

  useEffect(() => {
    const controller = new AbortController();
    api.get('/students', { params: { page, limit: PAGE_SIZE, search: query || undefined }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const records = Array.isArray(data) ? data : data.data ?? data.items ?? [];
        const total = data.total ?? records.length;
        const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult({ page, query, revision, records, total, lastPage });
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setResult({ page, query, revision, error: errorText(failure, 'Could not load the student register.') });
        }
      });
    return () => controller.abort();
  }, [page, query, revision]);

  const current = result?.page === page && result.query === query && result.revision === revision ? result : null;
  const records = current?.records ?? [];

  function beginEdit(student) {
    setStatus('');
    setError('');
    setDraft(student ? { ...student, registrationNumber: student.registrationNumber ?? '' } : { ...blankStudent });
    requestAnimationFrame(() => editor.current?.querySelector('input')?.focus());
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setStatus('');
    const editing = draft.id != null;
    const registrationNumber = draft.registrationNumber.trim().toUpperCase();
    const payload = {
      name: draft.name.trim(), department: draft.department.trim(), age: Number(draft.age), cgpa: Number(draft.cgpa),
      ...(admin && { email: draft.email.trim() }),
      ...(admin && (registrationNumber || editing) && { registrationNumber: registrationNumber || null }),
    };
    try {
      if (editing) await api.patch('/students/' + draft.id, payload);
      else await api.post('/students', payload);
      setDraft(null);
      setStatus(editing ? 'Student record updated.' : 'Student record created.');
      setRevision((v) => v + 1);
      onRecordsChanged();
    } catch (failure) {
      setError(errorText(failure, 'Could not save this record.'));
    } finally { setBusy(false); }
  }

  async function remove(student) {
    if (busy || !window.confirm('Delete the student record for ' + student.name + '?')) return;
    setBusy(true);
    setStatus('');
    setError('');
    try {
      await api.delete('/students/' + student.id);
      if (draft?.id === student.id) setDraft(null);
      setStatus('Student record deleted.');
      setRevision((v) => v + 1);
      onRecordsChanged();
    } catch (failure) {
      setError(errorText(failure, 'Could not delete this record.'));
    } finally { setBusy(false); }
  }

  return (
    <section className="student-register" aria-labelledby="students-heading">
      <div className="student-register__header">
        <h2 id="students-heading" tabIndex={-1}>{canEdit ? 'Student register' : 'My student record'}</h2>
        {admin && <button type="button" className="student-register__primary" disabled={busy} onClick={() => beginEdit(null)}>+ Add student</button>}
      </div>

      {draft && canEdit && (
        <form ref={editor} onSubmit={save} className="student-register__editor">
          <h3>{draft.id == null ? 'Add a student' : 'Edit student record'}</h3>
          <div className="student-register__fields">
            {formFields.map(({ name, label, ...attributes }) => (
              <label key={name}>
                {label}
                <input {...attributes} name={name} value={draft[name] ?? ''} required={name !== 'registrationNumber'}
                  disabled={busy} readOnly={!admin && (name === 'email' || name === 'registrationNumber')}
                  onChange={(event) => setDraft({ ...draft, [name]: event.target.value })} />
              </label>
            ))}
          </div>
          <div className="student-register__buttons">
            <button className="student-register__primary" disabled={busy}>{busy ? 'Saving…' : 'Save record'}</button>
            <button type="button" className="student-register__secondary" disabled={busy} onClick={() => { setDraft(null); setError(''); }}>Cancel</button>
          </div>
        </form>
      )}
      {error && <p className="student-register__error" role="alert">{error}</p>}
      {status && <p className="student-register__notice" role="status">{status}</p>}

      <div className="student-register__sheet">
        {canEdit && <div className="student-register__toolbar">
          <label className="student-register__search">
            <span className="sr-only">Search student records</span>
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg>
            <input type="search" value={search} placeholder="Search student records" onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </label>
        </div>}
        {!current && <p className="student-register__empty" role="status">Loading records…</p>}
        {current?.error && <div className="student-register__empty" role="alert">{current.error} <button className="student-register__action" type="button" onClick={() => setRevision(v => v + 1)}>Retry</button></div>}
        {current && !current.error && !records.length && <p className="student-register__empty" role="status">
          {query ? 'No records match your search.' : canEdit ? 'No student records yet.' : 'Your student record has not been linked yet.'}
        </p>}
        {records.length > 0 && <>
          <div className="student-register__scroll" role="region" tabIndex={0} aria-label="Student records table">
            <table>
              <caption className="sr-only">{canEdit ? 'Student register' : 'My student record'}</caption>
              <thead><tr>
                {['Student', 'Student ID', 'Registration no.', 'Department', 'Age', 'CGPA', ...(canEdit ? ['Actions'] : [])].map(title => <th scope="col" key={title}>{title}</th>)}
              </tr></thead>
              <tbody>
                {records.map(student => (
                  <tr key={student.id}>
                    <th scope="row" className="student-register__person">
                      <span className="student-register__avatar" aria-hidden="true">{initials(student.name)}</span>
                      <span><strong>{student.name}</strong><small>{student.email}</small></span>
                    </th>
                    <td data-label="Student ID" className="student-register__number">#{student.id}</td>
                    <td data-label="Registration no." className="student-register__number">{student.registrationNumber || 'Unassigned'}</td>
                    <td data-label="Department">{student.department || '—'}</td>
                    <td data-label="Age">{student.age ?? '—'}</td>
                    <td data-label="CGPA" className="student-register__number">{student.cgpa == null ? '—' : Number(student.cgpa).toFixed(2)}</td>
                    {canEdit && <td data-label="Actions"><div className="student-register__actions">
                      <button type="button" disabled={busy} className="student-register__action" aria-label={'Edit ' + student.name} onClick={() => beginEdit(student)}>Edit</button>
                      {admin && <button type="button" disabled={busy} className="student-register__action student-register__delete" aria-label={'Delete ' + student.name} onClick={() => remove(student)}>Delete</button>}
                    </div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canEdit && <div className="student-register__footer">
            <span>{(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + records.length} of {current.total} {current.total === 1 ? 'record' : 'records'}</span>
            {current.lastPage > 1 && <div className="student-register__buttons" aria-label="Pagination">
              <button type="button" className="student-register__secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="student-register__secondary" disabled={page === current.lastPage} onClick={() => setPage(page + 1)}>Next</button>
            </div>}
          </div>}
        </>}
      </div>
    </section>
  );
}
