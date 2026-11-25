"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ImageUp, Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ContactItem, ProfileData } from "./types";

const inputClass =
  "w-full bg-surface-container border-none rounded-md px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";

/** 关于我编辑：头像上传、昵称、头衔、简介、技能标签、联系方式 */
export function ProfilePanel() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [contacts, setContacts] = useState<ContactItem[]>([{ label: "", value: "", icon: "" }]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const r = await api.get<{ profile: ProfileData }>("/api/profile");
      const p = r.profile;
      setAvatarUrl(p.avatar_url);
      setNickname(p.nickname ?? "");
      setHeadline(p.headline ?? "");
      setBio(p.bio ?? "");
      setSkills(p.skills ?? []);
      setContacts(
        p.contact?.length ? p.contact.map((c) => ({ label: c.label ?? "", value: c.value ?? "", icon: c.icon ?? "" })) : [{ label: "", value: "", icon: "" }]
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "加载档案失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAvatarUpload(file: File) {
    if (uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post<{ url: string }>("/api/upload", fd);
      setAvatarUrl(r.url);
      toast.success("头像上传成功，保存后生效");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  function addSkill(raw: string) {
    const val = raw.trim().replace(/[,，]/g, "");
    if (!val) return;
    if (skills.includes(val)) {
      toast.warning(`技能「${val}」已存在`);
      setSkillInput("");
      return;
    }
    setSkills((prev) => [...prev, val]);
    setSkillInput("");
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await api.put("/api/profile", {
        nickname: nickname.trim(),
        headline: headline.trim(),
        bio,
        avatar_url: avatarUrl,
        skills,
        contact: contacts
          .map((c) => ({ label: c.label.trim(), value: c.value.trim(), icon: c.icon }))
          .filter((c) => c.value),
      });
      toast.success("已保存，前台「关于我」页即时生效");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mt-6" aria-label="关于我编辑">
        <div className="bg-surface rounded-xl shadow-card p-6 sm:p-8 max-w-3xl" aria-hidden="true">
          <div className="h-5 w-40 bg-surface-container rounded animate-pulse" />
          <div className="h-20 w-20 rounded-full bg-surface-container mt-6 animate-pulse" />
          <div className="h-10 w-full bg-surface-container rounded mt-6 animate-pulse" />
          <div className="h-24 w-full bg-surface-container rounded mt-4 animate-pulse" />
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="mt-6" aria-label="关于我编辑">
        <div className="bg-surface rounded-xl shadow-card px-6 py-12 max-w-3xl text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-3 text-xs text-primary hover:underline">
            重新加载
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6" aria-label="关于我编辑">
      <div className="bg-surface rounded-xl shadow-card p-6 sm:p-8 max-w-3xl">
        <p className="text-xs text-on-surface-variant">
          编辑「关于我」页的展示内容 · 仅站长本人可编辑，前台访客只读
        </p>

        <div className="space-y-6 mt-6">
          {/* 头像上传：存对象存储（Supabase Storage），前台「关于我」页展示，可随时替换 */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-card bg-surface-container flex items-center justify-center shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="头像预览" className="w-full h-full object-cover" />
              ) : (
                <ImageUp className="w-6 h-6 text-on-surface-variant/40" aria-hidden="true" />
              )}
            </div>
            <div>
              <span className="block text-sm font-medium text-on-surface">头像</span>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "上传中…" : "上传头像"}
                </button>
                <span className="text-xs text-on-surface-variant/70">支持 jpg / png，上传后可随时替换</span>
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              aria-label="选择头像图片文件"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAvatarUpload(file);
                e.target.value = "";
              }}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="profile-nickname" className="block text-sm font-medium text-on-surface">
                昵称
              </label>
              <input
                id="profile-nickname"
                type="text"
                placeholder="你的昵称"
                className={`${inputClass} mt-1.5`}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="profile-headline" className="block text-sm font-medium text-on-surface">
                头衔
              </label>
              <input
                id="profile-headline"
                type="text"
                placeholder="一句话介绍你的身份"
                className={`${inputClass} mt-1.5`}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-bio" className="block text-sm font-medium text-on-surface">
              个人简介
            </label>
            <textarea
              id="profile-bio"
              rows={5}
              placeholder="写一段介绍自己的文字…"
              className={`${inputClass} mt-1.5 resize-none leading-relaxed`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="profile-skill-input" className="block text-sm font-medium text-on-surface">
              技能标签
            </label>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium bg-primary-container text-primary"
                >
                  {s}
                  <button
                    type="button"
                    aria-label={`移除「${s}」`}
                    onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                    className="w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-primary/15 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {!skills.length && <span className="text-xs text-on-surface-variant/60">暂无技能标签</span>}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <input
                id="profile-skill-input"
                type="text"
                placeholder="输入新技能，回车或点击添加"
                className={inputClass}
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill(skillInput);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => addSkill(skillInput)}
                className="bg-surface-container text-on-surface border-none px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-container-high active:scale-[0.98] transition-all inline-flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                添加
              </button>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-on-surface">联系方式</span>
            <p className="text-xs text-on-surface-variant/70 mt-1">
              展示于「关于我」页，前台点击可复制（如：邮箱 / GitHub / 微信）
            </p>
            <div className="space-y-2 mt-2">
              {contacts.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="类型（如：邮箱）"
                    aria-label={`联系方式 ${idx + 1} 类型`}
                    className={`${inputClass} w-32 shrink-0`}
                    value={c.label}
                    onChange={(e) =>
                      setContacts((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                    }
                  />
                  <input
                    type="text"
                    placeholder="内容（如：hi@example.com）"
                    aria-label={`联系方式 ${idx + 1} 内容`}
                    className={`${inputClass} flex-1`}
                    value={c.value}
                    onChange={(e) =>
                      setContacts((prev) => prev.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))
                    }
                  />
                  <button
                    type="button"
                    aria-label={`删除联系方式 ${idx + 1}`}
                    onClick={() => setContacts((prev) => prev.filter((_, i) => i !== idx))}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-md text-on-surface-variant hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setContacts((prev) => [...prev, { label: "", value: "", icon: "" }])}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus className="w-3 h-3" />
              添加联系方式
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 mt-8 pt-6 border-t border-outline-variant/15">
          <p className="text-xs text-on-surface-variant mr-auto">保存后立即生效于前台页面</p>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            保存
          </button>
        </div>
      </div>
    </section>
  );
}
