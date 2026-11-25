import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAdminSession, applyRefreshedSession } from "@/lib/admin";

export interface MessageRow {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    const isAdmin = Boolean(session);

    const client = getSupabaseClient();
    let query = client
      .from("messages")
      .select("id, name, content, created_at, updated_at, deleted_at")
      .order("created_at", { ascending: false });

    // 站长通过 ?all=1 查看全部记录（含已删除）；公开视图仅未删除
    const { searchParams } = new URL(request.url);
    if (!(isAdmin && searchParams.get("all") === "1")) {
      query = query.is("deleted_at", null);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询留言失败: ${error.message}`);

    const response = NextResponse.json({ messages: data ?? [] });
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
    const body = (await request.json()) as {
      name?: string;
      content?: string;
      visitor_token?: string;
    };
    if (!body.name?.trim()) return NextResponse.json({ error: "请填写昵称" }, { status: 400 });
    if (!body.content?.trim()) return NextResponse.json({ error: "请填写留言内容" }, { status: 400 });
    if (!body.visitor_token) return NextResponse.json({ error: "缺少访客标识" }, { status: 400 });

    const client = getSupabaseClient();
    const { data, error } = await client
      .from("messages")
      .insert({
        name: body.name.trim().slice(0, 50),
        content: body.content.trim(),
        visitor_token: body.visitor_token,
      })
      .select("id")
      .single();
    if (error) throw new Error(`留言失败: ${error.message}`);

    return NextResponse.json({ success: true, id: (data as { id: string }).id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
