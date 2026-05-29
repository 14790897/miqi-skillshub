"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("请输入邮箱地址");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要6个字符");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await register(email.trim(), password);
      localStorage.setItem("skillhub_token", res.token);
      localStorage.setItem("skillhub_user", JSON.stringify(res.user));
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-subtle)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-md bg-[var(--color-accent-emphasis)] flex items-center justify-center text-white text-[20px] font-bold mx-auto mb-4">
            S
          </div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">注册 SkillHub</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">创建你的企业 AI 技能管理账号</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] space-y-4"
        >
          {error && (
            <div className="p-2.5 rounded-md bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-[12px]">{error}</div>
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
              placeholder="至少6个字符"
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">
              确认密码
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="再次输入密码"
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50 transition-colors"
          >
            {loading ? "注册中..." : "注册"}
          </button>

          <p className="text-center text-[12px] text-[var(--color-text-tertiary)]">
            已有账号？
            <Link href="/login" className="text-[var(--color-accent)] hover:underline ml-1">
              立即登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
