import type { Metadata } from "next";
import { Suspense } from "react";
import { NoteDetailClient } from "./note-detail-client";

export const metadata: Metadata = {
  title: "笔记详情",
  description: "阅读一篇笔记全文，并发现关联笔记。",
};

export default function NoteDetailPage() {
  return (
    <Suspense fallback={null}>
      <NoteDetailClient />
    </Suspense>
  );
}
