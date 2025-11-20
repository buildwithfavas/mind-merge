import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../state/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';

export default function MyPosts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // id or null
  const [form, setForm] = useState({ title: '', url: '' });
  const [confirmId, setConfirmId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { push } = useToast() || { push: () => {} };
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/posts', { params: { mine: true, includeDone: true } });
        if (!active) return;
        setItems(res.data || []);
      } catch (e) {
        const err = e?.response?.data?.error || 'Failed to load your posts';
        setError(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const beginEdit = (p) => {
    setEditing(p._id);
    setForm({ title: (p.title || '').slice(0, 120), url: p.url });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ title: '', url: '' });
  };

  const saveEdit = async (id) => {
    try {
      const payload = { title: form.title.slice(0, 120), url: form.url };
      const res = await api.patch(`/posts/${id}`, payload);
      const updated = res.data;
      setItems((prev) => prev.map((x) => (x._id === id ? { ...x, ...updated } : x)));
      cancelEdit();
    } catch (e) {
      const err = e?.response?.data?.error || 'Failed to update post';
      setError(err);
    }
  };

  const askRemove = (id) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const doRemove = async () => {
    const id = confirmId;
    setConfirmOpen(false);
    if (!id) return;
    try {
      await api.delete(`/posts/${id}`);
      setItems((prev) => prev.filter((x) => x._id !== id));
      push({ type: 'success', title: 'Deleted', desc: 'Your post was removed.' });
    } catch (e) {
      const err = e?.response?.data?.error || 'Failed to delete post';
      setError(err);
      push({ type: 'error', title: 'Delete failed', desc: err });
    } finally {
      setConfirmId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = useMemo(() => items.slice(start, start + PAGE_SIZE), [items, start]);

  if (loading) {
    return (
      <div className="px-2 sm:px-0 max-w-3xl mx-auto">
        <div className="h-8 w-2/3 bg-zinc-800 rounded animate-pulse mt-1 mb-4" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 animate-pulse mb-4">
            <div className="h-4 w-1/3 bg-zinc-800 rounded" />
            <div className="mt-3 h-6 w-2/3 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (error) return <div className="p-4"><div className="rounded-2xl border border-rose-900/40 bg-rose-900/10 p-4 text-rose-400">{error}</div></div>;

  return (
    <div className="px-2 sm:px-0 max-w-3xl mx-auto">
      <div className="mb-6 mt-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">My Posts</h1>
        <div className="mt-2 text-sm opacity-70">Posts you have shared.</div>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center">
          <div className="text-3xl mb-3">📝</div>
          <div className="text-lg font-medium mb-1">You haven't shared any posts yet</div>
          <div className="text-sm opacity-70 mb-4">Submit a LinkedIn post to see it here.</div>
          <a href="/submit" className="btn btn-primary">+ Share a Post</a>
        </div>
      ) : null}

      <div className="space-y-4">
        {pageItems.map((p) => (
          <div key={p._id} className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
            <div className="flex items-center gap-3 mb-2 text-sm text-zinc-400">
              <Avatar name={p?.sharer?.name || 'You'} src={p?.sharer?.photoURL} size={32} />
              <div>Shared by <span className="text-zinc-200 font-medium">{p?.sharer?.name}</span></div>
            </div>

            {editing === p._id ? (
              <div className="space-y-2 mb-3">
                <input
                  className="input w-full"
                  placeholder="Title (max 120 chars)"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 120) }))}
                />
                <input
                  className="input w-full"
                  placeholder="https://www.linkedin.com/posts/..."
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                />
                <div className="flex gap-2">
                  <button className="btn btn-primary h-9" onClick={() => saveEdit(p._id)}>Save</button>
                  <button className="btn btn-ghost h-9" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="text-lg sm:text-xl font-semibold leading-snug mb-2 break-words overflow-hidden"
                  style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}
                >
                  {p.title || (p.url.includes('/in/') ? 'Exciting update on LinkedIn.' : 'A shared post.')}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-400 underline break-all hover:opacity-90">{p.url}</a>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-ghost h-9 border border-zinc-700" onClick={() => beginEdit(p)}>Edit</button>
                  <button className="btn btn-rose h-9 border border-zinc-700" onClick={() => askRemove(p._id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {items.length > PAGE_SIZE ? (
        <div className="mt-6 flex items-center justify-between">
          <button
            className="btn btn-ghost h-9"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Previous
          </button>
          <div className="text-sm opacity-70">Page {page} of {totalPages}</div>
          <button
            className="btn btn-ghost h-9"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next →
          </button>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete post?"
        description="This will remove the post from everyone's feed. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={doRemove}
        onCancel={() => { setConfirmOpen(false); setConfirmId(null); }}
      />
    </div>
  );
}
