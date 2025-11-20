import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { useToast } from '../state/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';

export default function Profiles() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(null);
  const { push } = useToast() || { push: () => {} };
  const [sendingId, setSendingId] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users', { params: { page, pageSize } });
      const data = res?.data?.items || [];
      setItems(data);
      setHasMore(!!res?.data?.hasMore);
      setTotal(typeof res?.data?.total === 'number' ? res.data.total : null);
    } catch (e) {
      const err = e?.response?.data?.error || 'Failed to load profiles';
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const requestConnect = async (userId) => {
    try {
      setSendingId(userId);
      await api.post('/connections/mark', { addresseeId: userId });
      // Remove from list on success (pending/connected users are excluded server-side next fetch)
      setItems((prev) => prev.filter((u) => u._id !== userId));
      push({ type: 'success', title: 'Connection requested' });
    } catch (e) {
      const err = e?.response?.data?.error || 'Failed to send request';
      push({ type: 'error', title: 'Could not connect', desc: err });
    } finally {
      setSendingId('');
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

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-rose-900/40 bg-rose-900/10 p-4 text-rose-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-0 max-w-5xl mx-auto">
      <div className="mb-6 mt-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Linkedin Connect</h1>
        <div className="text-sm opacity-70 mt-1">Let's connect with new people.</div>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center">
          <div className="text-3xl mb-2">🧑‍🤝‍🧑</div>
          <div className="text-lg font-medium mb-1">No profiles yet</div>
          <div className="text-sm opacity-70">Once users add LinkedIn, they will appear here.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((u) => (
            <div key={u._id} className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={u.name || u.email || 'User'} src={u.photoURL} size={48} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{u.name || 'Unnamed User'}</div>
                  {u.linkedinUrl ? (
                    <a
                      href={u.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-indigo-400 hover:underline break-all"
                      title={u.linkedinUrl}
                    >
                      LinkedIn →
                    </a>
                  ) : (
                    <div className="text-sm opacity-60">No LinkedIn</div>
                  )}
                </div>
              </div>
              <button
                className="btn btn-primary h-9"
                disabled={sendingId === u._id}
                onClick={() => requestConnect(u._id)}
              >
                {sendingId === u._id ? 'Saving…' : 'Connected'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          className="btn btn-ghost h-9"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          ← Previous
        </button>
        <div className="text-sm opacity-70">
          {total != null ? (
            <>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</>
          ) : (
            <>Page {page}</>
          )}
        </div>
        <button
          className="btn btn-ghost h-9"
          onClick={() => setPage((p) => p + 1)}
          disabled={total != null ? (page >= Math.max(1, Math.ceil(total / pageSize))) : !hasMore}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
