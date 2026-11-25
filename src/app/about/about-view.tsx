"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  AtSign,
  Copy,
  GitBranch,
  Github,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Rss,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** 与 /api/profile 返回结构一致 */
interface ContactItem {
  label: string;
  value: string;
  icon: string;
}

interface ProfileData {
  nickname: string;
  headline: string;
  bio: string;
  avatar_url: string | null;
  skills: string[];
  contact: ContactItem[];
}

/** 与 /api/works 返回结构一致 */
interface WorkItem {
  id: string;
  title: string;
  subtitle: string;
  cover_url: string | null;
  tags: string[];
}

/** 联系方式 icon 字段 → lucide 图标映射 */
const CONTACT_ICONS: Record<string, LucideIcon> = {
  mail: Mail,
  email: Mail,
  at: AtSign,
  github: Github,
  "git-branch": GitBranch,
  rss: Rss,
  link: LinkIcon,
  globe: Globe,
  wechat: MessageCircle,
  message: MessageCircle,
  phone: Phone,
};

function iconFor(item: ContactItem): LucideIcon {
  const byIcon = CONTACT_ICONS[(item.icon ?? "").toLowerCase()];
  if (byIcon) return byIcon;
  const label = (item.label ?? "").toLowerCase();
  if (label.includes("mail") || label.includes("邮箱")) return Mail;
  if (label.includes("github")) return Github;
  if (label.includes("rss")) return Rss;
  if (label.includes("微信") || label.includes("wechat")) return MessageCircle;
  if (label.includes("电话") || label.includes("phone")) return Phone;
  return LinkIcon;
}

/** 复制文本到剪贴板：优先 Clipboard API，不可用时降级 execCommand */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 降级到 execCommand */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * 关于我：个人简介 + 技能标签 + 作品列表 + 联系方式。
 * 全部内容来自后台录入（/api/profile、/api/works），未录入时展示真实空态；
 * 「编辑」浮动按钮仅站长登录后渲染。
 */
