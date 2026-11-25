import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAdminSession, applyRefreshedSession } from "@/lib/admin";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const client = getSupabaseClient();
    const { data, error } = await client.from("works").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`查询作品失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: "作品不存在" }, { status: 404 });

    const session = await getAdminSession(request);
    const response = NextResponse.json({ work: data });
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
      subtitle?: string;
      cover_url?: string;
      content?: string;
      external_url?: string;
      tags?: string[];
    };

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) {
      if (!body.title.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
      updates.title = body.title.trim();
    }
    if (body.subtitle !== undefined) updates.subtitle = body.subtitle.trim();
    if (body.cover_url !== undefined) updates.cover_url = body.cover_url || null;
    if (body.content !== undefined) updates.content = body.content;
    if (body.external_url !== undefined) updates.external_url = body.external_url?.trim() || null;
    if (body.tags !== undefined) updates.tags = body.tags;

    const client = getSupabaseClient();
    const { data, error } = await client.from("works").update(updates).eq("id", id).select("id");
    if (error) throw new Error(`更新作品失败: ${error.message}`);
    if (!data || data.length === 0) return NextResponse.json({ error: "作品不存在" }, { status: 404 });

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
    const { data, error } = await client.from("works").delete().eq("id", id).select("id");
    if (error) throw new Error(`删除作品失败: ${error.message}`);
    if (!data || data.length === 0) return NextResponse.json({ error: "作品不存在" }, { status: 404 });

    const response = NextResponse.json({ success: true });
    return applyRefreshedSession(response, session.newSession);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
