import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAdminSession, applyRefreshedSession } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("works")
      .select("id, title, subtitle, cover_url, external_url, tags, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`查询作品失败: ${error.message}`);

    const session = await getAdminSession(request);
    const response = NextResponse.json({ works: data ?? [] });
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
      subtitle?: string;
      cover_url?: string;
      content?: string;
      external_url?: string;
      tags?: string[];
    };
    if (!body.title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });

    const client = getSupabaseClient();
    const { data, error } = await client
      .from("works")
      .insert({
        title: body.title.trim(),
        subtitle: body.subtitle?.trim() ?? "",
        cover_url: body.cover_url || null,
        content: body.content ?? "",
        external_url: body.external_url?.trim() || null,
        tags: body.tags ?? [],
      })
      .select("id")
      .single();
    if (error) throw new Error(`创建作品失败: ${error.message}`);

    const response = NextResponse.json({ success: true, id: (data as { id: string }).id });
    return applyRefreshedSession(response, session.newSession);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
