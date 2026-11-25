import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/** 忘记密码：向邮箱发送 Supabase Auth 重置邮件 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    const client = getSupabaseClient();
    const { error } = await client.auth.resetPasswordForEmail(body.email.trim());
    if (error) {
      return NextResponse.json({ error: `发送重置邮件失败: ${error.message}` }, { status: 400 });
    }
    // 不区分邮箱是否存在，避免账号枚举
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
