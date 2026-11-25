import type { Metadata } from "next";
import { AdminLoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "管理员登录",
  description: "仅站长本人可登录管理内容，访客无需登录即可浏览全站",
};

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}
