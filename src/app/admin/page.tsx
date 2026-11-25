import type { Metadata } from "next";
import { AdminClient } from "./admin-client";

export const metadata: Metadata = {
  title: "后台管理",
  description: "打理花园里的笔记、作品与「关于我」",
};

export default function AdminPage() {
  return <AdminClient />;
}
