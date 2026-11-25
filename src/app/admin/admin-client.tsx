"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Folder, Loader2, MessageCircle, Plus, User } from "lucide-react";
import { Toaster } from "sonner";
import { api } from "@/lib/api";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NotesPanel } from "./notes-panel";
import { WorksPanel } from "./works-panel";
import { ProfilePanel } from "./profile-panel";
import { MessagesPanel } from "./messages-panel";

type TabKey = "notes" | "works" | "profile" | "messages";

const TABS: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: "notes", label: "笔记", icon: FileText },
  { key: "works", label: "作品", icon: Folder },
  { key: "profile", label: "关于我", icon: User },
  { key: "messages", label: "留言", icon: MessageCircle },
];

/** 后台管理：未登录重定向登录页；四 Tab 切换管理笔记 / 作品 / 关于我 / 留言 */
export function AdminClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabKey>("notes");

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ authenticated: boolean }>("/api/auth/me")
      .then((r) => {
        if (cancelled) return;
        if (!r.authenticated) router.replace("/admin-login");
        else setReady(true);
      })
      .catch(() => {
        if (!cancelled) router.replace("/admin-login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-on-surface-variant">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs">正在验证登录状态…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      <SiteHeader />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* 页头 */}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-on-surface">内容管理</h1>
            <p className="text-xs text-on-surface-variant mt-1.5">打理花园里的笔记、作品与「关于我」</p>
          </div>
          <Link
            href="/admin-editor"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新建笔记
          </Link>
        </section>

        {/* 管理对象 Tabs */}
        <section className="mt-8">
          <div
            className="inline-flex items-center gap-1 bg-surface-container rounded-full p-1 overflow-x-auto max-w-full"
            role="tablist"
            aria-label="管理对象切换"
          >
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(key)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 各管理面板 */}
        <div role="tabpanel" aria-label={TABS.find((t) => t.key === tab)?.label}>
          {tab === "notes" && <NotesPanel />}
          {tab === "works" && <WorksPanel />}
          {tab === "profile" && <ProfilePanel />}
          {tab === "messages" && <MessagesPanel />}
        </div>
      </main>

      <SiteFooter />
      <Toaster position="bottom-center" richColors />
    </div>
  );
}
