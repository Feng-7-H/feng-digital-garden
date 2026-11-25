import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { isInitialized, setSessionCookies } from "@/lib/admin";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "请输入邮箱和密码" }, { status: 400 });
    }
    if (!(await isInitialized())) {
      return NextResponse.json({ error: "尚未初始化管理员账号" }, { status: 403 });
    }

    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error || !data.session) {
      return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    return setSessionCookies(response, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
