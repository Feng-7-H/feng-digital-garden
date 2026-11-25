"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FolderOpen, ImageUp, Inbox, Link2, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { WorkDetail, WorkItem } from "./types";
import { ConfirmDialog } from "./confirm-dialog";

const inputClass =
  "w-full bg-surface-container border-none rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";

interface WorkForm {
  title: string;
  subtitle: string;
  externalUrl: string;
  coverUrl: string;
  content: string;
}

const EMPTY_FORM: WorkForm = { title: "", subtitle: "", externalUrl: "", coverUrl: "", content: "" };

/** 作品管理：列表 + 新建/编辑弹窗 + 删除 */
export function WorksPanel() {
  const [works, setWorks] = useState<WorkItem[] | null>(null); // null = 加载中
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = 新建
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState<WorkForm>(EMPTY_FORM);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const r = await api.get<{ works: WorkItem[] }>("/api/works");
      setWorks(r.works);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载作品失败");
      setWorks([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTags([]);
    setTagInput("");
    setModalOpen(true);
  }

  async function openEdit(w: WorkItem) {
    setEditingId(w.id);
    setForm({
      title: w.title,
      subtitle: w.subtitle ?? "",
      externalUrl: w.external_url ?? "",
      coverUrl: w.cover_url ?? "",
      content: "",
    });
    setTags(w.tags ?? []);
    setTagInput("");
    setModalOpen(true);
    // 列表接口不返回正文，编辑时单独拉取全量
    setDetailLoading(true);
    try {
      const r = await api.get<{ work: WorkDetail }>(`/api/works/${w.id}`);
      setForm((prev) => ({ ...prev, content: r.work.content ?? "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载作品详情失败");
    } finally {
      setDetailLoading(false);
    }
  }

  /** 上传封面（POST /api/upload FormData，返回对象存储公开 URL） */
  async function handleCoverUpload(file: File) {
    if (uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post<{ url: string }>("/api/upload", fd);
      setForm((prev) => ({ ...prev, coverUrl: r.url }));
      toast.success("封面上传成功");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

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

  async function handleSave() {
    if (saving) return;
    if (!form.title.trim()) {
      toast.error("请填写作品标题");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        external_url: form.externalUrl.trim(),
        cover_url: form.coverUrl.trim(),
        content: form.content,
        tags,
      };
      if (editingId) {
        await api.put(`/api/works/${editingId}`, body);
        toast.success("作品已保存");
      } else {
        await api.post("/api/works", body);
        toast.success("作品已创建");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await api.del(`/api/works/${deleteTarget.id}`);
      toast.success("作品已删除");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const loading = works === null;

  return (
    <section className="mt-6" aria-label="作品管理">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-on-surface-variant">
          {works ? `共 ${works.length} 个作品 · 展示于「关于我」页` : "加载中…"}
        </p>
        <button
          type="button"
          onClick={openNew}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建作品
        </button>
      </div>

      {/* 加载骨架 */}
      {loading && (
        <div className="mt-4 bg-surface rounded-xl shadow-card divide-y divide-outline-variant/30" aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-24 h-16 rounded-md bg-surface-container animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-1/3 bg-surface-container rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-surface-container rounded mt-2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 加载失败 */}
      {!loading && loadError && (
        <div className="mt-4 bg-surface rounded-xl shadow-card px-5 py-10 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-3 text-xs text-primary hover:underline">
            重新加载
          </button>
        </div>
      )}

      {/* 作品列表 */}
      {!loading && !loadError && (
        <>
          <div className="mt-4 bg-surface rounded-xl shadow-card divide-y divide-outline-variant/30">
            {works.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container/40 transition-colors"
              >
                <div className="w-24 h-16 rounded-md overflow-hidden shrink-0 bg-surface-container">
                  {w.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.cover_url} alt={`作品「${w.title}」封面`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                      <ImageUp className="w-5 h-5" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <h3 className="font-serif text-base font-semibold text-on-surface">{w.title}</h3>
                    {w.external_url ? (
                      <a
                        href={w.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Link2 className="w-3 h-3" aria-hidden="true" />
                        {w.external_url.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant/60">
                        <Link2 className="w-3 h-3" aria-hidden="true" />
                        暂未上线
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mt-1 line-clamp-1">
                    {w.subtitle || "暂无描述"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void openEdit(w)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-md text-on-surface-variant hover:text-primary hover:bg-primary-container transition-colors"
                    title="编辑"
                    aria-label={`编辑作品「${w.title}」`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(w)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-md text-on-surface-variant hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="删除"
                    aria-label={`删除作品「${w.title}」`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {works.length === 0 && (
            <div className="mt-4 bg-surface rounded-xl shadow-card px-6 py-12 text-center">
              <FolderOpen className="w-8 h-8 text-primary/40 mx-auto" aria-hidden="true" />
              <p className="mt-4 text-sm text-on-surface-variant">还没有作品</p>
              <p className="mt-1 text-xs text-on-surface-variant/70">点击「新建作品」，展示你做过的东西</p>
            </div>
          )}
        </>
      )}

      {/* 弹窗：新建 / 编辑作品 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-surface rounded-xl shadow-dialog max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="work-form-title"
          >
            <div className="flex items-center justify-between">
              <h3 id="work-form-title" className="font-serif text-lg font-bold text-on-surface">
                {editingId ? "编辑作品" : "新建作品"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="关闭弹窗"
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mt-5">
              <div>
                <label htmlFor="work-input-title" className="block text-sm font-medium text-on-surface">
                  作品标题
                </label>
                <input
                  id="work-input-title"
                  type="text"
                  placeholder="例如：节气手账"
                  className={`${inputClass} mt-1.5`}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="work-input-desc" className="block text-sm font-medium text-on-surface">
                  作品描述
                </label>
                <textarea
                  id="work-input-desc"
                  rows={3}
                  placeholder="一句话介绍这个作品…"
                  className={`${inputClass} mt-1.5 resize-none leading-relaxed`}
                  value={form.subtitle}
                  onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="work-input-link" className="block text-sm font-medium text-on-surface">
                  作品链接
                </label>
                <input
                  id="work-input-link"
                  type="url"
                  placeholder="https://…（留空表示暂未上线）"
                  className={`${inputClass} mt-1.5`}
                  value={form.externalUrl}
                  onChange={(e) => setForm((p) => ({ ...p, externalUrl: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="work-input-cover" className="block text-sm font-medium text-on-surface">
                  封面图片
                </label>
                <div className="mt-1.5 flex items-start gap-3">
                  <div className="w-24 h-16 rounded-md overflow-hidden shrink-0 bg-surface-container flex items-center justify-center">
                    {form.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.coverUrl} alt="封面预览" className="w-full h-full object-cover" />
                    ) : (
                      <ImageUp className="w-5 h-5 text-on-surface-variant/40" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageUp className="w-3.5 h-3.5" />}
                      {uploading ? "上传中…" : "上传封面"}
                    </button>
                    <input
                      id="work-input-cover"
                      type="url"
                      placeholder="或直接粘贴图片地址 https://…"
                      className={inputClass}
                      value={form.coverUrl}
                      onChange={(e) => setForm((p) => ({ ...p, coverUrl: e.target.value }))}
                    />
                  </div>
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  aria-label="选择封面图片文件"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCoverUpload(file);
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-on-surface-variant/70 mt-1.5">支持 jpg / png / webp / gif，不超过 5MB</p>
              </div>
              <div>
                <label htmlFor="work-input-content" className="block text-sm font-medium text-on-surface">
                  正文内容 <span className="text-xs font-normal text-on-surface-variant/70">（Markdown，展示于作品详情页）</span>
                </label>
                {detailLoading ? (
                  <div className="mt-1.5 h-28 rounded-md bg-surface-container animate-pulse flex items-center justify-center text-xs text-on-surface-variant">
                    正在加载正文…
                  </div>
                ) : (
                  <textarea
                    id="work-input-content"
                    rows={6}
                    placeholder="用 Markdown 介绍这个作品：背景、亮点、技术栈…"
                    className={`${inputClass} mt-1.5 font-mono leading-relaxed`}
                    value={form.content}
                    onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  />
                )}
              </div>
              <div>
                <label htmlFor="work-input-tags" className="block text-sm font-medium text-on-surface">
                  技术标签
                </label>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium bg-primary-container text-primary"
                    >
                      {t}
                      <button
                        type="button"
                        aria-label={`移除标签「${t}」`}
                        onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                        className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-primary/15 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="work-input-tags"
                    type="text"
                    placeholder={tags.length ? "" : "输入标签，回车添加（如：React）"}
                    className={`${inputClass} flex-1 min-w-[140px]`}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "," || e.key === "，") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    onBlur={() => addTag(tagInput)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-outline-variant/15">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="bg-surface-container text-on-surface border-none px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-container-high active:scale-[0.98] transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || detailLoading}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </div>
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
