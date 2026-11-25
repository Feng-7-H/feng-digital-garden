import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

const ACCESS_COOKIE = "feng_access";
const REFRESH_COOKIE = "feng_refresh";
const ACCESS_MAX_AGE = 60 * 60; // 1h
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7d

export interface AdminUser {
  id: string;
  email?: string;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
}

/** 设置登录会话 cookie */
export function setSessionCookies(response: NextResponse, session: AuthSession): NextResponse {
  const secure = process.env.COZE_PROJECT_ENV === "PROD";
  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: ACCESS_MAX_AGE,
  });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  });
  return response;
}

/** 清除会话 cookie */
export function clearSessionCookies(response: NextResponse): NextResponse {
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

/**
 * 校验当前请求是否为管理员会话。
 * access token 失效时尝试用 refresh token 续期。
 * 返回 user 与（可能更新的）session；无有效会话返回 null。
 */
export async function getAdminSession(
  request: NextRequest
): Promise<{ user: AdminUser; newSession: AuthSession | null } | null> {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) return null;

  const client = getSupabaseClient();

  if (access) {
    const { data, error } = await client.auth.getUser(access);
    if (!error && data.user) {
      return { user: { id: data.user.id, email: data.user.email }, newSession: null };
    }
  }

  // access 失效，尝试刷新
  if (refresh) {
    const { data, error } = await client.auth.refreshSession({ refresh_token: refresh });
    if (!error && data.session) {
      const { data: userData, error: userErr } = await client.auth.getUser(data.session.access_token);
      if (!userErr && userData.user) {
        return {
          user: { id: userData.user.id, email: userData.user.email },
          newSession: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
        };
      }
    }
  }
  return null;
}

/** 将刷新后的 session 写回响应 cookie */
export function applyRefreshedSession(response: NextResponse, session: AuthSession | null): NextResponse {
  if (session) return setSessionCookies(response, session);
  return response;
}

/** 供 Route Handler 使用的管理员校验，未认证时返回 401 响应 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: AdminUser; refresh: AuthSession | null } | NextResponse> {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });
  }
  return { user: session.user, refresh: session.newSession };
}

/** 判断系统是否已初始化（存在管理员账号） */
export async function isInitialized(): Promise<boolean> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(`查询用户失败: ${error.message}`);
  return (data.users?.length ?? 0) > 0;
}
