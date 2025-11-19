import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';
import Avatar from './Avatar.jsx';

export default function Topbar({ minimal = false }) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-700 bg-zinc-900/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/70">
      <div className="px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-indigo-500 flex items-center justify-center text-white font-bold">✦</div>
          <Link to="/" className="text-white font-semibold tracking-wide">MindMerge</Link>
        </div>
        {minimal ? (
          <div />
        ) : (
          <div className="flex items-center gap-3 relative">
            <Link to="/submit" className="btn btn-primary h-9">Share a Post</Link>
            <button className="btn btn-ghost h-9" title="Notifications">🔔</button>
            {user ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2 focus:outline-none"
                  onClick={() => setMenuOpen((v) => !v)}
                  onBlur={(e) => {
                    // Close when focus leaves the button and menu
                    if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false);
                  }}
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
                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-44 rounded-md border border-zinc-800 bg-zinc-900 shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      className="w-full text-left block px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setMenuOpen(false); signOut(); }}
                    >
                      Log Out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
}
