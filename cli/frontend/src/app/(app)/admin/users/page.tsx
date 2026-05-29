"use client";

import { useState, useEffect, useCallback } from "react";
import { listUsers, updateUserRoles } from "@/lib/api";
import type { User } from "@/lib/types";

const allRoles = [
  { value: "consumer", label: "使用者", bg: "bg-[var(--color-bg-subtle)]", text: "text-[var(--color-text-secondary)]" },
  { value: "author", label: "作者", bg: "bg-[var(--color-accent-subtle)]", text: "text-[var(--color-accent)]" },
  { value: "maintainer", label: "维护者", bg: "bg-[var(--color-purple-subtle)]", text: "text-[var(--color-purple)]" },
  { value: "security_reviewer", label: "安全审核员", bg: "bg-[var(--color-warning-subtle)]", text: "text-[var(--color-warning)]" },
  { value: "namespace_admin", label: "命名空间管理员", bg: "bg-[var(--color-success-subtle)]", text: "text-[var(--color-success)]" },
  { value: "platform_admin", label: "平台管理员", bg: "bg-[var(--color-danger-subtle)]", text: "text-[var(--color-danger)]" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    try {
      const res = await listUsers();
      setUsers(res.users ?? []);
      setTotal(res.total ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const startEdit = (user: User) => {
    setEditing((prev) => ({ ...prev, [user.id]: [...user.roles] }));
    setMessages((prev) => ({ ...prev, [user.id]: "" }));
  };

  const toggleRole = (userId: string, role: string) => {
    setEditing((prev) => {
      const current = prev[userId] || [];
      const next = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role];
      return { ...prev, [userId]: next };
    });
  };

  const cancelEdit = (userId: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const saveRoles = async (userId: string) => {
    const roles = editing[userId];
    if (!roles || roles.length === 0) {
      setMessages((prev) => ({ ...prev, [userId]: "至少需要一个角色" }));
      return;
    }
    setSaving((prev) => ({ ...prev, [userId]: true }));
    setMessages((prev) => ({ ...prev, [userId]: "" }));
    try {
      await updateUserRoles(userId, roles);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roles } : u))
      );
      cancelEdit(userId);
    } catch (err: unknown) {
      setMessages((prev) => ({
        ...prev,
        [userId]: err instanceof Error ? err.message : "保存失败",
      }));
    } finally {
      setSaving((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="h-64 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">用户管理</h1>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1">共 {total} 个用户</p>
        </div>
      </div>

      <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]">
                <th className="text-left px-3 py-2 text-[13px] font-medium text-[var(--color-text-secondary)]">用户</th>
                <th className="text-left px-3 py-2 text-[13px] font-medium text-[var(--color-text-secondary)]">角色</th>
                <th className="text-left px-3 py-2 text-[13px] font-medium text-[var(--color-text-secondary)]">注册时间</th>
                <th className="text-right px-3 py-2 text-[13px] font-medium text-[var(--color-text-secondary)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isEditing = user.id in editing;
                const currentRoles = isEditing ? editing[user.id] : user.roles;
                return (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--color-border-default)] last:border-0"
                  >
                    <td className="px-3 py-2">
                      <div className="text-[13px] font-medium text-[var(--color-text-primary)]">
                        {user.display_name || user.username}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-tertiary)]">{user.email}</div>
                    </td>
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-1.5">
                          {allRoles.map((role) => (
                            <button
                              key={role.value}
                              onClick={() => toggleRole(user.id, role.value)}
                              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-opacity ${
                                currentRoles.includes(role.value)
                                  ? `${role.bg} ${role.text}`
                                  : "opacity-30 border border-[var(--color-border-default)] text-[var(--color-text-tertiary)]"
                              }`}
                            >
                              {role.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => {
                            const def = allRoles.find((r) => r.value === role);
                            return (
                              <span
                                key={role}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                  def ? `${def.bg} ${def.text}` : "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
                                }`}
                              >
                                {def?.label || role}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {messages[user.id] && (
                        <p className="text-[11px] text-[var(--color-danger)] mt-1">{messages[user.id]}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-text-tertiary)] text-[12px]">
                      {new Date(user.created_at).toLocaleDateString("zh-CN")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => saveRoles(user.id)}
                            disabled={saving[user.id]}
                            className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50 transition-colors"
                          >
                            {saving[user.id] ? "保存..." : "保存"}
                          </button>
                          <button
                            onClick={() => cancelEdit(user.id)}
                            className="px-2.5 py-1.5 text-[13px] font-medium rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(user)}
                          className="px-2.5 py-1.5 text-[13px] font-medium rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)] transition-colors"
                        >
                          编辑角色
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
