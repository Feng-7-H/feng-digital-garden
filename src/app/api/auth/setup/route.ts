import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { isInitialized, setSessionCookies } from "@/lib/admin";
import { getSetupKey } from "@/lib/setup-key";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      setup_key?: string;
      email?: string;
      password?: string;
    };

    if (!body.setup_key || body.setup_key !== getSetupKey()) {
      return NextResponse.json({ error: "初始化密钥不正确" }, { status: 403 });
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }
    if (!body.password || body.password.length < 8) {
      return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
    }

    // 入口永久关闭：已存在管理员则拒绝
    if (await isInitialized()) {
      return NextResponse.json({ error: "管理员已初始化，此入口已永久关闭" }, { status: 403 });
    }

    const client = getSupabaseClient();
    const { data, error } = await client.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });
    if (error) throw new Error(`创建管理员失败: ${error.message}`);
    if (!data.user) throw new Error("创建管理员失败");

    // 自动登录
    const { data: sessionData, error: signInErr } = await client.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (signInErr || !sessionData.session) throw new Error(`自动登录失败: ${signInErr?.message ?? ""}`);

    const response = NextResponse.json({ success: true, user_id: data.user.id });
    return setSessionCookies(response, {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
