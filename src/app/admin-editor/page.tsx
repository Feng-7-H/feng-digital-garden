import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorClient } from "./editor-client";

export const metadata: Metadata = {
  title: "编辑笔记",
  description: "撰写与编辑数字花园的笔记",
};

export default function AdminEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-sm text-on-surface-variant">加载中…</p>
        </div>
      }
    >
      <EditorClient />
    </Suspense>
  );
}
