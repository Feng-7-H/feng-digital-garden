/**
 * 轻量 Markdown → HTML 渲染器。
 * 供后台编辑器实时预览与前台笔记详情共用；所有动态文本均先转义再拼装，防止 XSS。
 * 支持语法：标题(#~######)、段落、引用(>)、无序/有序列表、代码块(```)、行内代码(`)、
 * 粗体(**)、斜体(*)、链接([]())、图片(![]())、分割线(---)。
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 仅允许 http(s)/mailto/锚点等安全协议 */
function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed;
  return "#";
}

/** 行内渲染：行内代码 → 图片 → 链接 → 粗体 → 斜体 */
function renderInline(raw: string): string {
  const codes: string[] = [];
  let s = raw.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  s = escapeHtml(s);

  // 图片 ![alt](src)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_m, alt: string, src: string) => {
    return `<img src="${safeUrl(src)}" alt="${alt}" class="max-w-full rounded-md my-2 inline-block" />`;
  });
  // 链接 [text](href)
  s = s.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g,
    (_m, text: string, href: string) => {
      return `<a href="${safeUrl(href)}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary">${text}</a>`;
    }
  );
  // 粗体 / 斜体
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em class="italic">$2</em>');

  // 还原行内代码
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => {
    const code = escapeHtml(codes[Number(i)] ?? "");
    return `<code class="px-1.5 py-0.5 rounded-sm bg-surface-container text-[0.85em] font-mono text-on-surface">${code}</code>`;
  });
  return s;
}

const HEADING_CLASS: Record<number, string> = {
  1: "font-serif text-2xl font-bold text-on-surface mt-2 mb-4",
  2: "font-serif text-xl font-bold text-on-surface mt-6 mb-3",
  3: "font-serif text-lg font-semibold text-on-surface mt-5 mb-2",
  4: "text-base font-semibold text-on-surface mt-4 mb-2",
  5: "text-sm font-semibold text-on-surface mt-4 mb-2",
  6: "text-sm font-semibold text-on-surface-variant mt-4 mb-2",
};

/** 块级渲染：逐行扫描 */
export function renderMarkdown(md: string): string {
  const lines = (md ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 围栏代码块 ```
    if (line.trimStart().startsWith("```")) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // 跳过收尾 ```
      out.push(
        `<pre class="bg-surface-container rounded-md p-4 text-xs font-mono leading-relaxed text-on-surface/90 overflow-x-auto mb-4"><code>${escapeHtml(buf.join("\n"))}</code></pre>`
      );
      continue;
    }

    // 分割线
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr class="border-0 border-t border-outline-variant/30 my-6" />');
      i += 1;
      continue;
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level} class="${HEADING_CLASS[level]}">${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // 引用（连续 > 行合并）
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(
        `<blockquote class="border-l-4 border-primary/40 bg-primary-container/40 rounded-r-md px-4 py-3 mb-4"><p class="text-sm leading-relaxed text-on-surface-variant italic font-serif">${renderInline(buf.join(" "))}</p></blockquote>`
      );
      continue;
    }

    // 无序列表（连续行合并；支持嵌套缩进两层）
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(renderInline(lines[i].replace(/^\s*[-*+]\s+/, "")));
        i += 1;
      }
      out.push(
        `<ul class="list-disc pl-5 space-y-1.5 text-sm text-on-surface mb-4">${items
          .map((it) => `<li class="leading-relaxed">${it}</li>`)
          .join("")}</ul>`
      );
      continue;
    }

    // 有序列表
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(renderInline(lines[i].replace(/^\s*\d+[.)]\s+/, "")));
        i += 1;
      }
      out.push(
        `<ol class="list-decimal pl-5 space-y-1.5 text-sm text-on-surface mb-4">${items
          .map((it) => `<li class="leading-relaxed">${it}</li>`)
          .join("")}</ol>`
      );
      continue;
    }

    // 空行
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // 段落（连续非空行合并为一段，段内换行 <br>）
    const buf: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(#{1,6}\s|>\s?|[-*+]\s|\d+[.)]\s|```|-{3,}|\*{3,}|_{3,})/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    out.push(
      `<p class="text-sm leading-relaxed text-on-surface mb-4">${buf
        .map((l) => renderInline(l))
        .join("<br />")}</p>`
    );
  }

  return out.join("\n");
}

/** 从 Markdown 提取纯文本摘要（去标题符/标记符/代码块，截前 n 字） */
export function summarizeMarkdown(md: string, max = 100): string {
  const text = (md ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
