"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const continueTo = searchParams.get("continue") || "";
  const oauthError = searchParams.get("error") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(oauthError);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("请输入邮箱和密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await login(email.trim(), password);
      localStorage.setItem("skillhub_token", res.token);
      localStorage.setItem("skillhub_user", JSON.stringify(res.user));

      if (continueTo) {
        router.push(continueTo);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    // Redirect to backend, which redirects to Sandbox authorization page.
    // After the user authorizes at Sandbox, Sandbox calls back our backend,
    // which issues a SkillHub JWT and redirects to /callback?token=...
    //example: http://139.196.211.120:6810/api/oauth2/authorize?client_id=miqi&response_type=code&redirect_uri=http://localhost:3000&scope=userinfo
    const backendBase =
      process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ||
      "http://localhost:8088";
    window.location.href = `${backendBase}/api/v1/auth/oauth/redirect`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-subtle)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-md bg-[var(--color-accent-emphasis)] flex items-center justify-center text-white text-[20px] font-bold mx-auto mb-4">
            S
          </div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
            登录 SkillHub
          </h1>
          {continueTo && (
            <p className="text-[12px] text-[var(--color-text-secondary)] mt-1 px-2">
              第三方应用请求授权，请先登录
            </p>
          )}
          {!continueTo && (
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
              企业 AI 技能管理平台
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] space-y-4"
        >
          {error && (
            <div className="p-2.5 rounded-md bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-[12px]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50 transition-colors"
          >
            {loading ? "登录中..." : continueTo ? "登录并授权" : "登录"}
          </button>

          {/* Divider */}
          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--color-border-default)]" />
            <span className="text-[11px] text-[var(--color-text-tertiary)]">
              或
            </span>
            <div className="flex-1 h-px bg-[var(--color-border-default)]" />
          </div>

          {/* Sandbox SSO button */}
          <button
            type="button"
            onClick={handleOAuthLogin}
            className="w-full px-2.5 py-1.5 text-[13px] font-medium rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors flex items-center justify-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--color-text-secondary)]"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            使用 Sandbox 账号登录
          </button>

          <p className="text-center text-[12px] text-[var(--color-text-tertiary)]">
            还没有账号？
            <Link
              href="/register"
              className="text-[var(--color-accent)] hover:underline ml-1"
            >
              立即注册
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
