import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { getAdminSession, applyRefreshedSession } from "@/lib/admin";

export interface ProfileData {
  nickname: string;
  headline: string;
  bio: string;
  avatar_url: string | null;
  skills: string[];
  contact: { label: string; value: string; icon: string }[];
}

const DEFAULT_PROFILE: ProfileData = {
  nickname: "枫",
  headline: "",
  bio: "",
  avatar_url: null,
  skills: [],
  contact: [],
};

export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from("profile").select("*").limit(1).maybeSingle();
    if (error) throw new Error(`查询档案失败: ${error.message}`);

    const session = await getAdminSession(request);
    const profile = data ? (data as ProfileData) : DEFAULT_PROFILE;
    const response = NextResponse.json({ profile });
    return applyRefreshedSession(response, session?.newSession ?? null);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });

    const body = (await request.json()) as Partial<ProfileData>;

    const client = getSupabaseClient();
    const { data: existing, error: qErr } = await client
      .from("profile")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (qErr) throw new Error(`查询档案失败: ${qErr.message}`);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.nickname !== undefined) updates.nickname = body.nickname.trim() || "枫";
    if (body.headline !== undefined) updates.headline = body.headline.trim();
    if (body.bio !== undefined) updates.bio = body.bio;
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url || null;
    if (body.skills !== undefined) updates.skills = body.skills.map((s) => s.trim()).filter(Boolean);
    if (body.contact !== undefined) updates.contact = body.contact;

    let response: NextResponse;
    if (existing) {
      const id = (existing as { id: string }).id;
      const { error } = await client.from("profile").update(updates).eq("id", id);
      if (error) throw new Error(`更新档案失败: ${error.message}`);
      response = NextResponse.json({ success: true, id });
    } else {
      const { data, error } = await client.from("profile").insert(updates).select("id").single();
      if (error) throw new Error(`创建档案失败: ${error.message}`);
      response = NextResponse.json({ success: true, id: (data as { id: string }).id });
    }
    return applyRefreshedSession(response, session.newSession);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务异常" },
      { status: 500 }
    );
  }
}
