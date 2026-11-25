import { getSupabaseClient } from "@/storage/database/supabase-client";

export interface TagRow {
  id: string;
  name: string;
}

/**
 * 将标签名数组解析为 tag 行（不存在则创建），返回 id 列表。
 */
export async function resolveTagIds(names: string[]): Promise<TagRow[]> {
  const clean = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  if (clean.length === 0) return [];

  const client = getSupabaseClient();

  // 查询已存在的标签
  const { data: existing, error } = await client.from("tags").select("id, name").in("name", clean);
  if (error) throw new Error(`查询标签失败: ${error.message}`);
  const existingTags = (existing ?? []) as TagRow[];
  const existingNames = new Set(existingTags.map((t) => t.name));

  // 创建缺失的标签
  const missing = clean.filter((n) => !existingNames.has(n));
  let created: TagRow[] = [];
  if (missing.length > 0) {
    const { data: inserted, error: insertErr } = await client
      .from("tags")
      .insert(missing.map((name) => ({ name })))
      .select("id, name");
    if (insertErr) throw new Error(`创建标签失败: ${insertErr.message}`);
    created = (inserted ?? []) as TagRow[];
  }

  return [...existingTags, ...created];
}

/** 查询笔记关联的标签 */
export async function getNoteTags(noteIds: string[]): Promise<Map<string, TagRow[]>> {
  const result = new Map<string, TagRow[]>();
  if (noteIds.length === 0) return result;

  const client = getSupabaseClient();
  const { data: relations, error } = await client
    .from("note_tags")
    .select("note_id, tags(id, name)")
    .in("note_id", noteIds);
  if (error) throw new Error(`查询笔记标签失败: ${error.message}`);

  for (const rel of (relations ?? []) as { note_id: string; tags: TagRow | TagRow[] | null }[]) {
    const tag = Array.isArray(rel.tags) ? rel.tags[0] : rel.tags;
    if (!tag) continue;
    const list = result.get(rel.note_id) ?? [];
    list.push(tag);
    result.set(rel.note_id, list);
  }
  return result;
}
