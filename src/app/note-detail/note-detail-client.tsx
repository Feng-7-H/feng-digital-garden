"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  Clock,
  Hash,
  Leaf,
  Link2,
  Pencil,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";

export interface NoteTag {
  id: string;
  name: string;
}

export interface NoteDetail {
  id: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags: NoteTag[];
}

/** 相关笔记：按共享标签数推荐 */
interface RelatedNote extends NoteDetail {
  shared: NoteTag[];
}

/** 日期显示：YYYY-MM-DD（本地时区） */
function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 阅读时长：按中文约 400 字/分钟估算，至少 1 分钟 */
function readMinutes(content: string): number {
  const len = content.replace(/\s/g, "").length;
  return Math.max(1, Math.round(len / 400));
}

export function NoteDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [note, setNote] = useState<NoteDetail | null>(null);
  const [related, setRelated] = useState<RelatedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const noteId = searchParams.get("note_id");

    // 缺少 note_id 参数时跳回数字花园
    if (!noteId) {
      router.replace("/garden");
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get<{ note: NoteDetail }>(`/api/notes/${noteId}`),
      api.get<{ notes: NoteDetail[] }>("/api/notes"),
      api
        .get<{ authenticated: boolean }>("/api/auth/me")
        .then((res) => res.authenticated)
        .catch(() => false),
    ])
      .then(([noteRes, listRes, admin]) => {
        if (cancelled) return;
        const current = noteRes.note;
        setNote(current);
        setIsAdmin(admin);

        // 相关笔记：按共享标签数排序取前 3 篇（排除自身）
        const myTagIds = new Set(current.tags.map((t) => t.id));
        const candidates = listRes.notes
          .filter((item) => item.id !== current.id)
          .map((item) => ({ item, shared: item.tags.filter((t) => myTagIds.has(t.id)) }))
          .filter((x) => x.shared.length > 0)
          .sort((a, b) => b.shared.length - a.shared.length)
          .slice(0, 3)
          .map((x) => ({ ...x.item, shared: x.shared }));
        setRelated(candidates);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "笔记不存在或未发布");
        router.replace("/garden");
      });

    return () => {
      cancelled = true;
    };
  }, [mounted, searchParams, router]);

  /** 返回：优先返回上一页，无历史记录时回退到数字花园 */
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/garden");
    }
  };

  const meta = useMemo(() => {
    if (!note) return null;
    const publishDate = formatDate(note.published_at ?? note.created_at);
    const updateDate = formatDate(note.updated_at);
    return { publishDate, updateDate, minutes: readMinutes(note.content) };
  }, [note]);

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-center" richColors />
      <SiteHeader />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        <div className="max-w-3xl mx-auto">
          {/* 返回链接：优先返回上一页，无历史记录时回退到数字花园 */}
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回花园
          </button>

          {loading ? (
            /* 加载骨架 */
            <article className="mt-6" aria-label="笔记加载中">
              <Skeleton className="h-9 w-3/4" />
              <div className="mt-4 flex gap-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="mt-10 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </article>
          ) : note ? (
            <>
              <article className="mt-6">
                {/* 文章头：标题 + 编辑按钮 + 元信息 */}
                <header>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <h1 className="font-serif text-3xl font-bold text-foreground leading-snug">
                      {note.title}
                    </h1>
                    {isAdmin && (
                      <Link
                        href={`/admin-editor?note_id=${note.id}`}
                        title="在后台编辑器中打开这篇笔记"
                        className="shrink-0 inline-flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-container-high active:scale-[0.98] transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        编辑
                      </Link>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    {meta && meta.publishDate && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        发布于 {meta.publishDate}
                      </span>
                    )}
                    {meta && meta.updateDate && meta.updateDate !== meta.publishDate && (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        更新于 {meta.updateDate}
                      </span>
                    )}
                    {meta && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        约 {meta.minutes} 分钟读完
                      </span>
                    )}
                    {/* 草稿状态仅站长可见（访客接口不返回草稿） */}
                    {note.status === "draft" && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/15 text-warning font-medium">
                        草稿
                      </span>
                    )}
                  </div>
                  <hr className="mt-7 border-0 border-t border-outline-variant/20" />
                </header>

                {/* 正文：Markdown 渲染 */}
                <div className="mt-8">
                  {note.content ? (
                    <MarkdownRenderer content={note.content} />
                  ) : (
                    <div className="flex flex-col items-center text-center py-16 text-muted-foreground">
                      <FileText className="w-8 h-8 text-muted-foreground/40" />
                      <p className="mt-4 text-sm">这篇笔记还没有正文内容</p>
                    </div>
                  )}
                </div>

                {/* 文章底部：标签胶囊组，点击跳转花园并激活筛选 */}
                {note.tags.length > 0 && (
                  <div className="mt-12 pt-6 border-t border-outline-variant/20 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground mr-1">标签</span>
                    {note.tags.map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/garden?tag=${encodeURIComponent(tag.name)}`}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container text-primary text-xs font-medium hover:opacity-85 transition-opacity"
                      >
                        <Hash className="w-3 h-3" />
                        {tag.name}
                      </Link>
                    ))}
                  </div>
                )}
              </article>

              {/* 相关笔记：按共享标签推荐 */}
              {related.length > 0 && (
                <section className="mt-14">
                  <h2 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-primary" />
                    相关笔记
                    <span className="text-xs font-normal text-muted-foreground font-sans">
                      按共享标签推荐
                    </span>
                  </h2>
                  <div className="mt-5 grid gap-3">
                    {related.map((item) => {
                      const sharedNames = item.shared.map((t) => t.name);
                      const sharedLabel =
                        sharedNames.length > 1
                          ? `共享标签 · ${sharedNames[0]} 等${sharedNames.length}个`
                          : `共享标签 · ${sharedNames[0]}`;
                      return (
                        <Link
                          key={item.id}
                          href={`/note-detail?note_id=${item.id}`}
                          className="block bg-surface rounded-lg shadow-card p-4 hover:-translate-y-0.5 hover:shadow-float transition-all group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-serif text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            <ArrowUpRight className="w-4 h-4 mt-0.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-container text-primary">
                              <Link2 className="w-3 h-3" />
                              {sharedLabel}
                            </span>
                            <span className="text-muted-foreground">
                              更新于 {formatDate(item.updated_at)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
