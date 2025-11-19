import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api.js';
import { useToast } from '../state/ToastContext.jsx';

export default function Feed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { push } = useToast() || { push: () => {} };
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [visited, setVisited] = useState(() => {
    try {
      const raw = localStorage.getItem('visitedPostIds');
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(arr);
    } catch {
      return new Set();
    }
  });
  const [engage, setEngage] = useState(() => {
    // Map of postId -> { liked: boolean, commented: boolean }
    return new Map();
  });
  const [counts, setCounts] = useState(() => {
    // Map of postId -> { likes: number, comments: number }
    return new Map();
  });

  const saveVisited = (nextSet) => {
    try {
      localStorage.setItem('visitedPostIds', JSON.stringify(Array.from(nextSet)));
    } catch {}
  };

  const getEngageKey = (id) => `engage_${id}`;
  const readEngage = (id) => {
    const key = getEngageKey(id);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { liked: false, commented: false };
      const obj = JSON.parse(raw);
      return { liked: !!obj.liked, commented: !!obj.commented };
    } catch {
      return { liked: false, commented: false };
    }
  };
  const writeEngage = (id, value) => {
    try { localStorage.setItem(getEngageKey(id), JSON.stringify(value)); } catch {}
  };
  const setEngageFor = (id, updater) => {
    setEngage((prev) => {
      const next = new Map(prev);
      const current = next.get(id) ?? readEngage(id);
      const updated = typeof updater === 'function' ? updater(current) : updater;
      next.set(id, updated);
      writeEngage(id, updated);
      // Adjust counts: compare prev vs updated
      setCounts((pc) => {
        const cur = pc.get(id) ?? { likes: 0, comments: 0 };
        const diffLike = (updated.liked ? 1 : 0) - (current.liked ? 1 : 0);
        const diffComm = (updated.commented ? 1 : 0) - (current.commented ? 1 : 0);
        const nextCounts = new Map(pc);
        nextCounts.set(id, { likes: Math.max(0, cur.likes + diffLike), comments: Math.max(0, cur.comments + diffComm) });
        return nextCounts;
      });
      return next;
    });
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/posts');
      const data = res.data || [];
      setItems(data);
      // Initialize counts map from server metrics if present, else 0
      setCounts(() => {
        const m = new Map();
        for (const p of data) {
          const baseLikes = p?.metrics?.likes ?? 0;
          const baseComments = p?.metrics?.comments ?? 0;
          m.set(p._id, { likes: baseLikes, comments: baseComments });
        }
        return m;
      });
      // Initialize engagement map from server `me`
      setEngage(() => {
        const m = new Map();
        for (const p of data) {
          const me = p?.me || { liked: false, commented: false };
          m.set(p._id, { liked: !!me.liked, commented: !!me.commented });
        }
        return m;
      });
    } catch (e) {
      const err = e?.response?.data?.error || 'Failed to load feed';
      setError(err);
      push({ type: 'error', title: 'Load failed', desc: err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    // Reset to first page when items change
    setPage(1);
  }, [items.length]);

  // Viewport-fit pagination: compute how many cards can fit without scrolling
  useEffect(() => {
    const calc = () => {
      const viewport = window.innerHeight || 800;
      const topbar = 56; // h-14
      const footer = 64; // ~py-4
      const verticalGutters = 24; // main padding etc
      const available = Math.max(200, viewport - topbar - footer - verticalGutters);
      const headerEstimate = 120; // title + controls
      const cardEstimate = 160; // average card height
      const fit = Math.floor((available - headerEstimate) / cardEstimate);
      const next = Math.min(10, Math.max(1, fit));
      setItemsPerPage(next);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const markDone = async (id) => {
    try {
      await api.post(`/posts/${id}/done`);
      setItems((prev) => prev.filter((p) => p._id !== id));
      push({ type: 'success', title: 'Marked done', desc: 'Item removed from your feed.' });
      // Clean up visited state for this id
      setVisited((prev) => {
        const next = new Set(prev);
        next.delete(id);
        saveVisited(next);
        return next;
      });
      // Clean up engagement checklist
      try { localStorage.removeItem(getEngageKey(id)); } catch {}
      setEngage((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {}
  };

  const markVisited = (id) => {
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveVisited(next);
      return next;
    });
  };

  const toggleLike = async (id) => {
    const cur = engage.get(id) ?? { liked: false, commented: false };
    const nextLiked = !cur.liked;
    // optimistic UI
    setEngage((prev) => new Map(prev).set(id, { ...cur, liked: nextLiked }));
    try {
      const res = await api.post(`/posts/${id}/engage`, { liked: nextLiked, commented: cur.commented });
      const met = res?.data?.metrics;
      const me = res?.data?.me;
      if (met) setCounts((prev) => new Map(prev).set(id, met));
      if (me) setEngage((prev) => new Map(prev).set(id, me));
    } catch (e) {
      // revert on error
      setEngage((prev) => new Map(prev).set(id, cur));
    }
  };

  const toggleComment = async (id) => {
    const cur = engage.get(id) ?? { liked: false, commented: false };
    const nextCommented = !cur.commented;
    setEngage((prev) => new Map(prev).set(id, { ...cur, commented: nextCommented }));
    try {
      const res = await api.post(`/posts/${id}/engage`, { liked: cur.liked, commented: nextCommented });
      const met = res?.data?.metrics;
      const me = res?.data?.me;
      if (met) setCounts((prev) => new Map(prev).set(id, met));
      if (me) setEngage((prev) => new Map(prev).set(id, me));
    } catch (e) {
      setEngage((prev) => new Map(prev).set(id, cur));
    }
  };

  const sortedItems = useMemo(() => {
    return items
      .slice()
      .sort((a, b) => {
        const av = visited.has(a._id) ? 1 : 0;
        const bv = visited.has(b._id) ? 1 : 0;
        return av - bv; // unvisited first
      });
  }, [items, visited]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));
  const start = (page - 1) * itemsPerPage;
  const pageItems = sortedItems.slice(start, start + itemsPerPage);

  if (loading) {
    return (
      <div className="px-2 sm:px-0 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-2/3 bg-zinc-800 rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 animate-pulse">
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
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Your Friends' Latest Shares</h1>
        <div className="mt-4 flex items-center gap-2">
          <div className="relative">
            <button className="btn btn-ghost h-9 px-3 border border-zinc-800 rounded-md">Sort by Newest ▾</button>
          </div>
          <div className="relative">
            <button className="btn btn-ghost h-9 px-3 border border-zinc-800 rounded-md">Filter by Friend ▾</button>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center">
          <div className="text-3xl mb-3">📬</div>
          <div className="text-lg font-medium mb-1">All caught up!</div>
          <div className="text-sm opacity-70 mb-4">Share your first post or add friends to see their shares.</div>
          <a href="/submit" className="btn btn-primary">+ Share a Post</a>
        </div>
      ) : null}

      <div className="space-y-4">
        {pageItems.map((p) => {
            const isVisited = visited.has(p._id);
            const eng = engage.get(p._id) ?? { liked: false, commented: false };
            const canDone = !!(eng.liked && eng.commented);
            return (
              <div key={p._id} className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
                <div className="flex items-center gap-3 mb-2 text-sm text-zinc-400">
                  {p?.sharer?.photoURL ? (
                    <img src={p.sharer.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-zinc-800" />
                  )}
                  <div>Shared by <span className="text-zinc-200 font-medium">{p?.sharer?.name || 'Someone'}</span></div>
                </div>
                <div
                  className="text-lg sm:text-xl font-semibold leading-snug mb-2 break-words overflow-hidden"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                >
                  {p.title ? p.title : (p.url.includes('/in/') ? 'Exciting update from a friend on LinkedIn.' : 'A new share worth reading.')}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => markVisited(p._id)}
                    className="text-sm text-indigo-400 underline break-all hover:opacity-90"
                  >
                    {p.url}
                  </a>
                  {isVisited ? (
                    <span className="inline-flex items-center whitespace-nowrap text-[11px] px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-800">● Visited</span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm select-none">
                    <label
                      className={`inline-flex items-center gap-2 ${eng.liked ? 'text-rose-400' : 'text-zinc-400'} hover:opacity-90 cursor-pointer`}
                      aria-label={eng.liked ? 'Unlike' : 'Like'}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-700 bg-transparent"
                        checked={!!eng.liked}
                        onChange={() => toggleLike(p._id)}
                      />
                      <span aria-hidden>{eng.liked ? '❤' : '♡'}</span>
                      <span>{counts.get(p._id)?.likes ?? 0}</span>
                    </label>
                    <label
                      className={`inline-flex items-center gap-2 ${eng.commented ? 'text-indigo-400' : 'text-zinc-400'} hover:opacity-90 cursor-pointer`}
                      aria-label={eng.commented ? 'Remove comment' : 'Commented'}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-700 bg-transparent"
                        checked={!!eng.commented}
                        onChange={() => toggleComment(p._id)}
                      />
                      <span aria-hidden>{eng.commented ? '💬' : '🗨'}</span>
                      <span>{counts.get(p._id)?.comments ?? 0}</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-primary h-9"
                      title={canDone ? 'Mark this post as done' : 'Like and Comment to enable Mark Done'}
                      onClick={() => {
                        if (!canDone) {
                          push({ type: 'info', title: 'Complete checklist', desc: 'Please Like and Comment to enable Mark Done.' });
                          return;
                        }
                        markDone(p._id);
                      }}
                    >
                      Mark Done
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
      </div>
      {sortedItems.length > itemsPerPage ? (
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
    </div>
  );
}

