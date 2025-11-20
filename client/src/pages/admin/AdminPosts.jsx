import React, { useEffect, useState } from 'react';
import api from '../../utils/api.js';

function TextInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-sm ${className}`}
    />
  );
}

export default function AdminPosts() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  const load = async (opts = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(opts.page || page));
    params.set('pageSize', String(pageSize));
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/posts?${params.toString()}`);
      setItems(data.items || []);
      setHasMore(!!data.hasMore);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load({ page: 1 }); setPage(1); }, []);

  const handleSearch = async () => { await load({ page: 1 }); setPage(1); };

  const onDelete = async (p) => {
    if (!confirm(`Delete post: ${p.title || p.url}? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await api.delete(`/admin/posts/${p._id}`);
      await load();
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Manage Posts</h1>

      <div className="flex flex-wrap gap-2 items-center">
        <TextInput value={q} onChange={setQ} placeholder="Search title or URL" />
        <button onClick={handleSearch} className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm">Search</button>
      </div>

      <div className="rounded-lg border border-zinc-700 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-zinc-900/60">
            <tr>
              <th className="text-left px-3 py-2 w-2/5">Title</th>
              <th className="text-left px-3 py-2 w-2/5">URL</th>
              <th className="text-left px-3 py-2 w-1/5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-3 py-6 text-center opacity-70">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-6 text-center opacity-70">No posts</td></tr>
            ) : items.map((p) => (
              <tr key={p._id} className="border-t border-zinc-800">
                <td className="px-3 py-2 align-middle">
                  <div className="max-w-full truncate">{p.title || '-'}</div>
                </td>
                <td className="px-3 py-2 align-middle">
                  <a className="text-indigo-400 hover:underline block max-w-full truncate" href={p.url} target="_blank" rel="noreferrer">{p.url}</a>
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => onDelete(p)} className="px-2 py-1 rounded bg-red-700 text-white">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button disabled={page<=1} onClick={() => { const p=page-1; setPage(p); load({ page: p }); }} className="px-3 py-2 rounded-md bg-zinc-800 disabled:opacity-50">Prev</button>
        <div className="opacity-70 text-sm">Page {page}</div>
        <button disabled={!hasMore} onClick={() => { const p=page+1; setPage(p); load({ page: p }); }} className="px-3 py-2 rounded-md bg-zinc-800 disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
