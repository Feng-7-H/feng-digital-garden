"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Markdown 正文渲染器（数字花园笔记 / 后台编辑器预览共用）。
 * 排版对齐原型 note-detail：衬线标题、苔藓绿行内代码、引用块、GFM 表格与任务列表。
 * 代码块与表格等需要后代选择器的场景通过一次性的 <style> 注入实现。
 */
const mdScopedStyles = `
.md-body pre { margin-top: 1.25rem; background: var(--muted); border-radius: 0.5rem; padding: 1rem 1.25rem; overflow-x: auto; }
.md-body pre code { background: transparent; padding: 0; border-radius: 0; color: var(--foreground); font-family: var(--font-mono); font-size: 0.875rem; line-height: 1.7; }
.md-body :not(pre) > code { background: var(--muted); border-radius: 0.25rem; padding: 0.125rem 0.375rem; font-family: var(--font-mono); font-size: 0.8125rem; color: var(--primary); }
.md-body table { margin-top: 1.25rem; width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.md-body th, .md-body td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; }
.md-body th { background: var(--muted); font-weight: 600; }
.md-body hr { margin-top: 2.5rem; border: 0; border-top: 1px solid var(--border); }
.md-body img { margin-top: 1.25rem; border-radius: 0.75rem; max-width: 100%; height: auto; }
.md-body input[type="checkbox"] { accent-color: var(--primary); margin-right: 0.375rem; }
`;

export function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("md-body text-[15px] text-foreground", className)}>
      <style>{mdScopedStyles}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-10 font-serif text-2xl font-bold text-foreground first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 font-serif text-xl font-bold text-foreground first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-7 font-serif text-base font-semibold text-foreground first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-6 font-serif text-sm font-semibold text-foreground first:mt-0">{children}</h4>
          ),
          p: ({ children }) => <p className="mt-4 leading-relaxed first:mt-0">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-primary/60">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-3 list-decimal space-y-2 pl-6 marker:text-primary/60">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="mt-6 rounded-r-md border-l-4 border-primary/30 bg-muted py-3 pl-4 pr-4 text-muted-foreground [&>p]:mt-0">
              {children}
            </blockquote>
          ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
