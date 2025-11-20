import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';
import Avatar from './Avatar.jsx';

export default function Topbar({ minimal = false }) {
  const { user, signOut, role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false); // mobile hamburger menu
  const [userMenuOpen, setUserMenuOpen] = useState(false); // desktop user dropdown
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-700 bg-zinc-900/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/70">
      <div className="px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-zinc-800/70"
            aria-label="Open menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            ☰
          </button>
          <div className="h-6 w-6 rounded-md bg-indigo-500 flex items-center justify-center text-white font-bold">✦</div>
          <Link to="/" className="text-white font-semibold tracking-wide">MindMerge</Link>
        </div>
        {minimal ? (
          <div />
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/submit" className="btn btn-primary h-9 hidden sm:inline-flex">Share a Post</Link>
            <button className="btn btn-ghost h-9 hidden sm:inline-flex" title="Notifications">🔔</button>
            {user ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2 focus:outline-none"
                  onClick={() => setUserMenuOpen((v) => !v)}
                >
                  <Avatar
                    name={user.displayName || (user.email ? String(user.email).split('@')[0] : 'User')}
                    src={user.photoURL || ''}
                    size={32}
                  />
                  <div className="hidden sm:flex flex-col leading-tight text-left">
                    <span className="text-sm text-white/90">{user.displayName || (user.email ? String(user.email).split('@')[0] : 'User')}</span>
                    <span className="text-[11px] text-white/60 truncate max-w-[160px]">{user.email}</span>
                  </div>
                </button>
                {userMenuOpen ? (
                  <div className="absolute right-0 mt-2 w-48 rounded-md border border-zinc-800 bg-zinc-950 shadow-lg p-2 hidden sm:block">
                    <Link to="/profile" className="block px-2 py-1 rounded hover:bg-zinc-800/70" onClick={() => setMenuOpen(false)}>Profile</Link>
                    <button className="w-full text-left px-2 py-1 rounded hover:bg-zinc-800/70" onClick={signOut}>Log Out</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
      {/* Inline mobile menu under header */}
      {user && mobileOpen ? (
        <div className="md:hidden">
          {/* overlay to close */}
          <button className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="fixed z-50 top-14 left-2 right-2 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl p-3">
            <nav className="flex flex-col gap-1">
              <Link to="/feed" className="px-3 py-2 rounded-md hover:bg-zinc-800/80" onClick={() => setMobileOpen(false)}>Active Feed</Link>
              <Link to="/submit" className="px-3 py-2 rounded-md hover:bg-zinc-800/80" onClick={() => setMobileOpen(false)}>Share a Post</Link>
              <Link to="/myposts" className="px-3 py-2 rounded-md hover:bg-zinc-800/80" onClick={() => setMobileOpen(false)}>My Posts</Link>
              <Link to="/completed" className="px-3 py-2 rounded-md hover:bg-zinc-800/80" onClick={() => setMobileOpen(false)}>Completed</Link>
              <Link to="/profile" className="px-3 py-2 rounded-md hover:bg-zinc-800/80" onClick={() => setMobileOpen(false)}>Profile</Link>
              {role === 'admin' ? (
                <>
                  <div className="mt-1 mb-1 h-px bg-zinc-800" />
                  <Link to="/admin" className="px-3 py-2 rounded-md hover:bg-zinc-800/80" onClick={() => setMobileOpen(false)}>Admin</Link>
                  <Link to="/admin/users" className="px-3 py-2 rounded-md hover:bg-zinc-800/80" onClick={() => setMobileOpen(false)}>Admin Users</Link>
                  <Link to="/admin/posts" className="px-3 py-2 rounded-md hover:bg-zinc-800/80" onClick={() => setMobileOpen(false)}>Admin Posts</Link>
                </>
              ) : null}
              <button className="text-left px-3 py-2 rounded-md hover:bg-zinc-800/80" onClick={() => { setMobileOpen(false); signOut(); }}>Log Out</button>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
