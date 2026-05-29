"use client";

import { useState, useEffect, useCallback } from "react";
import { getProfile, updateProfile, changePassword } from "@/lib/api";
import type { User, ProfileStats } from "@/lib/types";
import { UserIcon, CheckIcon } from "@/components/icons";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState("");

  // profile edit
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  // password
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      setUser(res.user);
      setStats(res.stats);
      setDisplayName(res.user.display_name || "");
      setDepartment(res.user.department || "");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    try {
      const updated = await updateProfile({
        display_name: displayName,
        department: department,
      });
      setUser(updated);
      setSaveMsg("保存成功");
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg("");
    setPwError("");
    if (newPw.length < 6) {
      setPwError("新密码至少需要6个字符");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("两次输入的密码不一致");
      return;
    }
    setChangingPw(true);
    try {
      await changePassword(oldPw, newPw);
      setPwMsg("密码修改成功");
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "修改失败");
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="h-64 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 text-center text-[var(--color-text-tertiary)] text-[13px]">
        无法加载用户信息
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    consumer: "使用者",
    author: "作者",
    maintainer: "维护者",
    security_reviewer: "安全审核员",
    namespace_admin: "命名空间管理员",
    platform_admin: "平台管理员",
  };

  const roleStyles: Record<string, { bg: string; text: string }> = {
    consumer: { bg: "bg-[var(--color-bg-subtle)]", text: "text-[var(--color-text-secondary)]" },
    author: { bg: "bg-[var(--color-accent-subtle)]", text: "text-[var(--color-accent)]" },
    maintainer: { bg: "bg-[var(--color-purple-subtle)]", text: "text-[var(--color-purple)]" },
    security_reviewer: { bg: "bg-[var(--color-warning-subtle)]", text: "text-[var(--color-warning)]" },
    namespace_admin: { bg: "bg-[var(--color-success-subtle)]", text: "text-[var(--color-success)]" },
    platform_admin: { bg: "bg-[var(--color-danger-subtle)]", text: "text-[var(--color-danger)]" },
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">个人中心</h1>

      {/* User info + stats */}
      <div className="p-6 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-[var(--color-accent)]" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              {user.display_name || user.username}
            </h2>
            <p className="text-[13px] text-[var(--color-text-secondary)]">{user.email}</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-md bg-[var(--color-accent-subtle)]">
              <div className="text-[20px] font-semibold text-[var(--color-accent)]">{stats.skill_count}</div>
              <div className="text-[11px] text-[var(--color-text-secondary)]">创建的技能</div>
            </div>
            <div className="text-center p-3 rounded-md bg-[var(--color-success-subtle)]">
              <div className="text-[20px] font-semibold text-[var(--color-success)]">{stats.version_count}</div>
              <div className="text-[11px] text-[var(--color-text-secondary)]">提交的版本</div>
            </div>
            <div className="text-center p-3 rounded-md bg-[var(--color-warning-subtle)]">
              <div className="text-[20px] font-semibold text-[var(--color-warning)]">{stats.review_count}</div>
              <div className="text-[11px] text-[var(--color-text-secondary)]">完成的审核</div>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-[var(--color-border-default)]">
          <div className="flex flex-wrap gap-1.5">
            {user.roles.map((role) => {
              const style = roleStyles[role] || { bg: "bg-[var(--color-bg-subtle)]", text: "text-[var(--color-text-secondary)]" };
              return (
                <span
                  key={role}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${style.bg} ${style.text}`}
                >
                  {roleLabels[role] || role}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <form
        onSubmit={handleUpdateProfile}
        className="p-6 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] space-y-4"
      >
        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">编辑资料</h3>

        {saveMsg && (
          <div
            className={`p-2.5 rounded-md text-[12px] ${
              saveMsg === "保存成功"
                ? "bg-[var(--color-success-subtle)] text-[var(--color-success)]"
                : "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]"
            }`}
          >
            {saveMsg}
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">
            显示名称
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="你的名字"
            className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">
            部门
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="所在部门"
            className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </form>

      {/* Change password */}
      <form
        onSubmit={handleChangePassword}
        className="p-6 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] space-y-4"
      >
        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">修改密码</h3>

        {pwError && (
          <div className="p-2.5 rounded-md bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-[12px]">{pwError}</div>
        )}
        {pwMsg && (
          <div className="p-2.5 rounded-md bg-[var(--color-success-subtle)] text-[var(--color-success)] text-[12px] flex items-center gap-1">
            <CheckIcon className="w-3 h-3" />
            {pwMsg}
          </div>
        )}

        <div>
          <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">
            原密码
          </label>
          <input
            type="password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            required
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">
            新密码
          </label>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="至少6个字符"
            className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            required
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--color-text-secondary)] mb-1.5">
            确认新密码
          </label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            required
          />
        </div>

        <button
          type="submit"
          disabled={changingPw}
          className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50 transition-colors"
        >
          {changingPw ? "修改中..." : "修改密码"}
        </button>
      </form>
    </div>
  );
}
