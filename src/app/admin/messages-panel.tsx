"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircleHeart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { MessageItem } from "./types";
import { ConfirmDialog } from "./confirm-dialog";
import { formatDateTime } from "./format";

/** 留言管理：查看全部记录（含访客软删除），站长删除 = 硬删除 */
export function MessagesPanel() {
  const [messages, setMessages] = useState<MessageItem[] | null>(null); // null = 加载中
  const [loadError, setLoadError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MessageItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      // ?all=1：站长查看全部记录（含已软删除）
      const r = await api.get<{ messages: MessageItem[] }>("/api/messages?all=1");
      setMessages(r.messages);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载留言失败");
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      // 站长删除为硬删除：正常留言从前台移除；已软删除记录被彻底清除
      await api.del(`/api/messages/${deleteTarget.id}`);
      toast.success(deleteTarget.deleted_at ? "已彻底清除该记录" : "留言已删除");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const loading = messages === null;
  const list = messages ?? [];
  const deletedCount = list.filter((m) => m.deleted_at).length;

  return (
    <section className="mt-6" aria-label="留言管理">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-on-surface-variant">
          访客在「数字花园」留言板留下的想法 · 共{" "}
          <span className="text-on-surface font-medium">{loading ? "…" : list.length}</span> 条记录
          {deletedCount > 0 && (
            <>
              （含 <span className="text-on-surface font-medium">{deletedCount}</span> 条已删除）
            </>
          )}
        </p>
        <p className="text-xs text-on-surface-variant/70">软删除记录仅站长可见；删除后不可恢复</p>
      </div>

      {/* 加载骨架 */}
      {loading && (
        <ul className="mt-4 space-y-3" aria-hidden="true">
          {[0, 1].map((i) => (
            <li key={i} className="bg-surface rounded-xl shadow-card p-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-container animate-pulse" />
                <div className="flex-1">
                  <div className="h-3.5 w-24 bg-surface-container rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-surface-container rounded mt-2 animate-pulse" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 加载失败 */}
      {!loading && loadError && (
        <div className="mt-4 bg-surface rounded-xl shadow-card px-6 py-12 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-3 text-xs text-primary hover:underline">
            重新加载
          </button>
        </div>
      )}

      {/* 留言列表 */}
      {!loading && !loadError && list.length > 0 && (
        <ul className="mt-4 space-y-3">
          {list.map((m) => {
            const deleted = Boolean(m.deleted_at);
            return (
              <li
                key={m.id}
                className={`rounded-xl p-5 ${deleted ? "bg-surface-container/40 opacity-80" : "bg-surface shadow-card"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-serif text-sm font-bold shrink-0 ${
                      deleted
                        ? "bg-surface-container-high text-on-surface-variant/50"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {m.name.trim().charAt(0).toUpperCase() || "客"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-medium ${deleted ? "text-on-surface-variant/70" : "text-on-surface"}`}>
                        {m.name}
                      </p>
                      {deleted && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                          已删除
                        </span>
                      )}
                      <span className="text-xs text-on-surface-variant/70">
                        {deleted && "访客于 30 分钟内自行删除 · "}
                        {formatDateTime(m.created_at)}
                      </span>
                    </div>
                    <p className={`mt-1.5 text-sm leading-relaxed ${deleted ? "text-on-surface-variant/60" : "text-on-surface-variant"}`}>
                      {m.content}
                      {deleted && "（该内容仅站长可见）"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(m)}
                    aria-label={deleted ? "彻底删除该记录" : "删除留言"}
                    title={deleted ? "彻底清除" : "删除留言"}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-md text-on-surface-variant/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 空态 */}
      {!loading && !loadError && list.length === 0 && (
        <div className="mt-4 flex flex-col items-center justify-center text-center bg-surface rounded-xl shadow-card px-6 py-12">
          <MessageCircleHeart className="w-8 h-8 text-primary/40" aria-hidden="true" />
          <p className="mt-4 text-sm text-on-surface-variant">欢迎留下您宝贵的经验分享~</p>
        </div>
      )}

      {/* 弹窗：确认删除 */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        targetName={deleteTarget ? `${deleteTarget.name} 的留言` : ""}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
