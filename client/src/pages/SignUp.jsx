import { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';
import api from '../utils/api.js';

export default function SignUp() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If already logged in, check if profile exists; if yes, send home
    const check = async () => {
      if (!user) return;
      try {
        await api.get('/me/profile');
        navigate('/', { replace: true });
      } catch (e) {
        // 404 means not registered yet, stay on signup
      }
    };
    check();
  }, [user, navigate]);

  if (!loading && user === null) {
    // show the page with Google button to authenticate then create profile
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="p-6 border rounded max-w-sm w-full space-y-4">
        <h1 className="text-xl font-semibold text-center">Create your account</h1>
        <p className="text-sm text-center opacity-80">Provide your details to complete registration.</p>

        <div className="space-y-2">
          <label className="block text-sm">Full name</label>
          <input
            className="input w-full"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm">LinkedIn profile URL</label>
          <input
            className="input w-full"
            placeholder="https://www.linkedin.com/in/username"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
          />
          <p className="text-xs opacity-70">This URL will be visible to other users to help connect.</p>
        </div>
        {error ? (
          <div className="text-sm text-rose-600 dark:text-rose-400">{error}</div>
        ) : null}
        <button
          className="btn btn-primary w-full flex items-center justify-center gap-2"
          disabled={saving}
          onClick={async () => {
            setError('');
            const nm = name.trim();
            const url = linkedinUrl.trim();
            if (!nm) { setError('Full name is required'); return; }
            if (!url) { setError('LinkedIn URL is required'); return; }
            try {
              const u = new URL(url);
              if (u.protocol !== 'https:' || !u.hostname.toLowerCase().endsWith('linkedin.com')) {
                setError('Enter a valid https://linkedin.com URL');
                return;
              }
            } catch {
              setError('Enter a valid LinkedIn URL');
              return;
            }
            try {
              setSaving(true);
              // Ensure the user is authenticated with Google
              if (!user) {
                await signIn();
              }
              await api.post('/me/profile', { name: nm, linkedinUrl: url });
              let ok = false;
              for (let i = 0; i < 3; i++) {
                try {
                  await api.get('/me/profile');
                  ok = true;
                  break;
                } catch {
                  await new Promise(r => setTimeout(r, 300));
                }
              }
              if (!ok) {
                await api.get('/me/profile');
              }
              navigate('/', { replace: true });
            } catch (e) {
              const msg = e?.response?.status === 409
                ? 'Account already exists. Please sign in.'
                : (e?.response?.data?.error || 'Sign-up failed');
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
          <span>{saving ? 'Creating account…' : 'Continue with Google'}</span>
        </button>

        <p className="text-sm text-center opacity-80">
          Already have an account?{' '}
          <Link to="/signin" className="text-indigo-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
