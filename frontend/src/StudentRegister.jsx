import { useEffect, useRef, useState } from 'react';
import { api } from './services/api';
import './student-register.css';

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100;
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

// Build a compact set of page links: [1, …, 4, 5, 6, …, 20]
function renderPageNumbers(currentPage, lastPage) {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(lastPage, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  if (start > 1) {
    pages.push({ type: 'button', page: 1 });
    if (start > 2) pages.push({ type: 'ellipsis' });
  }
  for (let i = start; i <= end; i++) {
    pages.push({ type: 'button', page: i });
  }
  if (end < lastPage) {
    if (end < lastPage - 1) pages.push({ type: 'ellipsis' });
    pages.push({ type: 'button', page: lastPage });
  }
  return pages;
}

export default function StudentRegister({ role, onRecordsChanged }) {
  const admin = role === 'ADMIN';
  const canEdit = admin || role === 'STAFF';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageSizeInput, setPageSizeInput] = useState(String(DEFAULT_PAGE_SIZE));
  const [pageSizeError, setPageSizeError] = useState('');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const editor = useRef(null);
  const query = search.trim();

  const lastPage = result?.lastPage ?? 1;

  useEffect(() => {
    const controller = new AbortController();
    api.get('/students', { params: { page, limit: pageSize, search: query || undefined }, signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const records = Array.isArray(data) ? data : data.data ?? data.items ?? [];
        const total = data.total ?? records.length;
        const computedLastPage = Math.max(1, Math.ceil(total / pageSize));
        if (page > computedLastPage) {
          setPage(computedLastPage);
          return;
        }
        setResult({ page, query, revision, pageSize, records, total, lastPage: computedLastPage });
      })
      .catch((failure) => {
        if (!controller.signal.aborted) {
          setResult({ page, query, revision, error: errorText(failure, 'Could not load the student register.') });
        }
      });
    return () => controller.abort();
  }, [page, pageSize, query, revision]);

  const current = result?.page === page && result.query === query && result.pageSize === pageSize && result.revision === revision ? result : null;
  const records = current?.records ?? [];

  function commitPageSize(next) {
    const raw = String(next).trim();
    // A temporarily empty field must never become a limit-0 request.
    if (raw === '') {
      setPageSizeError('Rows per page must be a whole number from 1 to 100.');
      setPageSizeInput(String(pageSize));
      return;
    }
    const asNumber = Number(raw);
    if (!Number.isInteger(asNumber) || asNumber < 1 || asNumber > MAX_PAGE_SIZE) {
      // Reject decimals, negatives, out-of-range, and malformed input.
      setPageSizeError('Enter a whole number from 1 to 100.');
      setPageSizeInput(String(pageSize));
      return;
    }

    setPageSizeError('');
    setPageSize(asNumber);
    setPageSizeInput(String(asNumber));
    setPage(1);
    setRevision((v) => v + 1);
  }

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
          <label className="student-register__page-size">
            <span className="sr-only">Rows per page</span>
            Rows per page
            <input
              id="student-register-page-size"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              min="1"
              max={MAX_PAGE_SIZE}
              value={pageSizeInput}
              aria-label="Rows per page"
              aria-invalid={pageSizeError ? 'true' : 'false'}
              aria-errormessage={pageSizeError ? 'student-register-page-size-error' : undefined}
              onChange={(event) => { setPageSizeInput(event.target.value); setPageSizeError(''); }}
              onBlur={() => commitPageSize(pageSizeInput)}
              onKeyDown={(event) => event.key === 'Enter' && commitPageSize(pageSizeInput)}
            />
            {pageSizeError && <span id="student-register-page-size-error" className="student-register__page-size-error" role="alert">{pageSizeError}</span>}
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
          {canEdit && lastPage > 1 && <div className="student-register__footer" role="navigation" aria-label="Student register pagination">
            <button type="button" className="student-register__secondary student-register__page-btn" disabled={page === 1} aria-label="Previous page" onClick={() => setPage(page - 1)}>Previous</button>
            <div className="student-register__page-numbers" aria-label="Page numbers">
              {renderPageNumbers(page, lastPage).map((item, idx) => {
                if (item.type === 'ellipsis') {
                  return <span key={idx} className="student-register__ellipsis" aria-hidden="true">…</span>;
                }
                const isCurrent = item.page === page;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`student-register__page-btn${isCurrent ? ' student-register__page-btn--current' : ''}`}
                    aria-label={`Page ${item.page}`}
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={() => setPage(item.page)}
                  >
                    {item.page}
                  </button>
                );
              })}
            </div>
            <button type="button" className="student-register__secondary student-register__page-btn" disabled={page === lastPage} aria-label="Next page" onClick={() => setPage(page + 1)}>Next</button>
          </div>}
        </>}
      </div>
    </section>
  );
}
