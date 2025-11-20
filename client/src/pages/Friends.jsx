import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { useToast } from '../state/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Friends() {
  const { push } = useToast() || { push: () => {} };
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10;

  const load = async (opts = {}) => {
    try {
      setLoading(true);
      const qp = new URLSearchParams();
      qp.set('limit', String(limit));
      qp.set('page', String(opts.page ?? page));
      if ((opts.q ?? q).trim()) qp.set('q', (opts.q ?? q).trim());
      const res = await api.get(`/connections/friends?${qp.toString()}`);
      const data = res.data || {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setHasMore(!!data.hasMore);
    } catch (e) {
      push({ type: 'error', title: 'Failed to load friends' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const unfriend = async (userId) => {
    try {
      await api.delete(`/connections/unfriend/${userId}`);
      push({ type: 'success', title: 'Removed from friends' });
      setItems((prev) => prev.filter((u) => u._id !== userId));
    } catch (e) {
      push({ type: 'error', title: 'Failed to unfriend' });
    }
  };

  if (loading) {
    return (
      <div className="px-2 sm:px-0 max-w-5xl mx-auto">
        <div className="h-8 w-2/3 bg-zinc-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 animate-pulse h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-0 max-w-5xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); load({ q: e.currentTarget.value, page: 1 }); } }}
            placeholder="Search name or email"
            className="input h-9 w-56"
          />
          <button className="btn btn-ghost h-9" onClick={() => { setPage(1); load({ q, page: 1 }); }}>Search</button>
          <button className="btn btn-ghost h-9" onClick={() => { setQ(''); setPage(1); load({ q: '', page: 1 }); }}>Clear</button>
          <button className="btn btn-ghost h-9" onClick={() => load()}>Refresh</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm opacity-80">
          No friends yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((u) => (
            <div key={u._id} className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={u.name || u.email || 'User'} src={u.photoURL} size={48} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{u.name || u.email || u._id}</div>
                  {u.linkedinUrl ? (
                    <a
                      href={u.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-indigo-400 hover:underline truncate"
                      title="Open LinkedIn profile"
                    >
                      LinkedIn →
                    </a>
                  ) : (
                    <div className="text-sm opacity-60">No LinkedIn</div>
                  )}
                </div>
              </div>
              <button className="btn btn-ghost h-9" onClick={() => unfriend(u._id)}>Unfriend</button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          className="btn btn-ghost h-9"
          disabled={page <= 1}
          onClick={() => { const np = Math.max(1, page - 1); setPage(np); load({ page: np }); }}
        >
          ← Previous
        </button>
        <div className="text-sm opacity-70">Page {page}</div>
        <button
          className="btn btn-ghost h-9"
          disabled={!hasMore}
          onClick={() => { const np = page + 1; setPage(np); load({ page: np }); }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
