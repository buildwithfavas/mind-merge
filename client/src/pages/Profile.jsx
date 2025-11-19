import { useEffect, useState } from 'react';
import api from '../utils/api.js';
import Avatar from '../components/Avatar.jsx';
import { useAuth } from '../state/AuthContext.jsx';

export default function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        console.log('[PROFILE] initial fetch start');
        const res = await api.get('/me/profile', { params: { t: Date.now() } });
        console.log('[PROFILE] initial fetch ok', res?.data);
        if (!active) return;
        setName(res.data?.name || '');
        setLinkedinUrl(res.data?.linkedinUrl || '');
        const serverPhoto = res.data?.photoURL || '';
        // Prefill with Google photo if server has none
        setPhotoURL(serverPhoto || user?.photoURL || '');
      } catch (e) {
        console.warn('[PROFILE] initial fetch miss or error', e?.response?.status, e?.response?.data || e?.message);
        // If profile missing, keep fields empty and let user fill
        // But still show Google photo if available
        if (active) setPhotoURL(user?.photoURL || '');
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => { active = false; };
  }, [user]);

  const onSave = async () => {
    setError('');
    setSaved(false);
    const nm = name.trim();
    const url = linkedinUrl.trim();
    const pic = photoURL.trim();
    if (!nm) { setError('Display name is required'); return; }
    if (!url) { setError('LinkedIn URL is required'); return; }
    try {
      setSaving(true);
      console.log('[PROFILE] save start', { name: nm, linkedinUrl: url, photoURL: pic });
      const postRes = await api.post('/me/profile', { name: nm, linkedinUrl: url, photoURL: pic });
      console.log('[PROFILE] save post ok', postRes?.data);
      // Re-fetch and reflect persisted values
      const refetch = await api.get('/me/profile', { params: { t: Date.now() } });
      const data = refetch?.data || {};
      console.log('[PROFILE] refetch after save', data);
      setName(data.name || nm);
      setLinkedinUrl(data.linkedinUrl || url);
      if (data.photoURL) {
        // cache-bust to avoid stale image
        const cbUrl = data.photoURL.includes('?') ? `${data.photoURL}&t=${Date.now()}` : `${data.photoURL}?t=${Date.now()}`;
        console.log('[PROFILE] apply photo url after save', { raw: data.photoURL, applied: cbUrl });
        setPhotoURL(cbUrl);
      }
      setSaved(true);
    } catch (e) {
      console.error('[PROFILE] save error', e?.response?.status, e?.response?.data || e);
      const msg = e?.response?.data?.error || 'Failed to save profile';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Downscale image to <= 512px and convert to WebP, then enforce max ~2MB
  const processImageToWebP = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSide = 512;
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Failed to encode image')); return; }
        if (blob.size > 2 * 1024 * 1024) { reject(new Error('Image too large after processing (max 2MB)')); return; }
        const webpFile = new File([blob], 'profile.webp', { type: 'image/webp' });
        resolve(webpFile);
      }, 'image/webp', 0.9);
    };
    img.onerror = () => reject(new Error('Invalid image file'));
    const reader = new FileReader();
    reader.onload = (e) => { img.src = String(e.target.result); };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

  const onPickPhoto = async (e) => {
    // Temporarily disabled
    setError('Profile photo upload is temporarily disabled.');
    return;
    try {
      setError('');
      const file = e.target.files?.[0];
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError('Please select a JPG, PNG, or WEBP image'); return; }
      // Process client-side
      setUploading(true); setProgress(0);
      console.log('[UPLOAD] start', {
        signedIn: !!user,
        uid: user?.uid || null,
        file: { name: file.name, type: file.type, size: file.size }
      });
      const processed = await processImageToWebP(file);
      console.log('[UPLOAD] processed', { type: processed.type, size: processed.size });
      const uid = user?.uid;
      if (!uid) { setError('Not signed in'); setUploading(false); return; }
      const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      if (!cloud || !preset) {
        setError('Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
        setUploading(false);
        return;
      }
      const form = new FormData();
      form.append('file', processed);
      form.append('upload_preset', preset);
      form.append('folder', `users/${uid}`);
      form.append('public_id', 'profile');
      try {
        const endpoint = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
        const res = await fetch(endpoint, { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) {
          const msg = data?.error?.message || 'Cloudinary upload failed';
          throw new Error(msg);
        }
        const url = data.secure_url || data.url;
        if (!url) throw new Error('Missing URL from Cloudinary response');
        setProgress(100);
        const bust = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
        setPhotoURL(bust);
        setSaved(false);
        console.log('[UPLOAD] complete, url', url);
      } catch (e) {
        console.error('[UPLOAD] cloudinary error', e);
        setError(e?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    } catch (err) {
      console.error('[UPLOAD] outer error', err);
      setError(err?.message || 'Upload failed');
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 animate-pulse">
        <div className="h-7 w-40 bg-zinc-800 rounded" />
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full bg-zinc-800 border border-zinc-700" />
          <div className="h-4 w-48 bg-zinc-800 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-800 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-40 bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-800 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-56 bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-800 rounded" />
        </div>
        <div className="h-9 w-32 bg-zinc-800 rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Your Profile</h1>
      <div className="flex items-center gap-3">
        <Avatar name={name || user?.displayName || (user?.email ? String(user.email).split('@')[0] : 'User')} src={photoURL} size={64} />
        <div className="text-sm opacity-80">This image appears next to your shares in the feed.</div>
      </div>

      {error ? <div className="text-sm text-rose-400">{error}</div> : null}
      {saved ? <div className="text-sm text-emerald-400">Saved!</div> : null}

      <div className="space-y-2">
        <label className="block text-sm">Display name</label>
        <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your display name" />
      </div>
      <div className="space-y-2">
        <label className="block text-sm">LinkedIn profile URL</label>
        <input className="input w-full" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://www.linkedin.com/in/username" />
        <p className="text-xs opacity-70">Must be an https://linkedin.com URL.</p>
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Profile photo</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickPhoto} disabled aria-disabled title="Temporarily disabled" className="opacity-60 cursor-not-allowed" />
        <p className="text-xs text-amber-400">Image upload is temporarily disabled. We will enable this soon.</p>
        {uploading ? (
          <div className="text-xs opacity-80">Uploading… {progress}%</div>
        ) : null}
        <p className="text-xs opacity-70">Max 2MB. We downscale to 512px and convert to WebP to save space.</p>
      </div>

      <button className="btn btn-primary" disabled={saving} onClick={onSave}>
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}
