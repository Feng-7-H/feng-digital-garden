import type { Metadata } from "next";
import { Suspense } from "react";
import { GardenClient } from "./garden-client";

export const metadata: Metadata = {
  title: "数字花园",
  description: "随手种下的想法与思考，彼此连结成网。浏览、搜索、按标签筛选所有已发布笔记，并留下你的想法。",
};

export default function GardenPage() {
  return (
    <Suspense fallback={null}>
      <GardenClient />
    </Suspense>
  );
}
