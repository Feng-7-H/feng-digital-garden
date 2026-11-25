import { NextRequest, NextResponse } from "next/server";
import { isInitialized, getAdminSession } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    const initialized = await isInitialized();
    // 附带返回当前请求是否为管理员会话（供前台「编辑」入口等按登录态渲染）
    let authenticated = false;
    try {
      const session = await getAdminSession(request);
      authenticated = Boolean(session);
    } catch {
      authenticated = false;
    }
    return NextResponse.json({ initialized, authenticated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
