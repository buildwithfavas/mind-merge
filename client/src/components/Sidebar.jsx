import { NavLink } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';

function IconHome(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
      <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10.5V20h14v-9.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUser(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" />
      <path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}
function IconFile(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 13h8M8 17h8M8 9h4" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}
function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUsers(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeLinecap="round" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}
function IconChat(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v9z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTwitter(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 5.92c-.64.28-1.33.47-2.05.56a3.52 3.52 0 0 0 1.54-1.94 7.08 7.08 0 0 1-2.24.86A3.52 3.52 0 0 0 12 7.5c0 .28.03.56.09.82A9.98 9.98 0 0 1 3 5.16a3.5 3.5 0 0 0 1.09 4.69 3.5 3.5 0 0 1-1.59-.44v.04c0 1.71 1.22 3.14 2.85 3.46-.3.08-.62.12-.95.12-.23 0-.45-.02-.66-.06a3.52 3.52 0 0 0 3.29 2.45A7.06 7.06 0 0 1 2 18.41 9.98 9.98 0 0 0 7.29 20c6.55 0 10.14-5.43 10.14-10.14 0-.15 0-.3-.01-.45A7.2 7.2 0 0 0 22 5.92z" />
    </svg>
  );
}
function IconCog(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" stroke="currentColor" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.08a1.65 1.65 0 0 0-1-1.5 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.08a1.65 1.65 0 0 0 1.5-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.08a1.65 1.65 0 0 0 1 1.5 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .66.26 1.3.73 1.77.47.47 1.11.73 1.77.73H21a2 2 0 1 1 0 4h-.08a1.65 1.65 0 0 0-1.5 1z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLogout(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" {...props}>
      <path d="M9 21H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h3" stroke="currentColor" />
      <path d="M16 17l5-5-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12H9" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function Item({ to, label, Icon, disabled }) {
  const base = 'w-full text-left px-3 py-2 rounded-md flex items-center gap-2';
  const render = ({ isActive }) => {
    const activeCls = isActive && !disabled ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-800/80';
    return (
      <div className={[base, disabled ? 'opacity-50 cursor-not-allowed' : activeCls].join(' ')}>
        {Icon ? (
          <Icon className={isActive && !disabled ? 'h-5 w-5 text-white' : 'h-5 w-5 text-zinc-300'} />
        ) : null}
        <span className="text-sm font-medium">{label}</span>
      </div>
    );
  };
  if (disabled) {
    return (
      <div className="px-2">
        <button className={base + ' opacity-50 cursor-not-allowed text-zinc-300'} aria-disabled title="Coming soon">
          {Icon ? <Icon className="h-5 w-5 text-zinc-300" /> : null}
          <span className="text-sm font-medium">{label}</span>
        </button>
      </div>
    );
  }
  return (
    <div className="px-2">
      <NavLink to={to} end className={({ isActive }) => ''}>
        {render}
      </NavLink>
    </div>
  );
}

export default function Sidebar() {
  const { signOut, role } = useAuth();
  return (
    <aside className="hidden md:block relative w-full h-full border-r border-zinc-700 bg-zinc-950/80 text-zinc-200 flex flex-col">
      <div className="py-3" />
      <nav className="space-y-1 flex-1 pb-20">
        <Item to="/feed" label="Active Feed" Icon={IconHome} />
        <Item to="/completed" label="Completed Posts" Icon={IconCheck} />
        <Item to="/myposts" label="My Posts" Icon={IconFile} />
        <Item to="/profile" label="Profile" Icon={IconUser} />
        <Item to="/profiles" label="Linkedin Connect" Icon={IconUsers} />
        <Item to="/friends" label="Connected" Icon={IconUsers} />
        {role === 'admin' ? (
          <>
            <Item to="/admin" label="Admin" Icon={IconCog} />
            <Item to="/admin/users" label="Admin Users" Icon={IconUsers} />
            <Item to="/admin/posts" label="Admin Posts" Icon={IconFile} />
          </>
        ) : null}
        <Item to="#" label="Chat (Coming soon)" Icon={IconChat} disabled />
        <Item to="#" label="Twitter Connect (Coming soon)" Icon={IconTwitter} disabled />
      </nav>
      <div className="absolute bottom-3 left-0 right-0 p-3 text-sm opacity-80 space-y-2">
        <button className="w-56 text-left px-3 py-2 rounded-md hover:bg-zinc-800/80 inline-flex items-center gap-2" onClick={signOut}>
          <IconLogout className="h-5 w-5 text-zinc-300" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
