import { useEffect } from 'react';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-sm mx-4 rounded-lg bg-zinc-900 border border-zinc-800 shadow-lg p-4">
        <div className="text-lg font-semibold mb-2">{title}</div>
        {description ? <div className="text-sm opacity-80 mb-4">{description}</div> : null}
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost h-9" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn btn-rose h-9 border border-zinc-700" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
