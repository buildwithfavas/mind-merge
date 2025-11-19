import { useMemo, useState } from 'react';

export default function Avatar({ name = 'User', src, size = 32, className = '' }) {
  const [broken, setBroken] = useState(false);
  const initials = useMemo(() => {
    const n = (name || 'User').trim();
    if (!n) return 'U';
    const parts = n.split(/\s+/).filter(Boolean);
    const pick = (s) => s[0]?.toUpperCase() || '';
    const inits = (parts[0] ? pick(parts[0]) : '') + (parts[1] ? pick(parts[1]) : '');
    return inits || pick(n) || 'U';
  }, [name]);

  const sizePx = typeof size === 'number' ? `${size}px` : size;

  if (!src || broken) {
    return (
      <div
        className={["rounded-full bg-zinc-700 text-zinc-100 grid place-items-center font-semibold", className].join(' ')}
        style={{ width: sizePx, height: sizePx }}
        aria-label={name}
        title={name}
      >
        <span style={{ fontSize: '0.75rem', lineHeight: 1 }}>{initials}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/img-redundant-alt
    <img
      src={src}
      alt="avatar"
      className={["rounded-full object-cover", className].join(' ')}
      style={{ width: sizePx, height: sizePx }}
      onError={() => setBroken(true)}
    />
  );
}
