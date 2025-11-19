import { useEffect, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';
import api from '../utils/api.js';

export default function SignIn() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [needsSignup, setNeedsSignup] = useState(false);
  const [checking, setChecking] = useState(false);

  // Do not auto-redirect; allow visiting /signin even if authenticated without profile
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!user) { setNeedsSignup(false); return; }
      setChecking(true);
      try {
        await api.get('/me/profile');
        if (active) navigate('/', { replace: true });
      } catch {
        if (active) setNeedsSignup(true);
      } finally {
        if (active) setChecking(false);
      }
    };
    if (!loading) run();
    return () => { active = false; };
  }, [user, loading, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="p-6 border rounded max-w-sm w-full space-y-4">
        <h1 className="text-xl font-semibold text-center">Sign in</h1>
        {null}
        {error ? (
          <div className="text-sm text-rose-600 dark:text-rose-400">{error}</div>
        ) : null}
        <button
          className="btn btn-primary w-full flex items-center justify-center gap-2"
          disabled={saving}
          onClick={async () => {
            setError('');
            try {
              setSaving(true);
              await signIn();
              try {
                await api.get('/me/profile');
                navigate('/', { replace: true });
              } catch {
                navigate('/signup', { replace: true });
              }
            } catch (e) {
              const msg = e?.response?.data?.error || 'Sign-in failed';
              setError(msg);
            } finally {
              setSaving(false);
            }
          }}
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.42-.22-2.04H12v3.71h6.53c-.13.92-.83 2.29-2.38 3.22l-.02.12 3.46 2.68.24.02c2.22-2.05 3.66-5.07 3.66-8.71z"/>
            <path fill="#34A853" d="M12 24c3.32 0 6.1-1.09 8.13-2.98l-3.87-3c-1.04.7-2.44 1.19-4.26 1.19-3.26 0-6.02-2.16-7.01-5.12l-.14.01-3.78 2.92-.05.13C3.99 21.78 7.7 24 12 24z"/>
            <path fill="#FBBC05" d="M4.99 14.09c-.24-.72-.38-1.49-.38-2.29s.14-1.57.36-2.29l-.01-.15-3.83-2.97-.13.06C.37 8.08 0 9.99 0 12s.37 3.92 1 5.65l4-3.56z"/>
            <path fill="#EA4335" d="M12 4.74c2.3 0 3.85.99 4.74 1.82l3.46-3.38C18.08 1.26 15.32 0 12 0 7.7 0 3.99 2.22 2 5.35l4 3.15C6.99 5.64 9.74 4.74 12 4.74z"/>
          </svg>
          <span>{saving ? 'Signing in…' : 'Continue with Google'}</span>
        </button>

        <p className="text-sm text-center opacity-80">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-indigo-400 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
