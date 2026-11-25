import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    absolute: "枫 · Now is the time",
  },
};

/**
 * 首页：极简标语页。
 * 品牌信息（代号「枫」、主题标语）为站点固定品牌内容；
 * 页脚社交入口由站长在后台「关于我」配置联系方式后生成（见 SiteFooter）。
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-on-surface">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        {/* ============ 首屏标语（极简居中 + 印章/水印/生长枝条点缀） ============ */}
        <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden py-16 text-center">
          {/* 背景水印「寻找」：隶书 letterpress 压印质感，「找」带极淡苔藓绿寓意生机 */}
          <div
            className="pointer-events-none absolute inset-0 select-none overflow-hidden"
            aria-hidden="true"
          >
            <span className="wm-char absolute left-[2%] top-[4%] -rotate-2">寻</span>
            <span className="wm-char wm-char-sprout absolute bottom-[4%] right-[2%] rotate-2">
              找
            </span>
          </div>

          {/* 左上角：站点属性小字（小屏缩小字号保持左右分布） */}
          <p className="rise-in absolute left-0 top-10 text-[9px] tracking-[0.15em] text-on-surface-variant sm:text-xs sm:tracking-[0.3em]">
            个人站 · EST. 2026
          </p>
          {/* 右上角：站点态度小字（小屏缩小字号保持左右分布） */}
          <p className="rise-in rise-in-d1 absolute right-0 top-10 text-[9px] tracking-[0.08em] text-on-surface-variant sm:text-xs sm:tracking-[0.2em]">
            合则闲谈，不合互祝安好
          </p>

          {/* 中央：代号（带朱印）+ 主题标语 */}
          <h1 className="rise-in rise-in-d1 relative inline-block cursor-default select-none font-serif text-[96px] font-bold leading-none text-on-surface transition-transform duration-500 hover:scale-[1.02] sm:text-[136px]">
            枫
            {/* 朱印：苔藓绿方形小印，微倾 3°，像书画落款 */}
            <span
              className="absolute -right-7 bottom-1 flex h-8 w-8 rotate-3 items-center justify-center rounded-sm bg-primary font-serif text-sm font-bold text-on-primary shadow-card sm:-right-10 sm:bottom-2 sm:h-10 sm:w-10 sm:text-base"
              title="枫之印"
            >
              楓
            </span>
          </h1>
          <p className="rise-in rise-in-d2 mt-10 font-serif text-2xl italic text-on-surface sm:text-3xl">
            Now is <span className="text-primary">the time</span>.
          </p>
          <p className="rise-in rise-in-d3 mt-4 text-base tracking-wide text-on-surface-variant sm:text-lg">
            趁年轻，去做你觉得有意义的事情。
          </p>

          {/* 生长枝条：细枝缓缓描画，末端抽出一片小叶 */}
          <svg
            className="rise-in rise-in-d3 mx-auto mt-8 h-10 w-44"
            viewBox="0 0 176 40"
            fill="none"
            aria-hidden="true"
          >
            <path
              pathLength={1}
              className="branch-draw text-primary/70"
              d="M8 34 C 44 32, 76 26, 100 16 S 136 8, 152 8"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <path
              className="leaf-pop text-primary/60"
              d="M100 16 c 6 -9 15 -11 24 -10 c -6 8 -15 11 -24 10 z"
              fill="currentColor"
            />
          </svg>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
