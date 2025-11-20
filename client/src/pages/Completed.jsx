import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../state/ToastContext.jsx';
import api from '../utils/api.js';
import Avatar from '../components/Avatar.jsx';

export default function Completed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast() || { push: () => {} };
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/me/done');
      setItems(res.data || []);
    } catch (e) {
      const err = e?.response?.data?.error || 'Failed to load completed posts';
      push({ type: 'error', title: 'Load failed', desc: err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [items.length]);

  // Viewport-fit pagination: compute how many cards can fit without scrolling
  useEffect(() => {
    const calc = () => {
      const viewport = window.innerHeight || 800;
      const topbar = 56; // h-14
      const footer = 64; // ~py-4
      const verticalGutters = 24; // main padding etc
      const available = Math.max(200, viewport - topbar - footer - verticalGutters);
      const headerEstimate = 96; // title
      const cardEstimate = 160; // average card height
      const fit = Math.floor((available - headerEstimate) / cardEstimate);
      const next = Math.min(10, Math.max(1, fit));
      setItemsPerPage(next);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const undo = async (id) => {
    try {
      await api.delete(`/posts/${id}/done`);
      setItems((prev) => prev.filter((p) => p._id !== id));
      push({ type: 'success', title: 'Undone', desc: 'Item returned to your feed.' });
    } catch (e) {
      const err = e?.response?.data?.error || 'Failed to undo done';
      push({ type: 'error', title: 'Undo failed', desc: err });
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/posts/${id}`);
      setItems((prev) => prev.filter((p) => p._id !== id));
      push({ type: 'success', title: 'Deleted', desc: 'Post has been deleted.' });
    } catch (e) {
      const err = e?.response?.data?.error || 'Failed to delete post';
      push({ type: 'error', title: 'Delete failed', desc: err });
    }
  };

  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const start = (page - 1) * itemsPerPage;
  const pageItems = useMemo(() => items.slice(start, start + itemsPerPage), [items, start, itemsPerPage]);

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

  return (
    <div className="px-2 sm:px-0 max-w-3xl mx-auto">
      <div className="mb-6 mt-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Completed Posts</h1>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/40 p-10 text-center">
          <div className="text-3xl mb-3">✅</div>
          <div className="text-lg font-medium mb-1">No completed items yet</div>
          <div className="text-sm opacity-70">Mark items done from your feed to see them here.</div>
        </div>
      ) : null}

      <div className="space-y-4">
        {pageItems.map((p) => (
          <div key={p._id} className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4">
            <div className="flex items-center gap-3 mb-2 text-sm text-zinc-400">
              <Avatar name={p?.sharer?.name || 'Someone'} src={p?.sharer?.photoURL} size={32} />
              <div>Shared by <span className="text-zinc-200 font-medium">{p?.sharer?.name || 'Someone'}</span></div>
            </div>

            <div
              className="text-lg sm:text-xl font-semibold leading-snug mb-2 break-words overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            >
              {p.title ? p.title : (p.url?.includes('/in/') ? 'Exciting update from a friend on LinkedIn.' : 'A new share worth reading.')}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-indigo-400 underline break-all hover:opacity-90"
              >
                {p.url}
              </a>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm select-none text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>❤</span>
                  <span>{p?.metrics?.likes ?? 0}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>💬</span>
                  <span>{p?.metrics?.comments ?? 0}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-primary h-9" onClick={() => undo(p._id)}>Undo</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length > itemsPerPage ? (
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

