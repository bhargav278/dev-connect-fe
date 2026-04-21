interface ConfirmModalProps {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  danger = true,
  loading = false,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-60 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl rounded-b-none border border-white/10 bg-zinc-900 p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-white">{title}</p>
        {description ? <p className="mt-1 text-xs text-zinc-400">{description}</p> : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              danger ? 'bg-rose-500 hover:bg-rose-400' : 'bg-indigo-500 hover:bg-indigo-400'
            }`}
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
