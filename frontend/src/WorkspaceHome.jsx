import { Link } from 'react-router-dom';

const amounts = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function Metric({ label, value, detail }) {
  return <div className="registry-metric"><dt>{label}</dt><dd>{value}</dd><small>{detail}</small></div>;
}

export default function WorkspaceHome({ user, students, total, fees, studentStatus, feeStatus }) {
  const personal = user.role === 'STUDENT';
  const staff = user.role === 'STAFF';
  const profile = personal ? students[0] : null;
  const name = profile?.name || user.name || user.email.split('@')[0];
  const pending = fees.filter((fee) => fee.status === 'PENDING');
  const outstanding = pending.reduce((sum, fee) => sum + Number(fee.amount), 0);
  const studentReady = studentStatus === 'ready';
  const feeReady = feeStatus === 'ready';
  const status = personal ? feeStatus : studentStatus;
  const records = personal ? fees : students;
  const tableFields = personal ? ['Fee', 'Due date', 'Amount', 'Status'] : ['Student', 'Registration no.', 'Department'];

  return (
    <section className="registry-home" aria-labelledby="home-heading">
      <header className="registry-cover">
        <div className="registry-cover-copy">
          <h1 id="home-heading" tabIndex={-1}>{personal ? 'Welcome back,' : 'Registry overview'}{personal && <><br />{name.split(/\s+/)[0]}.</>}</h1>
          <p>{personal ? (profile?.department || 'Student workspace') : 'Student records and academic services'}</p>
          <Link to={personal ? '/results' : '/students'}>{personal ? 'Open semester results' : 'Open student register'} <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <dl className="registry-metrics">
        {personal ? <>
          <Metric label="Registration no." value={profile?.registrationNumber || '—'} detail={studentReady ? (profile?.registrationNumber ? 'Hall ticket for results' : 'Awaiting assignment') : 'Student profile'} />
        </> : <>
          <Metric label="Registered students" value={studentReady ? total.toLocaleString('en-IN') : '—'} detail="Student register" />
          <Metric label="Academic results" value={<Link to="/results">Mark sheets ↗</Link>} detail="Look up a student by hall ticket" />
        </>}
        {staff ? <Metric label="Record access" value="Staff" detail="Student records and results" /> :
          <Metric label={personal ? 'Outstanding fees' : 'Pending collections'} value={feeReady ? amounts.format(outstanding) : '—'} detail={feeReady ? `${pending.length} pending fee ${pending.length === 1 ? 'entry' : 'entries'}` : 'Fee ledger'} />}
      </dl>

      <div className="registry-home-grid">
        <section className="registry-panel">
          <header><h2>{personal ? 'My fee ledger' : 'Student register'}</h2><Link to={personal ? '/fees' : '/students'}>View all <span aria-hidden="true">→</span></Link></header>
          <div tabIndex={0} aria-label={personal ? 'Fee ledger preview' : 'Student register preview'} role="region" className="registry-table-scroll">
            <table><caption className="sr-only">{personal ? 'First five fee entries in due-date order' : 'First five students in register order'}</caption>
              <thead><tr>{tableFields.map((field) => <th key={field} scope="col">{field}</th>)}</tr></thead>
              <tbody>{status === 'ready' && records.slice(0, 5).map((record) => personal ?
                <tr key={record.id}><th scope="row">{record.description}</th><td>{dateFormat.format(new Date(record.dueDate.slice(0, 10) + 'T12:00:00'))}</td><td>{amounts.format(record.amount)}</td><td><span className={record.status === 'PAID' ? 'registry-paid' : 'registry-pending'}>{record.status === 'PAID' ? 'Paid' : 'Pending'}</span></td></tr> :
                <tr key={record.id}><th scope="row">{record.name}<small>{record.email}</small></th><td>{record.registrationNumber || 'Unassigned'}</td><td>{record.department || '—'}</td></tr>)}
                {(status !== 'ready' || !records.length) && <tr><td colSpan={personal ? 4 : 3} className="registry-empty">{status === 'error' ? 'Records could not be loaded.' : status !== 'ready' ? 'Loading records…' : personal ? 'No fees have been recorded for your account.' : 'No students have been registered yet.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="registry-services"><h2>Academic services</h2>
          <Link to="/results"><strong>Semester results</strong><small>Hall-ticket lookup</small><span aria-hidden="true">↗</span></Link>
          <Link to="/students"><strong>{personal ? 'My profile' : 'Student records'}</strong><small>{personal ? 'Registration and department' : 'Search the register'}</small><span aria-hidden="true">↗</span></Link>
          {!staff && <Link to="/fees"><strong>Fee ledger</strong><small>{personal ? 'Payments and dues' : 'Transactions and collections'}</small><span aria-hidden="true">↗</span></Link>}
        </section>
      </div>
    </section>
  );
}
