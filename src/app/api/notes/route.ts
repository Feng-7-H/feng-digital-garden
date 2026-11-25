import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAdminSession, applyRefreshedSession } from "@/lib/admin";
import { resolveTagIds, getNoteTags, TagRow } from "@/lib/tags";

export interface NoteRow {
  id: string;
  title: string;
  summary: string;
  content: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    const isAdmin = Boolean(session);
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");
    const q = searchParams.get("q")?.trim();

    const client = getSupabaseClient();
    let query = client.from("notes").select("*").order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    if (!isAdmin) query = query.eq("status", "published");

    const notes = (await query) as unknown as { data: NoteRow[] | null; error: { message: string } | null };
    if (notes.error) throw new Error(`查询笔记失败: ${notes.error.message}`);
    let rows = notes.data ?? [];

    // 标签筛选
    if (tag) {
      const { data: tagRow, error: tagErr } = await client.from("tags").select("id").eq("name", tag).maybeSingle();
      if (tagErr) throw new Error(`查询标签失败: ${tagErr.message}`);
      if (tagRow) {
        const { data: rels, error: relErr } = await client.from("note_tags").select("note_id").eq("tag_id", (tagRow as { id: string }).id);
        if (relErr) throw new Error(`查询标签关联失败: ${relErr.message}`);
        const ids = (rels ?? []).map((r) => (r as { note_id: string }).note_id);
        rows = ids.length === 0 ? [] : rows.filter((n) => ids.includes(n.id));
      } else {
        rows = [];
      }
    }

    // 关键词搜索（标题/摘要）
    if (q) {
      const lower = q.toLowerCase();
      rows = rows.filter(
        (n) => n.title.toLowerCase().includes(lower) || n.summary.toLowerCase().includes(lower)
      );
    }

    // 附加标签
    const tagMap = await getNoteTags(rows.map((n) => n.id));
    const result = rows.map((n) => ({
      ...n,
      content: undefined,
      tags: (tagMap.get(n.id) ?? []).map((t: TagRow) => ({ id: t.id, name: t.name })),
    }));

    const response = NextResponse.json({ notes: result });
    return applyRefreshedSession(response, session?.newSession ?? null);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });

    const body = (await request.json()) as {
      title?: string;
      summary?: string;
      content?: string;
      status?: string;
      tags?: string[];
    };
    if (!body.title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    const status = body.status === "published" ? "published" : "draft";

    const client = getSupabaseClient();
    const { data, error } = await client
      .from("notes")
      .insert({
        title: body.title.trim(),
        summary: body.summary?.trim() ?? "",
        content: body.content ?? "",
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`创建笔记失败: ${error.message}`);
    const noteId = (data as { id: string }).id;

    // 关联标签
    if (body.tags?.length) {
      const tagRows = await resolveTagIds(body.tags);
      if (tagRows.length > 0) {
        const { error: relErr } = await client
          .from("note_tags")
          .insert(tagRows.map((t) => ({ note_id: noteId, tag_id: t.id })));
        if (relErr) throw new Error(`关联标签失败: ${relErr.message}`);
      }
    }

    const response = NextResponse.json({ success: true, id: noteId });
    return applyRefreshedSession(response, session.newSession);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
