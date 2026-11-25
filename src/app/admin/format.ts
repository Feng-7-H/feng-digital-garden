import { format, isValid } from "date-fns";

/** yyyy-MM-dd（列表更新时间用） */
export function formatDate(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return isValid(d) ? format(d, "yyyy-MM-dd") : "";
}

/** yyyy-MM-dd HH:mm（留言时间、保存时间用） */
export function formatDateTime(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return isValid(d) ? format(d, "yyyy-MM-dd HH:mm") : "";
}
