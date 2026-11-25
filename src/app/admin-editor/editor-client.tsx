"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Loader2,
  PencilLine,
  Save,
  Send,
  Tags as TagsIcon,
  X,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { api } from "@/lib/api";
import { renderMarkdown, summarizeMarkdown } from "@/lib/markdown";
import { formatDateTime } from "../admin/format";
import type { NoteTag } from "../admin/types";

type NoteDetail = {
  id: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags: NoteTag[];
};

const inputClass =
  "w-full bg-surface-container border-none rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";

/** 笔记编辑器：标题 + 标签 + Markdown 编辑/预览 + 保存/发布 */
export function EditorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = searchParams.get("note_id");

  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [serverStatus, setServerStatus] = useState<string>("draft");
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);

  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  // 初始快照：用于「未保存改动」检测
  const [snapshot, setSnapshot] = useState("");

  // 鉴权 + 加载笔记
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.get<{ authenticated: boolean }>("/api/auth/me");
        if (!me.authenticated) {
          router.replace("/admin-login");
          return;
        }
        if (cancelled) return;
        setAuthed(true);

        if (noteId) {
          const r = await api.get<{ note: NoteDetail }>(`/api/notes/${noteId}`);
          if (cancelled) return;
          const n = r.note;
          setTitle(n.title);
          setContent(n.content ?? "");
          setTags((n.tags ?? []).map((t) => t.name));
          setServerStatus(n.status);
          setServerUpdatedAt(n.updated_at);
          setSnapshot(JSON.stringify({ title: n.title, content: n.content ?? "", tags: (n.tags ?? []).map((t) => t.name) }));
        } else {
          setSnapshot(JSON.stringify({ title: "", content: "", tags: [] }));
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "加载笔记失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noteId, router]);

  const dirty = useMemo(
    () => JSON.stringify({ title, content, tags }) !== snapshot,
    [title, content, tags, snapshot]
  );

  const previewHtml = useMemo(() => renderMarkdown(content), [content]);

  /** 保存（草稿 / 发布），成功后回后台列表 */
  const save = useCallback(
    async (status: "draft" | "published") => {
      if (saving) return;
      if (!title.trim()) {
        toast.error("请先给笔记起个标题");
        return;
      }
      setSaving(true);
      try {
        const body = {
          title: title.trim(),
          summary: summarizeMarkdown(content),
          content,
          status,
          tags,
        };
        if (noteId) {
          await api.put(`/api/notes/${noteId}`, body);
        } else {
          await api.post("/api/notes", body);
        }
        toast.success(status === "published" ? "已发布到数字花园" : "已保存为草稿");
        router.push("/admin");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "保存失败，请稍后再试");
        setSaving(false);
      }
    },
    [content, noteId, router, saving, tags, title]
  );

  // Ctrl/Cmd + S 快捷保存草稿
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save("draft");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // 有未保存改动时，拦截页面刷新/关闭
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  /** 返回后台：有改动先弹确认 */
  const goBack = useCallback(() => {
    if (dirty) setDiscardOpen(true);
    else router.push("/admin");
  }, [dirty, router]);

  function addTag(raw: string) {
    const val = raw.trim().replace(/[,，]/g, "");
    if (!val) return;
    if (tags.includes(val)) {
      toast.warning(`标签「${val}」已存在`);
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, val]);
    setTagInput("");
  }

  if (loading || !authed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs">正在加载编辑器…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Link href="/admin" className="text-xs text-primary hover:underline">
          返回后台
        </Link>
      </div>
    );
  }

  const published = serverStatus === "published";

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      {/* 简化顶部栏（编辑页专注模式，不含全局导航） */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-outline-variant/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 grid grid-cols-[1fr_auto_1fr] items-center">
          <button
            type="button"
            onClick={goBack}
            aria-label="返回后台列表"
            className="justify-self-start inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            返回
          </button>
          <h1 className="font-serif font-bold text-lg text-on-surface">编辑笔记</h1>
          <button
            type="button"
            onClick={() => void save("draft")}
            disabled={saving}
            className="justify-self-end bg-surface-container text-on-surface border-none px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-container-high active:scale-[0.98] transition-all disabled:opacity-60"
          >
            保存草稿
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* 标题输入 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="给这篇笔记起个标题…"
          aria-label="笔记标题"
          className="w-full text-2xl font-serif font-bold text-on-surface bg-transparent border-b border-outline-variant/20 rounded-none px-0 py-3 placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-0 focus:border-primary/40 transition-colors"
        />

        {/* 元信息行 */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${
              published
                ? "bg-primary/10 text-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {published ? "已发布" : "草稿"}
          </span>
          <span className="text-xs text-on-surface-variant">
            {serverUpdatedAt ? `上次保存于 ${formatDateTime(serverUpdatedAt)}` : "新笔记"} · 发布后将展示在数字花园
          </span>
        </div>

        {/* 标签区 */}
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-2">
            <TagsIcon className="w-4 h-4 text-on-surface-variant" aria-hidden="true" />
            <span className="text-sm font-medium text-on-surface">标签</span>
            <span className="text-xs text-on-surface-variant/70">输入后回车快速添加</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-surface-container rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-container text-primary"
                >
                  {t}
                  <button
                    type="button"
                    aria-label={`移除标签 ${t}`}
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    className="-mr-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="输入标签后回车添加…"
              aria-label="添加标签"
              className="flex-1 min-w-[160px] bg-transparent border-none px-1 py-1 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-0"
            />
          </div>
        </section>

        {/* 移动端 编辑/预览 切换（桌面双栏并排） */}
        <div className="flex md:hidden items-center gap-2 mt-8" role="tablist" aria-label="编辑或预览切换">
          {(
            [
              { key: "edit", label: "编辑", icon: PencilLine },
              { key: "preview", label: "预览", icon: Eye },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mobileView === key}
              onClick={() => setMobileView(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                mobileView === key
                  ? "bg-surface-container-high text-on-surface"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              <Icon className="w-3 h-3" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* Markdown 编辑 / 预览双栏（桌面并排，移动端上下切换） */}
        <section className="mt-4 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {/* 左栏：编辑 */}
          <div className={`${mobileView === "edit" ? "" : "hidden"} md:flex md:flex-col`}>
            <div className="hidden md:flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium bg-surface-container-high text-on-surface-variant">
                <PencilLine className="w-3 h-3" aria-hidden="true" />
                编辑
              </span>
              <span className="text-xs text-on-surface-variant/70">Markdown 语法</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              placeholder="使用 Markdown 语法撰写笔记…"
              aria-label="Markdown 编辑区"
              className="w-full flex-1 min-h-[400px] font-mono text-sm leading-relaxed text-on-surface bg-surface-container border-none rounded-md p-4 placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-y"
            />
          </div>

          {/* 右栏：预览 */}
          <div className={`${mobileView === "preview" ? "" : "hidden"} md:flex md:flex-col`}>
            <div className="hidden md:flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium bg-surface-container-high text-on-surface-variant">
                <Eye className="w-3 h-3" aria-hidden="true" />
                预览
              </span>
              <span className="text-xs text-on-surface-variant/70">渲染效果实时更新</span>
            </div>
            <div
              className="flex-1 min-h-[400px] bg-surface rounded-xl p-6 shadow-card overflow-x-auto"
              // 内容经 renderMarkdown 转义后生成，无 XSS 风险
              dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-sm text-on-surface-variant/50">暂无内容，开始书写吧…</p>' }}
            />
          </div>
        </section>

        {/* 底部操作栏 */}
        <div className="mt-10 pt-6 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 bg-surface-container text-on-surface border-none px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-container-high active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            返回
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void save("draft")}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-surface-container text-on-surface border-none px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-container-high active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              保存草稿
            </button>
            <button
              type="button"
              onClick={() => void save("published")}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" aria-hidden="true" />}
              发布
            </button>
          </div>
        </div>
      </main>

      {/* 弹窗：放弃未保存的修改 */}
      {discardOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-surface rounded-xl shadow-dialog max-w-sm w-full p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-title"
          >
            <h3 id="discard-title" className="font-serif text-lg font-bold text-on-surface">
              放弃未保存的修改？
            </h3>
            <p className="text-sm text-on-surface-variant leading-relaxed mt-2">
              当前笔记还有未保存的改动，返回后将丢失这些内容。
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDiscardOpen(false)}
                className="bg-surface-container text-on-surface border-none px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-container-high active:scale-[0.98] transition-all"
              >
                继续编辑
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
              >
                放弃并返回
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="bottom-center" richColors />
    </div>
  );
}
