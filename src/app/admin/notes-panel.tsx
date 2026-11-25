"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Inbox, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { NoteItem } from "./types";
import { ConfirmDialog } from "./confirm-dialog";
import { formatDate } from "./format";

type StatusFilter = "all" | "draft" | "published";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "draft", label: "草稿" },
  { key: "published", label: "已发布" },
];

/** 笔记管理：状态筛选、搜索、编辑、发布/撤回、删除 */
export function NotesPanel() {
  const [notes, setNotes] = useState<NoteItem[] | null>(null); // null = 加载中
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NoteItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const r = await api.get<{ notes: NoteItem[] }>("/api/notes");
      setNotes(r.notes);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载笔记失败");
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 搜索 300ms 防抖
  useEffect(() => {
    const t = setTimeout(() => setQuery(keyword.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const filtered = useMemo(
    () =>
      (notes ?? [])
        .filter((n) => filter === "all" || n.status === filter)
        .filter((n) => !query || n.title.toLowerCase().includes(query)),
    [notes, filter, query]
  );

  /** 发布 / 撤回切换 */
  async function togglePublish(n: NoteItem) {
    if (togglingId) return;
    const next = n.status === "published" ? "draft" : "published";
    setTogglingId(n.id);
    try {
      await api.put(`/api/notes/${n.id}`, { status: next });
      toast.success(next === "published" ? "已发布到数字花园" : "已撤回为草稿");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await api.del(`/api/notes/${deleteTarget.id}`);
      toast.success("笔记已删除");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const loading = notes === null;

  return (
    <section className="mt-6" aria-label="笔记管理">
      {/* 工具行：状态筛选 pills + 搜索框 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" role="group" aria-label="状态筛选">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search
            className="w-4 h-4 text-on-surface-variant/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索笔记标题…"
            aria-label="搜索笔记标题"
            className="w-full sm:w-60 bg-surface-container border-none rounded-md pl-9 pr-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
          />
        </div>
      </div>

      {/* 加载骨架 */}
      {loading && (
        <div className="mt-4 bg-surface rounded-xl shadow-card divide-y divide-outline-variant/30" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="px-5 py-4">
              <div className="h-4 w-2/5 bg-surface-container rounded animate-pulse" />
              <div className="h-3 w-1/4 bg-surface-container rounded mt-2 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* 加载失败 */}
      {!loading && loadError && (
        <div className="mt-4 bg-surface rounded-xl shadow-card px-5 py-10 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 text-xs text-primary hover:underline"
          >
            重新加载
          </button>
        </div>
      )}

      {/* 管理列表 */}
      {!loading && !loadError && (
        <>
          <div className="mt-4 bg-surface rounded-xl shadow-card divide-y divide-outline-variant/30">
            {filtered.map((n) => {
              const published = n.status === "published";
              return (
                <div
                  key={n.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-surface-container/40 transition-colors"
                >
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <h3 className="font-serif text-base font-semibold text-on-surface">{n.title}</h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${
                          published ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {published ? "已发布" : "草稿"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {n.tags.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-container text-primary"
                        >
                          {t.name}
                        </span>
                      ))}
                      <time className="text-xs text-on-surface-variant/80 ml-1">{formatDate(n.updated_at)} 更新</time>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/admin-editor?note_id=${n.id}`}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-md text-on-surface-variant hover:text-primary hover:bg-primary-container transition-colors"
                      title="编辑"
                      aria-label={`编辑笔记「${n.title}」`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void togglePublish(n)}
                      disabled={togglingId === n.id}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-md text-on-surface-variant hover:text-primary hover:bg-primary-container transition-colors disabled:opacity-50"
                      title={published ? "撤回为草稿" : "发布笔记"}
                      aria-label={`${published ? "撤回笔记" : "发布笔记"}「${n.title}」`}
                    >
                      {togglingId === n.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : published ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(n)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-md text-on-surface-variant hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="删除"
                      aria-label={`删除笔记「${n.title}」`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 筛选 / 搜索无结果 */}
          {filtered.length === 0 && (
            <div className="mt-4 bg-surface rounded-xl shadow-card px-6 py-12 text-center">
              {notes.length === 0 ? (
                <>
                  <Inbox className="w-8 h-8 text-primary/40 mx-auto" aria-hidden="true" />
                  <p className="mt-4 text-sm text-on-surface-variant">花园里还没有笔记</p>
                  <p className="mt-1 text-xs text-on-surface-variant/70">
                    点击右上角「新建笔记」，种下第一颗种子吧
                  </p>
                </>
              ) : (
                <p className="text-sm text-on-surface-variant">没有匹配的笔记，换个关键词或筛选条件试试。</p>
              )}
            </div>
          )}
        </>
      )}

      {/* 弹窗：确认删除 */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        targetName={deleteTarget?.title ?? ""}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
