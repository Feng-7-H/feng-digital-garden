import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAdminSession, applyRefreshedSession } from "@/lib/admin";
import { resolveTagIds, getNoteTags, TagRow } from "@/lib/tags";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getAdminSession(request);
    const isAdmin = Boolean(session);

    const client = getSupabaseClient();
    const { data, error } = await client.from("notes").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`查询笔记失败: ${error.message}`);
    const note = data as { id: string; status: string; [k: string]: unknown } | null;
    if (!note) return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
    if (!isAdmin && note.status !== "published") {
      return NextResponse.json({ error: "笔记不存在" }, { status: 404 });
    }

    const tagMap = await getNoteTags([id]);
    const tags = (tagMap.get(id) ?? []).map((t: TagRow) => ({ id: t.id, name: t.name }));

    const response = NextResponse.json({ note: { ...note, tags } });
    return applyRefreshedSession(response, session?.newSession ?? null);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getAdminSession(request);
    if (!session) return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });

    const body = (await request.json()) as {
      title?: string;
      summary?: string;
      content?: string;
      status?: string;
      tags?: string[];
    };

    const client = getSupabaseClient();
    const { data: current, error: curErr } = await client
      .from("notes")
      .select("id, status, published_at")
      .eq("id", id)
      .maybeSingle();
    if (curErr) throw new Error(`查询笔记失败: ${curErr.message}`);
    if (!current) return NextResponse.json({ error: "笔记不存在" }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) {
      if (!body.title.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
      updates.title = body.title.trim();
    }
    if (body.summary !== undefined) updates.summary = body.summary.trim();
    if (body.content !== undefined) updates.content = body.content;
    if (body.status !== undefined && body.status !== (current as { status: string }).status) {
      updates.status = body.status === "published" ? "published" : "draft";
      updates.published_at =
        body.status === "published" && !(current as { published_at: string | null }).published_at
          ? new Date().toISOString()
          : (current as { published_at: string | null }).published_at;
    }

    const { error } = await client.from("notes").update(updates).eq("id", id);
    if (error) throw new Error(`更新笔记失败: ${error.message}`);

    // 重建标签关联
    if (body.tags !== undefined) {
      const { error: delErr } = await client.from("note_tags").delete().eq("note_id", id);
      if (delErr) throw new Error(`清除旧标签失败: ${delErr.message}`);
      if (body.tags.length > 0) {
        const tagRows = await resolveTagIds(body.tags);
        if (tagRows.length > 0) {
          const { error: relErr } = await client
            .from("note_tags")
            .insert(tagRows.map((t) => ({ note_id: id, tag_id: t.id })));
          if (relErr) throw new Error(`关联标签失败: ${relErr.message}`);
        }
      }
    }

    const response = NextResponse.json({ success: true });
    return applyRefreshedSession(response, session.newSession);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await getAdminSession(request);
    if (!session) return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });

    const client = getSupabaseClient();
    const { data, error } = await client.from("notes").delete().eq("id", id).select("id");
    if (error) throw new Error(`删除笔记失败: ${error.message}`);
    if (!data || data.length === 0) return NextResponse.json({ error: "笔记不存在" }, { status: 404 });

    const response = NextResponse.json({ success: true });
    return applyRefreshedSession(response, session.newSession);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
