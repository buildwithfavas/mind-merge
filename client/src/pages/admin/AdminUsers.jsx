import React, { useEffect, useMemo, useState } from 'react';
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

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [blocked, setBlocked] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  const load = async (opts = {}) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (role) params.set('role', role);
    if (blocked) params.set('blocked', blocked);
    params.set('page', String(opts.page || page));
    params.set('pageSize', String(pageSize));
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users?${params.toString()}`);
      setItems(data.items || []);
      setHasMore(!!data.hasMore);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load({ page: 1 }); setPage(1); }, []);

  const handleSearch = async () => { await load({ page: 1 }); setPage(1); };

  const act = async (fn) => { setLoading(true); try { await fn(); await load(); } finally { setLoading(false); } };

  const onCreate = async () => {
    const name = prompt('Name?');
    if (!name) return;
    const email = prompt('Email? (optional)') || '';
    await act(() => api.post('/admin/users', { name, email }));
  };
  const onEdit = async (u) => {
    const name = prompt('Name?', u.name || '') || '';
    const email = prompt('Email?', u.email || '') || '';
    await act(() => api.patch(`/admin/users/${u._id}`, { name, email }));
  };
  const onBlock = async (u) => {
    const reason = prompt('Reason for block? (optional)') || '';
    await act(() => api.post(`/admin/users/${u._id}/block`, { reason }));
  };
  const onUnblock = async (u) => {
    await act(() => api.post(`/admin/users/${u._id}/unblock`));
  };
  const onDelete = async (u) => {
    if (!confirm(`Delete ${u.name || u.email || u._id}? This cannot be undone.`)) return;
    await act(() => api.delete(`/admin/users/${u._id}`));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Manage Users</h1>

      <div className="flex flex-wrap gap-2 items-center">
        <TextInput value={q} onChange={setQ} placeholder="Search name or email" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-sm">
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select value={blocked} onChange={(e) => setBlocked(e.target.value)} className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-sm">
          <option value="">All statuses</option>
          <option value="true">Blocked</option>
          <option value="false">Not blocked</option>
        </select>
        <button onClick={handleSearch} className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm">Search</button>
        <button onClick={onCreate} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm">New User</button>
      </div>

      <div className="rounded-lg border border-zinc-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-left px-3 py-2">Blocked</th>
              <th className="text-left px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center opacity-70">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center opacity-70">No users</td></tr>
            ) : items.map((u) => (
              <tr key={u._id} className="border-t border-zinc-800">
                <td className="px-3 py-2">{u.name || '-'}</td>
                <td className="px-3 py-2">{u.email || '-'}</td>
                <td className="px-3 py-2">{u.role || 'user'}</td>
                <td className="px-3 py-2">{u.blocked ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 space-x-2">
                  <button onClick={() => onEdit(u)} className="px-2 py-1 rounded bg-zinc-800">Edit</button>
                  {u.blocked ? (
                    <button onClick={() => onUnblock(u)} className="px-2 py-1 rounded bg-emerald-700 text-white">Unblock</button>
                  ) : (
                    <button onClick={() => onBlock(u)} className="px-2 py-1 rounded bg-amber-700 text-white">Block</button>
                  )}
                  <button onClick={() => onDelete(u)} className="px-2 py-1 rounded bg-red-700 text-white">Delete</button>
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
