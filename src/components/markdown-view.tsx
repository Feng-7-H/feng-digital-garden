"use client";

/* eslint-disable @next/next/no-img-element */

import { Fragment, type ReactNode } from "react";

type ImageClickHandler = (src: string, alt: string) => void;

/** 行内 Markdown 渲染：图片 / 链接 / 加粗 / 斜体 / 行内代码 */
function renderInline(text: string, onImageClick?: ImageClickHandler): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(!\[[^\]]*\]\([^)]+\))|(\[[^\]]+\]\([^)]+\))|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(`[^`]+`)/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    }
    const tok = m[0];
    if (tok.startsWith("![")) {
      // ![alt](src)
      const alt = tok.slice(2, tok.indexOf("]"));
      const src = tok.slice(tok.indexOf("](") + 2, -1);
      nodes.push(
        <img
          key={key++}
          src={src}
          alt={alt}
          onClick={onImageClick ? () => onImageClick(src, alt) : undefined}
          className={`inline-block max-w-full rounded-lg align-middle ${
            onImageClick ? "cursor-zoom-in" : ""
          }`}
        />
      );
    } else if (tok.startsWith("[")) {
      // [label](href)
      const label = tok.slice(1, tok.indexOf("]"));
      const href = tok.slice(tok.indexOf("](") + 2, -1);
      nodes.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-primary hover:underline"
        >
          {label}
        </a>
      );
    } else if (tok.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>
      );
    } else if (tok.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded-sm bg-surface-container px-1 py-0.5 font-mono text-xs"
        >
          {tok.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }
  return nodes;
}

const BLOCK_START_RE = /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```|!\[)/;
const HR_RE = /^(-{3,}|={3,}|\*{3,})$/;

interface MarkdownViewProps {
  content: string;
  /** 点击正文图片时回调（用于打开灯箱）；不传则图片不可点击 */
  onImageClick?: ImageClickHandler;
  className?: string;
}

/**
 * 轻量 Markdown 渲染器（无第三方依赖）。
 * 支持：标题(1-4) / 段落 / 无序有序列表 / 引用 / 围栏代码块 / 分隔线 / 独立成行图片 / 行内格式。
 * 样式对齐作品详情原型：衬线标题、小号正文、苔藓绿列表圆点。
 */
export function MarkdownView({ content, onImageClick, className }: MarkdownViewProps) {
  const lines = (content ?? "").replace(/\r\n?/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;
  let prevWasParagraph = false;

  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) {
      i++;
      prevWasParagraph = false;
      continue;
    }

    // 围栏代码块 ```
    if (t.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // 跳过收尾 ```
      nodes.push(
        <pre
          key={key++}
          className="my-4 overflow-x-auto rounded-lg bg-surface-container px-4 py-3 font-mono text-xs leading-6 text-on-surface"
        >
          <code>{buf.join("\n")}</code>
        </pre>
      );
      prevWasParagraph = false;
      continue;
    }

    // 标题
    const heading = /^(#{1,6})\s+(.+)$/.exec(t);
    if (heading) {
      const level = heading[1].length;
      const inner = renderInline(heading[2], onImageClick);
      if (level === 1) {
        nodes.push(
          <h1 key={key++} className="mb-3 mt-10 font-serif text-2xl font-bold text-on-surface">
            {inner}
          </h1>
        );
      } else if (level === 2) {
        nodes.push(
          <h2 key={key++} className="mb-3 mt-10 font-serif text-xl font-bold text-on-surface">
            {inner}
          </h2>
        );
      } else if (level === 3) {
        nodes.push(
          <h3 key={key++} className="mb-2 mt-8 font-serif text-lg font-bold text-on-surface">
            {inner}
          </h3>
        );
      } else {
        nodes.push(
          <h4 key={key++} className="mb-2 mt-6 text-base font-semibold text-on-surface">
            {inner}
          </h4>
        );
      }
      prevWasParagraph = false;
      i++;
      continue;
    }

    // 分隔线
    if (HR_RE.test(t)) {
      nodes.push(<hr key={key++} className="my-8 border-outline-variant/40" />);
      prevWasParagraph = false;
      i++;
      continue;
    }

    // 独立成行的图片 → 可点击放大
    const standaloneImg = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(t);
    if (standaloneImg) {
      const alt = standaloneImg[1];
      const src = standaloneImg[2];
      nodes.push(
        <figure key={key++} className="mt-6">
          <img
            src={src}
            alt={alt}
            onClick={onImageClick ? () => onImageClick(src, alt) : undefined}
            className={`w-full select-none rounded-xl shadow-card ${
              onImageClick ? "cursor-zoom-in" : ""
            }`}
          />
        </figure>
      );
      prevWasParagraph = false;
      i++;
      continue;
    }

    // 引用
    if (t.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      nodes.push(
        <blockquote
          key={key++}
          className="my-4 border-l-2 border-primary/40 pl-4 text-sm italic leading-7 text-on-surface-variant"
        >
          {renderInline(buf.join(" "), onImageClick)}
        </blockquote>
      );
      prevWasParagraph = false;
      continue;
    }

    // 无序列表
    if (/^[-*+]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul
          key={key++}
          className="my-4 list-disc space-y-2 pl-5 text-sm leading-7 text-on-surface marker:text-primary/70"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, onImageClick)}</li>
          ))}
        </ul>
      );
      prevWasParagraph = false;
      continue;
    }

    // 有序列表
    if (/^\d+[.)]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
        i++;
      }
      nodes.push(
        <ol
          key={key++}
          className="my-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-on-surface marker:text-on-surface-variant"
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, onImageClick)}</li>
          ))}
        </ol>
      );
      prevWasParagraph = false;
      continue;
    }

    // 段落：合并连续普通文本行
    const buf: string[] = [t];
    i++;
    while (i < lines.length) {
      const nt = lines[i].trim();
      if (!nt || BLOCK_START_RE.test(nt) || HR_RE.test(nt)) break;
      buf.push(nt);
      i++;
    }
    nodes.push(
      <p
        key={key++}
        className={`text-sm leading-7 text-on-surface ${prevWasParagraph ? "mt-3" : ""}`}
      >
        {renderInline(buf.join("\n"), onImageClick)}
      </p>
    );
    prevWasParagraph = true;
  }

  return <div className={className}>{nodes}</div>;
}