export function AboutView() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [works, setWorks] = useState<WorkItem[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [brokenCovers, setBrokenCovers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ profile: ProfileData }>("/api/profile")
      .then((d) => {
        if (!cancelled) setProfile(d.profile);
      })
      .catch(() => {
        if (!cancelled) setProfileFailed(true);
      });
    api
      .get<{ works: WorkItem[] }>("/api/works")
      .then((d) => {
        if (!cancelled) setWorks(Array.isArray(d.works) ? d.works : []);
      })
      .catch(() => {
        if (!cancelled) setWorks([]);
      });
    api
      .get<{ authenticated?: boolean }>("/api/auth/status")
      .then((d) => {
        if (!cancelled) setIsAdmin(Boolean(d.authenticated));
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = useCallback(async (value: string) => {
    const ok = await copyText(value);
    if (ok) toast.success("已复制到剪贴板");
    else toast.error("复制失败，请手动复制");
  }, []);

  const nickname = profile?.nickname?.trim() || "枫";
  const headline = profile?.headline?.trim() ?? "";
  const bioLines = (profile?.bio ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const skills = profile?.skills ?? [];
  const contacts = profile?.contact ?? [];
  const avatarUrl = profile?.avatar_url ?? null;
  const workList = works ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-on-surface">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-14">
          {/* ===================== 个人简介区 ===================== */}
          <section
            id="profile-section"
            className="grid grid-cols-1 items-center gap-8 text-center md:grid-cols-[auto_1fr] md:items-start md:gap-12 md:text-left"
          >
            {/* 左侧：站长头像（后台「关于我」上传；未上传时展示昵称首字代章） */}
            <div className="flex shrink-0 justify-center md:block">
              {avatarUrl && !avatarBroken ? (
                <img
                  src={avatarUrl}
                  alt={`${nickname}的头像`}
                  onError={() => setAvatarBroken(true)}
                  className="h-36 w-36 rounded-full border border-outline-variant/20 object-cover shadow-card md:h-44 md:w-44"
                />
              ) : (
                <div className="flex h-36 w-36 items-center justify-center rounded-full border border-outline-variant/20 bg-primary-container shadow-card md:h-44 md:w-44">
                  <span className="font-serif text-5xl font-bold text-primary">
                    {nickname.slice(0, 1)}
                  </span>
                </div>
              )}
            </div>

            {/* 右侧：名字 / 头衔 / 介绍 / 技能 */}
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">{nickname}</h1>
              {headline && (
                <p className="mt-1.5 text-sm text-on-surface-variant">{headline}</p>
              )}

              {/* 简介：站长后台录入，多行分段；空态展示引导文案 */}
              <div className="mt-5">
                {bioLines.length > 0 ? (
                  <div className="space-y-3.5 text-sm leading-relaxed text-on-surface/90">
                    {bioLines.map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                ) : profile || profileFailed ? (
                  <div className="rounded-lg border border-dashed border-outline-variant/50 bg-surface-container/60 px-5 py-6 text-sm text-on-surface-variant">
                    这里还很安静——站长还没有写下自我介绍。
                  </div>
                ) : (
                  <div className="animate-pulse space-y-2.5">
                    <div className="h-4 w-full rounded bg-surface-container" />
                    <div className="h-4 w-5/6 rounded bg-surface-container" />
                    <div className="h-4 w-2/3 rounded bg-surface-container" />
                  </div>
                )}
              </div>

              {/* 技能标签：未配置时不渲染 */}
              {skills.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-surface-container px-3 py-1 text-xs text-on-surface-variant"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ===================== 作品集区 ===================== */}
          <section id="works-section">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <h2 className="font-serif text-xl font-bold text-on-surface">作品</h2>
                <span className="text-xs uppercase tracking-[0.2em] text-on-surface-variant/60">
                  Works
                </span>
              </div>
              {workList.length > 0 && (
                <span className="text-xs text-on-surface-variant/50">
                  共 {workList.length} 件 · 持续耕作中
                </span>
              )}
            </div>

            {works === null ? (
              /* 加载态：卡片骨架屏 */
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse overflow-hidden rounded-lg bg-surface shadow-card"
                  >
                    <div className="h-44 w-full bg-surface-container" />
                    <div className="space-y-2.5 p-5">
                      <div className="h-4 w-1/3 rounded bg-surface-container" />
                      <div className="h-3.5 w-3/4 rounded bg-surface-container" />
                    </div>
                  </div>
                ))}
              </div>
            ) : workList.length === 0 ? (
              /* 空态：暂无作品 */
              <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-outline-variant/50 bg-surface/60 px-6 py-14 text-center">
                <Sprout className="h-8 w-8 text-primary/60" />
                <p className="text-sm font-medium text-on-surface">作品集还在耕耘中</p>
                <p className="text-xs text-on-surface-variant">
                  站长还没有发布作品，敬请期待。
                </p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                {workList.map((work) => {
                  const tags = work.tags ?? [];
                  const showCover = Boolean(work.cover_url) && !brokenCovers[work.id];
                  return (
                    <Link
                      key={work.id}
                      href={`/work-detail?work_id=${work.id}`}
                      className="group block overflow-hidden rounded-lg bg-surface shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
                    >
                      {/* 作品封面：后台「作品」上传；未上传或加载失败时展示占位图 */}
                      {showCover ? (
                        <img
                          src={work.cover_url ?? ""}
                          alt={`${work.title}封面`}
                          loading="lazy"
                          onError={() =>
                            setBrokenCovers((m) => ({ ...m, [work.id]: true }))
                          }
                          className="h-44 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center bg-surface-container">
                          <ImageIcon className="h-8 w-8 text-on-surface-variant/40" />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-serif text-base font-semibold text-on-surface transition-colors group-hover:text-primary">
                            {work.title}
                          </h3>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-on-surface-variant/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                        {work.subtitle && (
                          <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
                            {work.subtitle}
                          </p>
                        )}
                        {tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* ===================== 联系方式区 ===================== */}
          <section id="contact-section">
            <div className="flex items-baseline gap-3">
              <h2 className="font-serif text-xl font-bold text-on-surface">联系</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-on-surface-variant/60">
                Contact
              </span>
            </div>

            {contacts.length > 0 ? (
              <>
                <div className="mt-5 max-w-xl space-y-2.5">
                  {contacts.map((item, idx) => {
                    const Icon = iconFor(item);
                    return (
                      <button
                        key={`${item.label}-${idx}`}
                        type="button"
                        onClick={() => handleCopy(item.value)}
                        className="flex w-full items-center gap-3 rounded-lg bg-surface-container px-4 py-3 text-left transition-all hover:bg-surface-container-high active:scale-[0.99]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface">
                          <Icon className="h-4 w-4 text-primary" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs text-on-surface-variant">
                            {item.label}
                          </span>
                          <span className="block truncate text-sm text-on-surface">
                            {item.value}
                          </span>
                        </span>
                        <Copy className="h-4 w-4 shrink-0 text-on-surface-variant/40" />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-on-surface-variant/60">
                  点击任意一项，即可复制到剪贴板
                </p>
              </>
            ) : profile || profileFailed ? (
              <p className="mt-5 text-sm text-on-surface-variant">
                站长还没有公开联系方式。
              </p>
            ) : (
              <div className="mt-5 max-w-xl animate-pulse space-y-2.5">
                <div className="h-14 rounded-lg bg-surface-container" />
                <div className="h-14 rounded-lg bg-surface-container" />
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />

      {/* 编辑入口浮动按钮：仅站长登录后渲染，访客不可见；点击进入后台管理 */}
      {isAdmin && (
        <Link
          href="/admin"
          title="编辑内容（仅站长本人可见）"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-on-primary shadow-float transition-all hover:-translate-y-0.5"
        >
          <Pencil className="h-4 w-4" />
          <span className="text-sm font-medium">编辑</span>
        </Link>
      )}
    </div>
  );
}
