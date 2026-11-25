import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAdminSession, applyRefreshedSession } from "@/lib/admin";
import { MESSAGE_EDIT_WINDOW_MS } from "@/lib/message";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function loadMessage(id: string) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("messages")
    .select("id, name, content, visitor_token, created_at, updated_at, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`查询留言失败: ${error.message}`);
  return data as
    | { id: string; name: string; content: string; visitor_token: string; created_at: string; updated_at: string | null; deleted_at: string | null }
    | null;
}

function withinWindow(created_at: string): boolean {
  return Date.now() - new Date(created_at).getTime() < MESSAGE_EDIT_WINDOW_MS;
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as { name?: string; content?: string; visitor_token?: string };
    if (!body.visitor_token) return NextResponse.json({ error: "缺少访客标识" }, { status: 400 });

    const message = await loadMessage(id);
    if (!message || message.deleted_at) return NextResponse.json({ error: "留言不存在" }, { status: 404 });

    const session = await getAdminSession(request);
    const isAdmin = Boolean(session);

    if (!isAdmin) {
      if (message.visitor_token !== body.visitor_token) {
        return NextResponse.json({ error: "只能修改自己的留言" }, { status: 403 });
      }
      if (!withinWindow(message.created_at)) {
        return NextResponse.json({ error: "已超过 30 分钟，无法修改" }, { status: 403 });
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined && body.name.trim()) updates.name = body.name.trim().slice(0, 50);
    if (body.content !== undefined && body.content.trim()) updates.content = body.content.trim();

    const client = getSupabaseClient();
    const { error } = await client.from("messages").update(updates).eq("id", id);
    if (error) throw new Error(`修改留言失败: ${error.message}`);

    const response = NextResponse.json({ success: true });
    return applyRefreshedSession(response, session?.newSession ?? null);
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
    const message = await loadMessage(id);
    if (!message) return NextResponse.json({ error: "留言不存在" }, { status: 404 });

    const session = await getAdminSession(request);
    const client = getSupabaseClient();

    if (session) {
      // 站长删除：硬删除，同步从前台移除（也可彻底清除访客已软删除的记录）
      const { error: delErr } = await client.from("messages").delete().eq("id", id);
      if (delErr) throw new Error(`删除留言失败: ${delErr.message}`);
      const response = NextResponse.json({ success: true });
      return applyRefreshedSession(response, session.newSession);
    }

    if (message.deleted_at) return NextResponse.json({ error: "留言不存在" }, { status: 404 });

    {
      // 访客删除：从 body 或 query 取 visitor_token，校验归属与时间窗
      let token = "";
      try {
        const body = (await request.json()) as { visitor_token?: string };
        token = body.visitor_token ?? "";
      } catch {
        token = new URL(request.url).searchParams.get("visitor_token") ?? "";
      }
      if (!token || message.visitor_token !== token) {
        return NextResponse.json({ error: "只能删除自己的留言" }, { status: 403 });
      }
      if (!withinWindow(message.created_at)) {
        return NextResponse.json({ error: "已超过 30 分钟，无法删除" }, { status: 403 });
      }
    }

    // 软删除：站长可在后台查看记录
    const { error } = await client
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`删除留言失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
