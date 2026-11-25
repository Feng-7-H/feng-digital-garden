"use client";

import { Loader2, Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  /** 被删除对象的名称（标题 / 昵称） */
  targetName: string;
  /** 确认按钮文案，默认「确认删除」 */
  confirmText?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** 弹窗：确认删除（笔记 / 作品 / 留言通用） */
export function ConfirmDialog({
  open,
  targetName,
  confirmText = "确认删除",
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div
        className="bg-surface rounded-xl shadow-dialog max-w-sm w-full p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 id="confirm-delete-title" className="font-serif text-lg font-bold text-on-surface">
              确认删除
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mt-1.5">
              将删除「<span className="text-on-surface font-medium">{targetName}</span>」，此操作不可恢复。
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="bg-surface-container text-on-surface border-none px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-container-high active:scale-[0.98] transition-all disabled:opacity-60"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-2 bg-destructive text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
