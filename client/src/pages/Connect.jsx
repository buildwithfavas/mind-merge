import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { useToast } from '../state/ToastContext.jsx';
import Avatar from '../components/Avatar.jsx';

function Section({ title, children, extra }) {
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {extra}
      </div>
      {children}
    </div>
  );
}

export default function Connect() {
  const { push } = useToast() || { push: () => {} };
  const [loadingSug, setLoadingSug] = useState(true);
  const [loadingReq, setLoadingReq] = useState(true);
  const [sug, setSug] = useState([]);
  const [reqs, setReqs] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10;

  const loadSug = async (opts = {}) => {
    try {
      setLoadingSug(true);
      const qp = new URLSearchParams();
      qp.set('limit', String(limit));
      qp.set('page', String(opts.page ?? page));
      if ((opts.q ?? q).trim()) qp.set('q', (opts.q ?? q).trim());
      const res = await api.get(`/connections/suggestions?${qp.toString()}`);
      const data = res.data || {};
      setSug(Array.isArray(data.items) ? data.items : []);
      setHasMore(!!data.hasMore);
    } catch (e) {
      push({ type: 'error', title: 'Failed to load suggestions' });
    } finally {
      setLoadingSug(false);
    }
  };

  const loadReqs = async () => {
    try {
      setLoadingReq(true);
      const res = await api.get('/connections/requests');
      setReqs(res.data || []);
    } catch (e) {
      push({ type: 'error', title: 'Failed to load requests' });
    } finally {
      setLoadingReq(false);
    }
  };

  useEffect(() => { loadSug(); loadReqs(); }, []);

  const request = async (addresseeId) => {
    try {
      await api.post('/connections/request', { addresseeId });
      push({ type: 'success', title: 'Request sent' });
      // Optimistic: remove from suggestions
      setSug((prev) => prev.filter((u) => u._id !== addresseeId));
    } catch (e) {
      push({ type: 'error', title: 'Failed to send request' });
    }
  };

  const respond = async (requesterId, action) => {
    try {
      await api.post('/connections/respond', { requesterId, action });
      push({ type: 'success', title: action === 'accept' ? 'Request accepted' : 'Request declined' });
      loadReqs();
      if (action === 'accept') loadSug();
    } catch (e) {
      push({ type: 'error', title: 'Failed to respond' });
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <Section
        title="Suggestions"
        extra={(
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); loadSug({ q: e.currentTarget.value, page: 1 }); } }}
              placeholder="Search name or email"
              className="input h-9 w-56"
            />
            <button className="btn btn-ghost h-9" onClick={() => { setPage(1); loadSug({ q, page: 1 }); }}>Search</button>
            <button className="btn btn-ghost h-9" onClick={() => { setQ(''); setPage(1); loadSug({ q: '', page: 1 }); }}>Clear</button>
            <button className="btn btn-ghost h-9" onClick={() => loadSug()}>Refresh</button>
          </div>
        )}
      >
        {loadingSug ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="mt-3 h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        ) : sug.length === 0 ? (
          <div className="text-sm opacity-80">No suggestions right now.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sug.map((u) => (
              <div key={u._id} className="card p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name || u.email || 'User'} src={u.photoURL} size={40} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.name || u.email || u._id}</div>
                    <div className="text-sm opacity-70 truncate">{u.email}</div>
                    {u.linkedinUrl ? (
                      <a
                        href={u.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 underline truncate"
                        title="Open LinkedIn profile"
                      >
                        LinkedIn
                      </a>
                    ) : null}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => request(u._id)}>Connect</button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <button
            className="btn btn-ghost h-9"
            disabled={page <= 1}
            onClick={() => { const np = Math.max(1, page - 1); setPage(np); loadSug({ page: np }); }}
          >
            Prev
          </button>
          <div className="text-sm opacity-70">Page {page}</div>
          <button
            className="btn btn-ghost h-9"
            disabled={!hasMore}
            onClick={() => { const np = page + 1; setPage(np); loadSug({ page: np }); }}
          >
            Next
          </button>
        </div>
      </Section>

      <Section title="Requests" extra={<button className="btn btn-ghost" onClick={loadReqs}>Refresh</button>}>
        {loadingReq ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        ) : reqs.length === 0 ? (
          <div className="text-sm opacity-80">No incoming requests.</div>
        ) : (
          <div className="space-y-3">
            {reqs.map((r) => (
              <div key={r.requesterId} className="card p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={r.name || r.email || 'User'} src={r.photoURL} size={40} />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.name || r.email || r.requesterId}</div>
                    <div className="text-sm opacity-70 truncate">{r.email}</div>
                    {r.linkedinUrl ? (
                      <a
                        href={r.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 underline truncate"
                        title="Open LinkedIn profile"
                      >
                        LinkedIn
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={() => respond(r.requesterId, 'accept')}>Accept</button>
                  <button className="btn btn-ghost" onClick={() => respond(r.requesterId, 'decline')}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
