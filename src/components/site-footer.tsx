"use client";

import { useEffect, useState } from "react";
import {
  AtSign,
  GitBranch,
  Github,
  Globe,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Phone,
  Rss,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";

interface ContactItem {
  label: string;
  value: string;
  icon: string;
}

interface ProfileResp {
  nickname: string;
  contact: ContactItem[];
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
  return CONTACT_ICONS[(item.icon ?? "").toLowerCase()] ?? LinkIcon;
}

/** 由联系方式值推断跳转地址：邮箱 → mailto，其余 → 外链 */
function socialHref(value: string): string {
  if (value.includes("@") && !value.includes("/")) return `mailto:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/**
 * 全站统一页脚：社交图标（由站长在后台「关于我」配置联系方式后生成）+ 版权行。
 * 未配置联系方式时不渲染图标行，避免出现无效占位链接。
 */
export function SiteFooter() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [nickname, setNickname] = useState("枫");

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ profile: ProfileResp }>("/api/profile")
      .then((data) => {
        if (cancelled) return;
        const profile = data?.profile;
        if (profile?.nickname?.trim()) setNickname(profile.nickname.trim());
        if (Array.isArray(profile?.contact)) setContacts(profile.contact);
      })
      .catch(() => {
        /* 页脚为辅助信息，加载失败时保持默认版权行 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-outline-variant/15">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-5 sm:gap-4 sm:px-6 sm:py-8">
        {contacts.length > 0 && (
          <div className="flex items-center gap-2">
            {contacts.slice(0, 4).map((item, idx) => {
              const Icon = iconFor(item);
              const href = socialHref(item.value);
              const isMail = href.startsWith("mailto:");
              return (
                <a
                  key={`${item.label}-${idx}`}
                  href={href}
                  target={isMail ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  aria-label={item.label || "联系方式"}
                  title={item.label || item.value}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-primary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        )}
        <p className="text-[10px] tracking-[0.15em] text-on-surface-variant sm:text-xs sm:tracking-[0.25em]">
          © {year} {nickname} · NOW IS THE TIME
        </p>
      </div>
    </footer>
  );
}
