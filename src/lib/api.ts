"use client";

/** 前端统一请求封装：JSON + 错误抛出 */

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      // 会话过期，回登录页
      window.location.href = "/admin-login";
    }
    throw new Error(data.error || `请求失败（${res.status}）`);
  }
  return data;
}

export const api = {
  get: <T,>(url: string) => request<T>(url),
  post: <T,>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  put: <T,>(url: string, body?: unknown) => request<T>(url, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: <T,>(url: string, body?: unknown) => request<T>(url, { method: "DELETE", body: JSON.stringify(body ?? {}) }),
};

/** 访客标识（留言归属用），localStorage 持久化 */
export function getVisitorToken(): string {
  if (typeof window === "undefined") return "";
  let token = window.localStorage.getItem("feng_visitor_token");
  if (!token) {
    token = crypto.randomUUID();
    window.localStorage.setItem("feng_visitor_token", token);
  }
  return token;
}

/** 本机留言记录：{id, created_at}，用于判断 30 分钟编辑窗口 */
export interface MyMessage {
  id: string;
  created_at: string;
}

export function getMyMessages(): MyMessage[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem("feng_my_messages") ?? "[]") as MyMessage[];
  } catch {
    return [];
  }
}

export function addMyMessage(id: string, created_at: string): void {
  if (typeof window === "undefined") return;
  const list = getMyMessages().filter((m) => m.id !== id);
  list.push({ id, created_at });
  window.localStorage.setItem("feng_my_messages", JSON.stringify(list));
}
