import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

/** 全量标签列表（含各标签被使用的笔记数），供花园侧栏筛选 */
export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data: tags, error } = await client.from("tags").select("id, name").order("name");
    if (error) throw new Error(`查询标签失败: ${error.message}`);

    const { data: rels, error: relErr } = await client.from("note_tags").select("tag_id, notes(status)");
    if (relErr) throw new Error(`查询标签关联失败: ${relErr.message}`);

    const counts = new Map<string, number>();
    for (const rel of (rels ?? []) as unknown as {
      tag_id: string;
      notes: { status: string } | { status: string }[] | null;
    }[]) {
      // 多对一嵌套返回对象，一条 note_tags 只关联一篇笔记
      const raw = rel.notes;
      const status = Array.isArray(raw) ? raw[0]?.status : raw?.status;
      // 仅统计已发布笔记
      if (status !== "published") continue;
      counts.set(rel.tag_id, (counts.get(rel.tag_id) ?? 0) + 1);
    }

    const result = (tags ?? []).map((t) => ({
      ...(t as { id: string; name: string }),
      count: counts.get((t as { id: string }).id) ?? 0,
    }));

    return NextResponse.json({ tags: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
