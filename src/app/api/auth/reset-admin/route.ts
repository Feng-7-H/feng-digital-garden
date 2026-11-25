import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/admin";
import { getSetupKey } from "@/lib/setup-key";
import {
  getSupabaseClient,
  getSupabaseSecretKey,
} from "@/storage/database/supabase-client";

const RESET_CONFIRMATION = "RESET_ADMIN";

/**
 * 清除全部 Supabase Auth 用户，使首次初始化向导重新开放。
 * 仅删除登录账号与会话，不删除 notes / works / profile / messages 等业务内容。
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      setup_key?: string;
      confirmation?: string;
    };

    if (!body.setup_key || body.setup_key !== getSetupKey()) {
      return NextResponse.json({ error: "初始化密钥不正确" }, { status: 403 });
    }
    if (body.confirmation !== RESET_CONFIRMATION) {
      return NextResponse.json(
        { error: `请输入 ${RESET_CONFIRMATION} 确认重置` },
        { status: 400 }
      );
    }

    if (!getSupabaseSecretKey()) {
      return NextResponse.json(
        { error: "缺少 Supabase 服务端管理密钥，无法重置管理员账号" },
        { status: 503 }
      );
    }

    const client = getSupabaseClient();
    let deletedCount = 0;

    // 每次删除后重新读取第一页，避免分页偏移导致漏删账号。
    while (true) {
      const { data, error } = await client.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (error) throw new Error(`查询管理员账号失败: ${error.message}`);

      const users = data.users ?? [];
      if (users.length === 0) break;

      for (const user of users) {
        const { error: deleteError } = await client.auth.admin.deleteUser(user.id);
        if (deleteError) {
          throw new Error(`删除管理员账号失败: ${deleteError.message}`);
        }
        deletedCount += 1;
      }
    }

    const response = NextResponse.json({
      success: true,
      deleted_count: deletedCount,
    });
    return clearSessionCookies(response);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "重置管理员账号失败" },
      { status: 500 }
    );
  }
}
