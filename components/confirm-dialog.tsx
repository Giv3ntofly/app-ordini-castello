"use client";
import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      aria-labelledby="clear-title"
      className="confirm-dialog"
    >
      <span className="dialog-icon">
        <Trash2 size={24} />
      </span>
      <h2 id="clear-title">Svuotare l’ordine?</h2>
      <p>
        Tutti i prodotti e le quantità inserite saranno rimossi dalla bozza
        salvata.
      </p>
      <div className="dialog-actions">
        <button className="button secondary" autoFocus onClick={onCancel}>
          Mantieni ordine
        </button>
        <button className="button danger" onClick={onConfirm}>
          Svuota ordine
        </button>
      </div>
    </dialog>
  );
}
