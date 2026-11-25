"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Calendar, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MarkdownView } from "@/components/markdown-view";
import { Lightbox } from "@/components/lightbox";

/** 与 /api/works/[id] 返回结构一致 */
interface WorkData {
  id: string;
  title: string;
  subtitle: string;
  cover_url: string | null;
  content: string;
  external_url: string | null;
  tags: string[];
  content_images?: string[] | null;
  created_at: string;
}

interface WorkListItem {
  id: string;
  title: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
}

/**
 * 作品详情：展示单个作品完整内容（站长后台创建上传，访客只读）。
 * 头部元信息 + 封面大图（灯箱）+ Markdown 正文 + 内容图片 + 技术栈 + 上一篇/下一篇导航。
 */
export function WorkDetailView({ workId }: { workId: string }) {
  const [work, setWork] = useState<WorkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [siblings, setSiblings] = useState<WorkListItem[]>([]);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg("");
    api
      .get<{ work: WorkData }>(`/api/works/${encodeURIComponent(workId)}`)
      .then((d) => {
        if (!cancelled) setWork(d.work);
      })
      .catch((err: unknown) => {
        if (!cancelled) setErrorMsg(err instanceof Error ? err.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    // 拉取作品列表用于计算上一篇 / 下一篇
    api
      .get<{ works: WorkListItem[] }>("/api/works")
      .then((d) => {
        if (!cancelled) setSiblings(Array.isArray(d.works) ? d.works : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [workId]);

  // 列表按创建时间倒序返回：上一篇 = 更早发布，下一篇 = 更晚发布
  const idx = siblings.findIndex((w) => w.id === workId);
  const prevWork = idx >= 0 ? siblings[idx + 1] : undefined;
  const nextWork = idx > 0 ? siblings[idx - 1] : undefined;

  const coverUrl = work?.cover_url ?? null;
  const tags = work?.tags ?? [];
  const contentImages: string[] =
    work && Array.isArray(work.content_images) ? work.content_images : [];

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-on-surface">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
          {/* 返回行：返回关于我 */}
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            返回关于我
          </Link>

          {loading ? (
            /* 加载态：骨架屏 */
            <div className="mt-6 animate-pulse space-y-6">
              <div className="h-8 w-2/3 rounded bg-surface-container" />
              <div className="h-4 w-1/2 rounded bg-surface-container" />
              <div className="h-72 w-full rounded-xl bg-surface-container" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-surface-container" />
                <div className="h-4 w-11/12 rounded bg-surface-container" />
                <div className="h-4 w-3/4 rounded bg-surface-container" />
              </div>
            </div>
          ) : !work ? (
            /* 错误态：作品不存在或加载失败 */
            <div className="mt-16 flex flex-col items-center gap-3 rounded-xl border border-dashed border-outline-variant/50 bg-surface/60 px-6 py-16 text-center">
              <ImageOff className="h-8 w-8 text-on-surface-variant/50" />
              <p className="text-sm font-medium text-on-surface">作品不存在或已被删除</p>
              {errorMsg && <p className="text-xs text-on-surface-variant">{errorMsg}</p>}
              <Link
                href="/about"
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
              >
                <ArrowLeft className="h-4 w-4" />
                返回关于我
              </Link>
            </div>
          ) : (
            <>
              {/* 作品头：标题 / 副标题 / 元信息 / 外链按钮 */}
              <header className="mt-6">
                <h1 className="font-serif text-3xl font-bold leading-snug text-on-surface">
                  {work.title}
                </h1>
                {work.subtitle && (
                  <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
                    {work.subtitle}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-on-surface-variant">
                  {formatDate(work.created_at) && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(work.created_at)} 发布
                    </span>
                  )}
                  {work.external_url && (
                    <a
                      href={work.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/15 active:scale-[0.98]"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      访问项目
                    </a>
                  )}
                </div>
              </header>

              {/* 封面大图（点击灯箱放大） */}
              {coverUrl && (
                <img
                  src={coverUrl}
                  alt={`${work.title}封面`}
                  onClick={() => setLightbox({ src: coverUrl, alt: `${work.title}封面` })}
                  className="mt-8 w-full cursor-zoom-in select-none rounded-xl shadow-card"
                />
              )}

              {/* 正文：Markdown 渲染（站长后台录入，访客只读） */}
              <article className="mt-10">
                {work.content?.trim() ? (
                  <MarkdownView
                    content={work.content}
                    onImageClick={(src, alt) => setLightbox({ src, alt })}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-outline-variant/50 bg-surface/60 px-6 py-12 text-center text-sm text-on-surface-variant">
                    站长还没有为这个作品填写正文。
                  </div>
                )}
              </article>

              {/* 内容图片：后台随作品上传，点击灯箱放大 */}
              {contentImages.length > 0 && (
                <section className="mt-10">
                  <h2 className="mb-4 font-serif text-xl font-bold text-on-surface">
                    作品图片
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {contentImages.map((src, i) => (
                      <img
                        key={`${src}-${i}`}
                        src={src}
                        alt={`作品图片 ${i + 1}`}
                        loading="lazy"
                        onClick={() => setLightbox({ src, alt: `作品图片 ${i + 1}` })}
                        className="w-full cursor-zoom-in select-none rounded-xl shadow-card"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* 技术栈标签 */}
              {tags.length > 0 && (
                <section className="mt-10">
                  <h2 className="mb-4 font-serif text-xl font-bold text-on-surface">
                    技术栈
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-surface-container px-3 py-1 text-xs text-on-surface-variant"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* 底部导航：上一篇 / 下一篇 / 查看更多作品 */}
              <nav className="mt-14 border-t border-outline-variant/15 pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {prevWork ? (
                    <Link
                      href={`/work-detail?work_id=${prevWork.id}`}
                      className="group inline-flex items-center gap-2.5 text-sm text-on-surface-variant transition-colors hover:text-primary"
                    >
                      <ArrowLeft className="h-4 w-4 shrink-0" />
                      <span className="text-left">
                        <span className="block text-xs text-on-surface-variant/70">
                          上一篇
                        </span>
                        <span className="font-medium text-on-surface transition-colors group-hover:text-primary">
                          {prevWork.title}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                  {nextWork ? (
                    <Link
                      href={`/work-detail?work_id=${nextWork.id}`}
                      className="group inline-flex items-center gap-2.5 text-sm text-on-surface-variant transition-colors hover:text-primary sm:flex-row-reverse sm:text-right"
                    >
                      <ArrowRight className="h-4 w-4 shrink-0" />
                      <span>
                        <span className="block text-xs text-on-surface-variant/70">
                          下一篇
                        </span>
                        <span className="font-medium text-on-surface transition-colors group-hover:text-primary">
                          {nextWork.title}
                        </span>
                      </span>
                    </Link>
                  ) : (
                    <span aria-hidden="true" />
                  )}
                </div>
                <div className="mt-6 text-center">
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    查看更多作品
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </nav>
            </>
          )}
        </div>
      </main>

      <SiteFooter />

      {/* 图片查看器（灯箱）：封面 / 正文插图 / 内容图片共用 */}
      <Lightbox
        src={lightbox ? lightbox.src : null}
        alt={lightbox?.alt}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
