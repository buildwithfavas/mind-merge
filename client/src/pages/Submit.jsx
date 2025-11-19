import { useState } from 'react';
import api from '../utils/api.js';
import { useToast } from '../state/ToastContext.jsx';

export default function Submit() {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const { push } = useToast() || { push: () => {} };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const t = title.trim().slice(0, 120);
      const u = url.trim();
      if (!t) {
        const message = 'Title is required (max 120 characters).';
        setMsg(message);
        push({ type: 'error', title: 'Missing title', desc: message });
        return;
      }
      if (!u) {
        const message = 'LinkedIn post URL is required.';
        setMsg(message);
        push({ type: 'error', title: 'Missing URL', desc: message });
        return;
      }
      // Lightweight client validation to give immediate feedback
      try {
        const parsed = new URL(u);
        const host = parsed.hostname?.toLowerCase() || '';
        if (parsed.protocol !== 'https:' || !host.endsWith('linkedin.com')) {
          const message = 'Please enter a valid https://linkedin.com URL.';
          setMsg(message);
          push({ type: 'error', title: 'Invalid URL', desc: message });
          return;
        }
      } catch {
        const message = 'Please enter a valid LinkedIn URL.';
        setMsg(message);
        push({ type: 'error', title: 'Invalid URL', desc: message });
        return;
      }

      await api.post('/posts', { url: u, title: t });
      setMsg('Submitted!');
      push({ type: 'success', title: 'Submitted', desc: 'Your post was added to the shared feed.' });
      setTitle('');
      setUrl('');
    } catch (e) {
      const status = e?.response?.status;
      const serverErr = e?.response?.data?.error;
      const message = status === 409
        ? 'This LinkedIn post has already been shared.'
        : (serverErr || 'Failed. Make sure it is a valid LinkedIn URL.');
      setMsg(message);
      push({ type: 'error', title: status === 409 ? 'Already shared' : 'Submit failed', desc: message });
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="card p-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">Submit a LinkedIn post</h1>
          <p className="text-sm opacity-80">Paste a public LinkedIn post URL. Teammates will open, like, and comment, then mark done.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium">Title <span className="opacity-60 text-xs">(max 120 chars)</span></label>
          <input
            className="input"
            placeholder="Brief title for your post"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          />
          <label className="block text-sm font-medium">LinkedIn Post URL</label>
          <input
            className="input"
            placeholder="https://www.linkedin.com/posts/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">Submit</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setTitle(''); setUrl(''); }}>Clear</button>
          </div>
          {msg && <div className="text-sm opacity-80">{msg}</div>}
        </form>
      </div>
    </div>
  );
}
