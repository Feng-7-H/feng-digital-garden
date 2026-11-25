import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorkDetailView } from "./work-detail-view";

export const metadata: Metadata = {
  title: "作品详情",
};

export default async function WorkDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ work_id?: string | string[] }>;
}) {
  const params = await searchParams;
  const workId = Array.isArray(params.work_id) ? params.work_id[0] : params.work_id;
  // 缺少 work_id 参数时降级跳回「关于我」
  if (!workId) {
    redirect("/about");
  }
  return <WorkDetailView workId={workId} />;
}
