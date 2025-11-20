import React, { useEffect, useState } from 'react';
import api from '../../utils/api.js';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, blocked: 0, posts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const [usersRes, blockedRes, postsRes] = await Promise.all([
          api.get('/admin/users?page=1&pageSize=1'),
          api.get('/admin/users?blocked=true&page=1&pageSize=1'),
          api.get('/admin/posts?page=1&pageSize=1')
        ]);
        if (!active) return;
        setStats({
          users: usersRes.data.total || 0,
          blocked: blockedRes.data.total || 0,
          posts: postsRes.data.total || 0
        });
      } catch (e) {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="p-4">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-700 p-4">
          <div className="text-sm opacity-70">Users</div>
          <div className="text-3xl font-bold">{stats.users}</div>
          <div className="mt-3"><Link className="text-indigo-400 hover:underline text-sm" to="/admin/users">Manage users →</Link></div>
        </div>
        <div className="rounded-lg border border-zinc-700 p-4">
          <div className="text-sm opacity-70">Blocked Users</div>
          <div className="text-3xl font-bold">{stats.blocked}</div>
          <div className="mt-3"><Link className="text-indigo-400 hover:underline text-sm" to="/admin/users">View blocked →</Link></div>
        </div>
        <div className="rounded-lg border border-zinc-700 p-4">
          <div className="text-sm opacity-70">Posts</div>
          <div className="text-3xl font-bold">{stats.posts}</div>
          <div className="mt-3"><Link className="text-indigo-400 hover:underline text-sm" to="/admin/posts">Moderate posts →</Link></div>
        </div>
      </div>
    </div>
  );
}
