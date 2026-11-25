"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sprout } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "首页" },
  { href: "/garden", label: "数字花园" },
  { href: "/about", label: "关于我" },
];

const ADMIN_CLICK_TARGET = 5;
const ADMIN_CLICK_RESET_MS = 2000;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const adminClickCount = useRef(0);
  const adminClickTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (adminClickTimer.current !== null) {
        window.clearTimeout(adminClickTimer.current);
      }
    };
  }, []);

  function handleAdminEntry() {
    if (adminClickTimer.current !== null) {
      window.clearTimeout(adminClickTimer.current);
    }

    adminClickCount.current += 1;
    if (adminClickCount.current >= ADMIN_CLICK_TARGET) {
      adminClickCount.current = 0;
      adminClickTimer.current = null;
      router.push("/admin-login");
      return;
    }

    adminClickTimer.current = window.setTimeout(() => {
      adminClickCount.current = 0;
      adminClickTimer.current = null;
    }, ADMIN_CLICK_RESET_MS);
  }

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-outline-variant/15">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="返回首页">
          <Sprout className="w-5 h-5 text-primary" />
          <span className="font-serif font-bold text-xl text-foreground">枫</span>
          <span className="hidden sm:inline text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
            Now is the time
          </span>
        </Link>
        <nav className="flex items-center gap-0.5 sm:gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors sm:px-3 sm:py-1.5 sm:text-sm ${
                pathname === item.href
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleAdminEntry}
            className="ml-1 cursor-default rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors sm:ml-2 sm:px-4 sm:py-2 sm:text-sm"
          >
            后台管理
          </button>
        </nav>
      </div>
    </header>
  );
}
