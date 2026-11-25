"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, MessageCircleHeart, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, addMyMessage, getMyMessages, getVisitorToken, type MyMessage } from "@/lib/api";
import { MESSAGE_EDIT_WINDOW_MS } from "@/lib/message";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface MessageItem {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

/** 相对时间：刚刚 / n 分钟前 / n 小时前 / n 天前 / 具体日期 */
function formatRelativeTime(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  const d = new Date(iso);
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * 数字花园留言板：访客免登录留言。
 * - 访客：本机留言（visitor_token 匹配）在 30 分钟内可编辑 / 删除（删除为软删除）
 * - 站长（登录态）：可删除任意留言，由后台留言管理追溯记录
 */
export function MessageBoard() {
  const [messages, setMessages] = useState<MessageItem[] | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 编辑态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<MessageItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 客户端态：访客标识 / 本机留言记录 / 管理员登录态 / 相对时间时钟
  const [visitorToken, setVisitorToken] = useState("");
  const [myMessages, setMyMessages] = useState<Map<string, string>>(new Map());
  const [isAdmin, setIsAdmin] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.get<{ messages: MessageItem[] }>("/api/messages");
      setMessages(data.messages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "留言加载失败");
      setMessages([]);
    }
  }, []);

  // 挂载后：读取客户端标识并拉取数据（避免 SSR/Hydration 不一致）
  useEffect(() => {
    setVisitorToken(getVisitorToken());
    setMyMessages(new Map(getMyMessages().map((m: MyMessage) => [m.id, m.created_at])));
    setNow(Date.now());
    void loadMessages();

    // 探测管理员登录态（站长可见删除入口）
    api
      .get<{ authenticated: boolean }>("/api/auth/me")
      .then((res) => setIsAdmin(res.authenticated))
      .catch(() => setIsAdmin(false));

    // 30 分钟编辑窗口需要实时过期：每 30s 刷新时钟
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  /** 是否为本机留言 */
  const isMine = useCallback(
    (msg: MessageItem) => myMessages.has(msg.id),
    [myMessages]
  );

  /** 本机留言是否仍在 30 分钟可编辑窗口内 */
  const withinWindow = useCallback(
    (msg: MessageItem) => {
      const createdAt = myMessages.get(msg.id);
      if (!createdAt) return false;
      return now - new Date(createdAt).getTime() < MESSAGE_EDIT_WINDOW_MS;
    },
    [myMessages, now]
  );

  const canEdit = useCallback(
    (msg: MessageItem) => !isAdmin && isMine(msg) && withinWindow(msg),
    [isAdmin, isMine, withinWindow]
  );

  const canDelete = useCallback(
    (msg: MessageItem) => isAdmin || canEdit(msg),
    [isAdmin, canEdit]
  );

  /** 提交留言：校验必填 → 写库 → 记录本机归属 → 刷新列表 */
  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();
    if (!trimmedName) {
      toast.error("请先填写昵称");
      return;
    }
    if (!trimmedContent) {
      toast.error("想说的话还不能为空");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; id: string }>("/api/messages", {
        name: trimmedName,
        content: trimmedContent,
        visitor_token: visitorToken,
      });
      addMyMessage(res.id, new Date().toISOString());
      toast.success("留言成功，感谢你的想法！");
      setName("");
      setContent("");
      await loadMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "留言失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  /** 保存编辑（仅本机 30 分钟内留言） */
  const handleSaveEdit = async (msg: MessageItem) => {
    const trimmed = editContent.trim();
    if (!trimmed) {
      toast.error("内容不能为空");
      return;
    }
    setSavingId(msg.id);
    try {
      await api.put(`/api/messages/${msg.id}`, {
        content: trimmed,
        visitor_token: visitorToken,
      });
      toast.success("留言已更新");
      setEditingId(null);
      await loadMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "修改失败，请稍后再试");
    } finally {
      setSavingId(null);
    }
  };

  /** 删除留言：站长软删除（后台可追溯）；访客仅限本机 30 分钟内 */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/api/messages/${deleteTarget.id}`, { visitor_token: visitorToken });
      toast.success("留言已删除");
      setDeleteTarget(null);
      await loadMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败，请稍后再试");
    } finally {
      setDeleting(false);
    }
  };

  const list = useMemo(() => messages ?? [], [messages]);

  return (
    <section aria-label="留言板" className="mt-20 border-t border-outline-variant/15 pt-14">
      <div className="max-w-3xl mx-auto">
        {/* 标题 */}
        <div className="text-center">
          <h2 className="font-serif text-2xl font-bold text-foreground">留下你的想法</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            欢迎写下你的见解与感受，它们是花园的另一场对话
          </p>
        </div>

        {/* 留言表单 */}
        <div className="mt-8 bg-surface rounded-xl shadow-card p-6 sm:p-8">
          <div className="grid sm:grid-cols-[200px_1fr] gap-4">
            <div>
              <label htmlFor="msg-name" className="block text-xs font-medium text-muted-foreground mb-1.5">
                昵称
              </label>
              <Input
                id="msg-name"
                type="text"
                maxLength={20}
                placeholder="怎么称呼你？"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted border-none focus-visible:ring-primary/30"
              />
            </div>
            <div>
              <label htmlFor="msg-content" className="block text-xs font-medium text-muted-foreground mb-1.5">
                想说的话
              </label>
              <Textarea
                id="msg-content"
                rows={3}
                maxLength={500}
                placeholder="写下你的想法、见解或感受…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-muted border-none resize-none focus-visible:ring-primary/30"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground/70">留言为公开内容，将展示在下方列表中</p>
            <Button id="msg-submit" onClick={handleSubmit} disabled={submitting} className="shrink-0">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              留下想法
            </Button>
          </div>
        </div>

        {/* 加载骨架 */}
        {messages === null && (
          <div className="mt-8 space-y-4" aria-label="留言加载中">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-surface rounded-xl shadow-card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* 留言列表：新留言在前（接口已按 created_at 倒序） */}
        {messages !== null && list.length > 0 && (
          <ul className="mt-8 space-y-4">
            {list.map((msg) => {
              const editing = editingId === msg.id;
              const edited = Boolean(msg.updated_at && new Date(msg.updated_at).getTime() - new Date(msg.created_at).getTime() > 60_000);
              return (
                <li key={msg.id} className="bg-surface rounded-xl shadow-card p-5 sm:p-6 group">
                  <div className="flex items-start gap-3">
                    <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif text-sm font-bold shrink-0">
                      {msg.name.slice(0, 1)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{msg.name}</p>
                        <span className="text-xs text-muted-foreground/70">
                          {formatRelativeTime(msg.created_at, now)}
                        </span>
                        {isMine(msg) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            我的留言
                          </span>
                        )}
                        {edited && !editing && (
                          <span className="text-[10px] text-muted-foreground/60">已编辑</span>
                        )}
                      </div>

                      {/* 查看态 */}
                      {!editing && (
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}

                      {/* 编辑态：仅本机留言且距发布 <30 分钟时可进入 */}
                      {editing && (
                        <div className="mt-2">
                          <Textarea
                            rows={3}
                            maxLength={500}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="bg-muted border-none resize-none focus-visible:ring-primary/30"
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingId(null)}
                            >
                              取消
                            </Button>
                            <Button size="sm" onClick={() => void handleSaveEdit(msg)} disabled={savingId === msg.id}>
                              {savingId === msg.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              保存
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 操作区：站长可删任意留言；访客仅本机 30 分钟内可编辑/删除 */}
                    {!editing && (canEdit(msg) || canDelete(msg)) && (
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {canEdit(msg) && (
                          <button
                            type="button"
                            aria-label="编辑留言"
                            onClick={() => {
                              setEditingId(msg.id);
                              setEditContent(msg.content);
                            }}
                            className="text-muted-foreground/50 hover:text-primary p-1 rounded transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete(msg) && (
                          <button
                            type="button"
                            aria-label="删除留言"
                            onClick={() => setDeleteTarget(msg)}
                            className="text-muted-foreground/50 hover:text-destructive p-1 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* 留言空态 */}
        {messages !== null && list.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center text-center bg-surface rounded-xl shadow-card px-6 py-12">
            <MessageCircleHeart className="w-8 h-8 text-primary/40" />
            <p className="mt-4 text-sm text-muted-foreground">欢迎留下您宝贵的经验分享~</p>
          </div>
        )}
      </div>

      {/* 删除确认弹窗：站长删除 / 访客 30 分钟内自删共用 */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              将删除 <span className="text-foreground font-medium">{deleteTarget?.name}</span> 的留言。
              删除后将不再展示，记录仍保留在站长后台。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
