"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Sprout, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MessageBoard } from "@/components/message-board";
import { Toaster } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export interface NoteListItem {
  id: string;
  title: string;
  summary: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags: { id: string; name: string }[];
}

export interface TagItem {
  id: string;
  name: string;
  count: number;
}

/** 日期显示：YYYY-MM-DD（本地时区） */
function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function GardenClient() {
  const searchParams = useSearchParams();

  // 筛选状态：标签名（"" = 全部）+ 防抖后的搜索词
  const [activeTag, setActiveTag] = useState("");
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");

  // 数据：null 表示加载中（骨架屏）
  const [notes, setNotes] = useState<NoteListItem[] | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);

  // 从 /note-detail 标签胶囊跳转进入时激活对应筛选（挂载后设置，避免 hydration 不一致）
  useEffect(() => {
    const tag = searchParams.get("tag");
    if (tag) setActiveTag(tag);
  }, [searchParams]);

  // 搜索 300ms 防抖
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(keyword.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  // 笔记列表：标签筛选与搜索叠加（由服务端过滤）
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (activeTag) params.set("tag", activeTag);
    if (query) params.set("q", query);
    const qs = params.toString();
    api
      .get<{ notes: NoteListItem[] }>(`/api/notes${qs ? `?${qs}` : ""}`)
      .then((data) => {
        if (!cancelled) setNotes(data.notes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "笔记加载失败");
        setNotes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTag, query]);

  // 标签云（仅展示有已发布笔记的标签）
  useEffect(() => {
    api
      .get<{ tags: TagItem[] }>("/api/tags")
      .then((data) => setTags(data.tags.filter((t) => t.count > 0)))
      .catch(() => setTags([]));
  }, []);

  const toggleTag = useCallback((name: string) => {
    setActiveTag((cur) => (cur === name ? "" : name));
  }, []);

  const resetFilter = useCallback(() => {
    setKeyword("");
    setQuery("");
    setActiveTag("");
  }, []);

  const filtered = activeTag !== "" || query !== "";
  const noteCount = notes?.length ?? 0;

  const tagChips = useMemo(
    () => (
      <>
        {/* 标签-全部（默认激活） */}
        <button
          type="button"
          aria-pressed={activeTag === ""}
          onClick={() => setActiveTag("")}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
            activeTag === ""
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
          )}
        >
          全部
        </button>
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            aria-pressed={activeTag === tag.name}
            onClick={() => toggleTag(tag.name)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeTag === tag.name
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-surface-container-high hover:text-foreground"
            )}
          >
            {tag.name}
          </button>
        ))}
      </>
    ),
    [tags, activeTag, toggleTag]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-center" richColors />
      <SiteHeader />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        {/* 页头：大标题 + 副标题 + 结果计数 */}
        <header className="mb-10">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground tracking-wide">数字花园</h1>
              <p className="mt-2 text-sm text-muted-foreground">随手种下的想法与思考，彼此连结成网。</p>
            </div>
            {notes !== null && (
              <p className="pb-1 text-xs text-muted-foreground">
                {filtered ? `找到 ${noteCount} 篇笔记` : `共 ${noteCount} 篇笔记`}
              </p>
            )}
          </div>
        </header>

        {/* 工具区：搜索框 + 标签云 */}
        <section className="mb-8 space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="搜索笔记…"
              aria-label="搜索笔记"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="bg-muted border-none pl-9 pr-9 focus-visible:ring-primary/30"
            />
            {keyword && (
              <button
                type="button"
                aria-label="清空搜索"
                onClick={() => setKeyword("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-surface-container-high transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="按标签筛选笔记">
            {tagChips}
          </div>
        </section>

        {/* 笔记卡片网格：桌面 3 列 / 平板 2 列 / 移动 1 列 */}
        {notes === null ? (
          <section aria-label="笔记加载中" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-surface rounded-xl shadow-card p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-2 h-4 w-2/3" />
                <div className="mt-5 pt-4 border-t border-outline-variant/15 flex items-center justify-between">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </section>
        ) : notes.length > 0 ? (
          <section
            aria-label="笔记列表"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          >
            {notes.map((note) => (
              <Link
                key={note.id}
                href={`/note-detail?note_id=${note.id}`}
                className="group flex flex-col bg-surface rounded-xl shadow-card p-5 transition-all duration-200 hover:shadow-float hover:-translate-y-1"
              >
                <h2 className="text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                  {note.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {note.summary || "这篇笔记还没有摘要"}
                </p>
                <div className="mt-auto pt-4 border-t border-outline-variant/15 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(note.published_at ?? note.updated_at)}
                  </time>
                </div>
              </Link>
            ))}
          </section>
        ) : filtered ? (
          /* 搜索/筛选无匹配 */
          <div className="flex flex-col items-center text-center py-20">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Sprout className="w-6 h-6 text-muted-foreground/70" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">没有找到相关笔记</p>
            <p className="mt-1 text-xs text-muted-foreground">换个关键词，或清除标签筛选再试试</p>
            <Button variant="ghost" onClick={resetFilter} className="mt-5 text-primary bg-primary/10 hover:bg-primary/15 hover:text-primary">
              清除筛选条件
            </Button>
          </div>
        ) : (
          /* 花园空态：暂无任何已发布笔记 */
          <div className="flex flex-col items-center text-center py-20">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Sprout className="w-6 h-6 text-primary/60" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">花园还是一片空地</p>
            <p className="mt-1 text-xs text-muted-foreground">第一篇笔记正在酝酿中，敬请期待</p>
          </div>
        )}

        {/* 留言板：访客留下想法与见解，无需登录 */}
        <MessageBoard />
      </main>

      <SiteFooter />
    </div>
  );
}
