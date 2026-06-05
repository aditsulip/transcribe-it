"use client";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm border border-zinc-700 bg-black p-4">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        <p className="mt-2 text-xs text-zinc-400">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="border border-zinc-700 px-3 py-1 text-xs">
            {cancelLabel ?? "Cancel"}
          </button>
          <button
            onClick={onConfirm}
            className="border border-red-500 px-3 py-1 text-xs text-red-300"
          >
            {confirmLabel ?? "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
