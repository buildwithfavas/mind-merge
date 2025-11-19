import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Completed from './pages/Completed.jsx';
import Connect from './pages/Connect.jsx';
import Feed from './pages/Feed.jsx';
import Friends from './pages/Friends.jsx';
import MyPosts from './pages/MyPosts.jsx';
import Profile from './pages/Profile.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import Submit from './pages/Submit.jsx';
import { useAuth } from './state/AuthContext.jsx';
import api from './utils/api.js';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!user) { setChecking(false); setOk(false); return; }
      try {
        await api.get('/me/profile');
        if (active) { setOk(true); }
      } catch {
        if (active) { setOk(false); }
      } finally {
        if (active) setChecking(false);
      }
    };
    if (!loading) run();
    return () => { active = false; };
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-zinc-950">
        <div className="h-10 w-10 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/signin" replace />;
  if (!ok) return <Navigate to="/signup" replace />;
  return children;
}


export default function App() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const pathname = location.pathname || '/';
  const isAuthRoute = pathname.startsWith('/signin') || pathname.startsWith('/signup');

  // Early redirect to avoid briefly mounting protected pages and flashing content
  if (!loading && !user && !isAuthRoute) {
    return <Navigate to="/signin" replace />;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-zinc-950">
        <div className="h-10 w-10 rounded-full border-2 border-zinc-700 border-top-white border-t-white animate-spin" />
      </div>
    );
  }
  function HomeGate() {
    const { user, loading } = useAuth();
    if (loading) {
      return (
        <div className="fixed inset-0 grid place-items-center bg-zinc-950">
          <div className="h-10 w-10 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
        </div>
      );
    }
    return <Navigate to={user ? '/feed' : '/signin'} replace />;
  }

  return (
    <div className="h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Fixed Topbar */}
      <div className="fixed top-0 left-0 right-0 h-14 z-40 bg-zinc-950/90">
        <Topbar minimal={isAuthRoute} />
      </div>

      {/* Fixed Sidebar (only when authed and ready) */}
      {!isAuthRoute && !loading && user ? (
        <div className="fixed top-14 bottom-14 left-0 w-64 z-30">
          <Sidebar />
        </div>
      ) : null}

      {/* Scrollable main content area */}
      <div className={isAuthRoute ? 'absolute top-14 bottom-14 left-0 right-0 overflow-auto' : 'absolute top-14 bottom-14 left-64 right-0 overflow-auto'}>
        <main className="px-4 py-6">
          <Routes>
            <Route path="/" element={<HomeGate />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/feed" element={<Protected><Feed /></Protected>} />
            <Route path="/submit" element={<Protected><Submit /></Protected>} />
            <Route path="/completed" element={<Protected><Completed /></Protected>} />
            <Route path="/connect" element={<Protected><Connect /></Protected>} />
            <Route path="/friends" element={<Protected><Friends /></Protected>} />
            <Route path="/myposts" element={<Protected><MyPosts /></Protected>} />
            <Route path="/profile" element={<Protected><Profile /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 h-14 z-40 bg-zinc-950/90 border-t border-zinc-700">
        <footer className="h-full flex items-center justify-center">
          <div className="px-4 text-center text-sm">
            <span className="text-white">Developed by </span>
            <a
              href="https://www.linkedin.com/in/favasmaruthil/"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline"
            >
              Mohammed Favas
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
