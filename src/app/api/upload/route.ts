import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAdminSession, applyRefreshedSession } from "@/lib/admin";

const BUCKET = "media";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** 上传图片（头像/作品封面），返回公开访问 URL */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "仅支持 JPG/PNG/WebP/GIF 图片" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "图片不能超过 5MB" }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 确保 bucket 存在（公开读）
    const { data: buckets } = await client.storage.listBuckets();
    const exists = (buckets ?? []).some((b) => b.name === BUCKET);
    if (!exists) {
      const { error: createErr } = await client.storage.createBucket(BUCKET, { public: true });
      if (createErr && !createErr.message.includes("already exists")) {
        throw new Error(`创建存储桶失败: ${createErr.message}`);
      }
    }

    const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "png";
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await client.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadErr) throw new Error(`上传失败: ${uploadErr.message}`);

    const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(path);

    const response = NextResponse.json({ success: true, url: urlData.publicUrl });
    return applyRefreshedSession(response, session.newSession);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
