import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/admin";

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearSessionCookies(response);
}
