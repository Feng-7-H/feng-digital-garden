import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";

/** 当前登录态探测：前台据此渲染站长专属入口（编辑/删除等） */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    return NextResponse.json({
      authenticated: Boolean(session),
      email: session?.user.email ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        authenticated: false,
        error: err instanceof Error ? err.message : "服务异常",
      },
      { status: 500 }
    );
  }
}
