"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogIn, UserPlus, X } from "lucide-react";
import { Toaster, toast } from "sonner";
import { api } from "@/lib/api";

type Mode = "checking" | "login" | "setup";

const RESET_CONFIRMATION = "RESET_ADMIN";

const inputClass =
  "w-full bg-surface-container border-none rounded-md px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";

export function AdminLoginClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("checking");

  // 登录表单
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 首次初始化向导表单
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPwd, setSetupPwd] = useState("");
  const [setupPwd2, setSetupPwd2] = useState("");
  const [setupKey, setSetupKey] = useState("");

  // 忘记密码弹窗
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  // 清除管理员账号并重新初始化
  const [resetOpen, setResetOpen] = useState(false);
  const [resetKey, setResetKey] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // 回填「记住我」的邮箱
    const saved = window.localStorage.getItem("feng_admin_email");
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
    (async () => {
      // 已登录直接进后台
      try {
        const me = await api.get<{ authenticated: boolean }>("/api/auth/me");
        if (!cancelled && me.authenticated) {
          router.replace("/admin");
          return;
        }
      } catch {
        // 探测失败不阻塞登录流程
      }
      // 是否已初始化：未初始化展示「创建站长账号」向导（创建后入口永久关闭）
      try {
        const st = await api.get<{ initialized: boolean }>("/api/auth/status");
        if (!cancelled) setMode(st.initialized ? "login" : "setup");
      } catch {
        if (!cancelled) setMode("login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (!email.trim()) return setError("请输入邮箱");
    if (!password) return setError("请输入密码");
    setSubmitting(true);
    try {
      await api.post("/api/auth/login", { email: email.trim(), password });
      if (remember) window.localStorage.setItem("feng_admin_email", email.trim());
      else window.localStorage.removeItem("feng_admin_email");
      toast.success("登录成功，正在进入后台…");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请稍后再试");
      setSubmitting(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (!setupEmail.trim()) return setError("请输入站长邮箱");
    if (setupPwd.length < 8) return setError("密码至少 8 位");
    if (setupPwd !== setupPwd2) return setError("两次输入的密码不一致");
    if (!setupKey.trim()) return setError("请输入初始化密钥");
    setSubmitting(true);
    try {
      await api.post("/api/auth/setup", {
        setup_key: setupKey.trim(),
        email: setupEmail.trim(),
        password: setupPwd,
      });
      toast.success("站长账号创建成功，正在进入后台…");
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败，请稍后再试");
      setSubmitting(false);
    }
  }

  async function handleForgot() {
    if (forgotBusy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      toast.error("请输入有效的邮箱地址");
      return;
    }
    setForgotBusy(true);
    try {
      await api.post("/api/auth/reset", { email: forgotEmail.trim() });
      toast.success("重置邮件已发送，请前往邮箱查收");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发送失败，请稍后再试");
    } finally {
      setForgotBusy(false);
    }
  }

  async function handleResetAdmin() {
    if (resetBusy) return;
    if (!resetKey.trim()) {
      toast.error("请输入初始化密钥");
      return;
    }
    if (resetConfirmation !== RESET_CONFIRMATION) {
      toast.error(`请输入 ${RESET_CONFIRMATION} 确认重置`);
      return;
    }

    setResetBusy(true);
    try {
      const result = await api.post<{ deleted_count: number }>(
        "/api/auth/reset-admin",
        {
          setup_key: resetKey.trim(),
          confirmation: RESET_CONFIRMATION,
        }
      );
      window.localStorage.removeItem("feng_admin_email");
      setEmail("");
      setPassword("");
      setRemember(false);
      setSetupEmail("");
      setSetupPwd("");
      setSetupPwd2("");
      setSetupKey("");
      setError("");
      setResetOpen(false);
      setResetKey("");
      setResetConfirmation("");
      setMode("setup");
      toast.success(
        result.deleted_count > 0
          ? `已清除 ${result.deleted_count} 个管理员账号，可以重新初始化`
          : "当前没有管理员账号，可以重新初始化"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重置失败，请稍后再试");
    } finally {
      setResetBusy(false);
    }
  }

  const isSetup = mode === "setup";

  return (
    <main className="relative w-full min-h-screen overflow-hidden bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* 页面专用入场动画 */}
      <style>{`
        @keyframes wm-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rise-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .anim-wm { animation: wm-in 2.6s ease-out both; }
        .anim-rise { animation: rise-in .8s ease-out both; }
      `}</style>

      {/* 背景水印：复用首页「寻找」隶书大字元素（对角错落、极淡透明度、缓慢入场） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
        <span
          className="anim-wm absolute left-[42%] top-[14%] font-bold text-[9rem] md:text-[13rem] leading-none text-on-surface/[0.04]"
          style={{
            fontFamily: "'STLiti','LiSu','隶书','Ma Shan Zheng',serif",
            textShadow: "1px 2px 0 rgba(255,255,255,.55), -1px -1px 0 rgba(38,37,31,.03)",
          }}
        >
          寻
        </span>
        <span
          className="anim-wm absolute left-[57%] top-[30%] font-bold text-[9rem] md:text-[13rem] leading-none text-primary/[0.05]"
          style={{
            fontFamily: "'STLiti','LiSu','隶书','Ma Shan Zheng',serif",
            animationDelay: ".3s",
            textShadow: "1px 2px 0 rgba(255,255,255,.55), -1px -1px 0 rgba(63,107,80,.04)",
          }}
        >
          找
        </span>
      </div>

      {/* 顶部 Logo 区：衬线「枫」大字 + NOW IS THE TIME 小字 + 苔藓绿方形朱印「楓」 */}
      <Link
        href="/"
        aria-label="返回首页"
        className="anim-rise relative z-10 flex flex-col items-center gap-2.5 group"
        style={{ animationDelay: ".1s" }}
      >
        <span className="relative inline-block font-serif font-bold text-4xl leading-none text-on-surface group-hover:text-primary transition-colors">
          枫
          <span className="absolute -right-5 -bottom-1.5 inline-flex items-center justify-center w-4 h-4 rounded-[2px] bg-primary text-primary-foreground text-[9px] font-sans font-bold leading-none" aria-hidden="true">
            楓
          </span>
        </span>
        <span className="text-[10px] tracking-[0.35em] uppercase text-on-surface-variant">NOW IS THE TIME</span>
      </Link>

      {/* 登录 / 初始化卡片 */}
      <div className="anim-rise relative z-10 w-full max-w-md mx-auto mt-8" style={{ animationDelay: ".25s" }}>
        <div className="bg-surface rounded-xl shadow-dialog p-8">
          {mode === "checking" ? (
            <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="mt-3 text-xs">正在检查账号状态…</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="font-serif text-2xl font-bold text-on-surface">
                  {isSetup ? "创建站长账号" : "管理员登录"}
                </h1>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                  {isSetup
                    ? "首次部署初始化：设置站长邮箱与密码，创建完成后此入口永久关闭"
                    : "仅站长本人可登录管理内容，访客无需登录即可浏览全站"}
                </p>
              </div>

              {isSetup ? (
                /* 首次初始化向导：邮箱 + 密码二次确认 + 初始化密钥 */
                <form className="space-y-4" noValidate onSubmit={handleSetup}>
                  <div>
                    <label htmlFor="setup-email" className="block text-xs font-medium text-on-surface-variant mb-1.5">
                      站长邮箱
                    </label>
                    <input
                      id="setup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={inputClass}
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="setup-pwd" className="block text-xs font-medium text-on-surface-variant mb-1.5">
                      设置密码
                    </label>
                    <input
                      id="setup-pwd"
                      type="password"
                      autoComplete="new-password"
                      placeholder="至少 8 位"
                      className={inputClass}
                      value={setupPwd}
                      onChange={(e) => setSetupPwd(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="setup-pwd2" className="block text-xs font-medium text-on-surface-variant mb-1.5">
                      确认密码
                    </label>
                    <input
                      id="setup-pwd2"
                      type="password"
                      autoComplete="new-password"
                      placeholder="再次输入密码"
                      className={inputClass}
                      value={setupPwd2}
                      onChange={(e) => setSetupPwd2(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="setup-key" className="block text-xs font-medium text-on-surface-variant mb-1.5">
                      初始化密钥
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-on-surface-variant/60 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                      <input
                        id="setup-key"
                        type="text"
                        placeholder="部署时生成的随机密钥"
                        className={`${inputClass} pl-9 font-mono`}
                        value={setupKey}
                        onChange={(e) => setSetupKey(e.target.value)}
                      />
                    </div>
                  </div>

                  {error && <p className="text-destructive text-xs leading-relaxed">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium tracking-[0.4em] hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    创建账号
                  </button>
                </form>
              ) : (
                /* 登录表单 */
                <form className="space-y-4" noValidate onSubmit={handleLogin}>
                  <div>
                    <label htmlFor="input-email" className="block text-xs font-medium text-on-surface-variant mb-1.5">
                      邮箱
                    </label>
                    <input
                      id="input-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={inputClass}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="input-password" className="block text-xs font-medium text-on-surface-variant mb-1.5">
                      密码
                    </label>
                    <div className="relative">
                      <input
                        id="input-password"
                        type={showPwd ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="请输入密码"
                        className={`${inputClass} pr-10`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        aria-label={showPwd ? "隐藏密码" : "显示密码"}
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-on-surface-variant hover:text-on-surface transition-colors"
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <label
                    htmlFor="checkbox-remember"
                    className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer select-none w-fit"
                  >
                    <input
                      id="checkbox-remember"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-3.5 h-3.5 cursor-pointer accent-primary"
                    />
                    记住我
                  </label>

                  {error && <p className="text-destructive text-xs leading-relaxed">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium tracking-[0.4em] hover:opacity-90 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    登 录
                  </button>
                </form>
              )}

              {/* 底部链接行 */}
              <div className="flex items-center justify-center gap-3 mt-6 pt-5 border-t border-outline-variant/20">
                <Link href="/" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
                  返回首页
                </Link>
                <span className="text-outline-variant/50 text-xs" aria-hidden="true">
                  ·
                </span>
                {isSetup ? (
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-xs text-on-surface-variant hover:text-primary transition-colors"
                  >
                    已有账号？去登录
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs text-on-surface-variant hover:text-primary transition-colors"
                  >
                    忘记密码？
                  </button>
                )}
              </div>
              {!isSetup && (
                <button
                  type="button"
                  onClick={() => {
                    setResetKey("");
                    setResetConfirmation("");
                    setResetOpen(true);
                  }}
                  className="mt-3 block w-full text-center text-[11px] text-destructive/70 transition-colors hover:text-destructive"
                >
                  清除现有站长账号并重新初始化
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 弹窗：忘记密码（发送重置邮件） */}
      {forgotOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div
            className="bg-surface rounded-xl shadow-dialog max-w-sm w-full p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
          >
            <div className="flex items-center justify-between">
              <h3 id="forgot-title" className="font-serif text-lg font-bold text-on-surface">
                重置密码
              </h3>
              <button
                type="button"
                aria-label="关闭弹窗"
                onClick={() => setForgotOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
              输入站长邮箱，我们将发送密码重置邮件。
            </p>
            <input
              type="email"
              placeholder="you@example.com"
              aria-label="重置密码邮箱"
              className={`${inputClass} mt-4`}
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="bg-surface-container text-on-surface border-none px-4 py-2 rounded-md text-sm font-medium hover:bg-surface-container-high active:scale-[0.98] transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleForgot}
                disabled={forgotBusy}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {forgotBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                发送邮件
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 弹窗：清除管理员账号并重新初始化 */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-xl bg-surface p-6 shadow-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-admin-title"
          >
            <div className="flex items-center justify-between">
              <h3
                id="reset-admin-title"
                className="font-serif text-lg font-bold text-on-surface"
              >
                重建站长账号
              </h3>
              <button
                type="button"
                aria-label="关闭弹窗"
                onClick={() => setResetOpen(false)}
                disabled={resetBusy}
                className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs leading-relaxed text-destructive">
              此操作会删除 Supabase Auth 中全部管理员账号和登录会话，并清除本机记住的邮箱。
              笔记、作品、留言和其他业务内容不会被删除。
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="reset-setup-key"
                  className="mb-1.5 block text-xs font-medium text-on-surface-variant"
                >
                  初始化密钥
                </label>
                <div className="relative">
                  <KeyRound
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant/60"
                    aria-hidden="true"
                  />
                  <input
                    id="reset-setup-key"
                    type="text"
                    value={resetKey}
                    onChange={(e) => setResetKey(e.target.value)}
                    placeholder="输入部署时的初始化密钥"
                    className={`${inputClass} pl-9 font-mono`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reset-confirmation"
                  className="mb-1.5 block text-xs font-medium text-on-surface-variant"
                >
                  输入 <span className="font-mono text-on-surface">{RESET_CONFIRMATION}</span> 确认
                </label>
                <input
                  id="reset-confirmation"
                  type="text"
                  value={resetConfirmation}
                  onChange={(e) => setResetConfirmation(e.target.value)}
                  placeholder={RESET_CONFIRMATION}
                  autoComplete="off"
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                disabled={resetBusy}
                className="rounded-md bg-surface-container px-4 py-2 text-sm font-medium text-on-surface transition-all hover:bg-surface-container-high active:scale-[0.98] disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleResetAdmin()}
                disabled={
                  resetBusy ||
                  !resetKey.trim() ||
                  resetConfirmation !== RESET_CONFIRMATION
                }
                className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white transition-all hover:bg-destructive/90 active:scale-[0.98] disabled:opacity-60"
              >
                {resetBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                清除并重新初始化
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 登录成功反馈 */}
      <div
        role="status"
        aria-live="polite"
        className="hidden fixed left-1/2 bottom-14 z-50 bg-on-surface/90 text-background px-4 py-2.5 rounded-md shadow-float text-sm"
      >
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>登录成功，正在进入后台…</span>
        </span>
      </div>

      <Toaster position="bottom-center" richColors />
    </main>
  );
}
