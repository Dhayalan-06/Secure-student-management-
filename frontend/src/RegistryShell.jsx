import { Link } from 'react-router-dom';

export default function RegistryShell({ pages, activePage, user, name, isDark, onTheme, onLogout, children }) {
  const role = user.role.charAt(0) + user.role.slice(1).toLowerCase();
  const pageLabel = (page) => page.id === 'students' && user.role === 'STUDENT' ? 'My profile' : page.label;
  return (
    <div className="registry-shell">
      <aside className="registry-rail">
        <Link to="/home" aria-label="Campus registry home" className="registry-brand">
          <span className="registry-monogram" aria-hidden="true">S</span>
          <span>Campus Registry<small>Secure Student Management</small></span>
        </Link>
        <nav aria-label="Academic workspace">
          {pages.map((page) => <Link key={page.id} to={page.path} aria-current={activePage.id === page.id ? 'page' : undefined}>
            {page.icon}<span>{pageLabel(page)}</span>
          </Link>)}
        </nav>
        <div className="registry-account">
          <div className="registry-person"><span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>{role} account</small></div></div>
          <div className="registry-actions">
            <button type="button" onClick={onTheme}>{isDark ? 'Light mode' : 'Dark mode'}</button>
            <button type="button" onClick={onLogout}>Log out</button>
          </div>
        </div>
      </aside>
      <div className="registry-body">
        <header className="registry-bar">
          <span>Workspace <b aria-hidden="true">/</b> <strong>{pageLabel(activePage)}</strong></span>
          <time>{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</time>
        </header>
        <main className="registry-content">{children}</main>
      </div>
    </div>
  );
}
