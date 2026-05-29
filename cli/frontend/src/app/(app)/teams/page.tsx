"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  listTeamMembers,
  addTeamMember,
  removeTeamMember,
  listUsers,
} from "@/lib/api";
import type { Team, TeamMember, User } from "@/lib/types";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create / Edit modal
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formName, setFormName] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  // Members panel
  const [membersTeamId, setMembersTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Add member
  const [showAddMember, setShowAddMember] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("member");

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTeams({ limit: "50" });
      setTeams(res.teams ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const openCreate = () => {
    setEditingTeam(null);
    setFormName("");
    setFormDisplayName("");
    setFormDescription("");
    setFormDepartment("");
    setError("");
    setShowForm(true);
  };

  const openEdit = (t: Team) => {
    setEditingTeam(t);
    setFormName(t.name);
    setFormDisplayName(t.display_name);
    setFormDescription(t.description || "");
    setFormDepartment(t.department || "");
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formDisplayName.trim()) {
      setError("团队标识和展示名称不能为空");
      return;
    }
    if (!editingTeam && !/^[a-z0-9-]+$/.test(formName)) {
      setError("团队标识只能包含小写字母、数字和连字符");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, {
          display_name: formDisplayName,
          description: formDescription,
          department: formDepartment,
        });
      } else {
        await createTeam({
          name: formName,
          display_name: formDisplayName,
          description: formDescription,
          department: formDepartment,
        });
      }
      setShowForm(false);
      fetchTeams();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Team) => {
    if (!confirm(`确定删除团队 "${t.display_name}"？此操作不可撤销。`)) return;
    try {
      await deleteTeam(t.id);
      fetchTeams();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  };

  const openMembers = async (teamId: string) => {
    setMembersTeamId(teamId);
    setMembersLoading(true);
    try {
      const res = await listTeamMembers(teamId);
      setMembers(res.members ?? []);
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!addUserId || !membersTeamId) return;
    try {
      await addTeamMember(membersTeamId, addUserId, addRole);
      setShowAddMember(false);
      // refresh members
      const res = await listTeamMembers(membersTeamId);
      setMembers(res.members ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "添加成员失败");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!membersTeamId) return;
    if (!confirm("确定移除该成员？")) return;
    try {
      await removeTeamMember(membersTeamId, userId);
      const res = await listTeamMembers(membersTeamId);
      setMembers(res.members ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "移除成员失败");
    }
  };

  const loadUsers = async () => {
    try {
      const res = await listUsers({ limit: "100" });
      setUsers(res.users ?? []);
      if (res.users && res.users.length > 0) setAddUserId(res.users[0].id);
    } catch {
      setUsers([]);
    }
    setShowAddMember(true);
  };

  return (
    <div className="max-w-[960px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">团队管理</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">管理企业团队及其成员</p>
        </div>
        <button
          onClick={openCreate}
          className="px-3 py-1.5 bg-[var(--color-accent)] text-white text-[13px] font-medium rounded-md hover:bg-[var(--color-accent-emphasis)] transition-colors"
        >
          创建团队
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-md text-[13px] mb-4 bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border border-[var(--color-danger)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] animate-pulse" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-14 rounded-md border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]">
          <p className="text-[var(--color-text-secondary)] text-[13px]">暂无团队</p>
          <button
            onClick={openCreate}
            className="mt-3 px-3 py-1.5 bg-[var(--color-accent)] text-white text-[13px] font-medium rounded-md hover:bg-[var(--color-accent-emphasis)] transition-colors"
          >
            创建第一个团队
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[12px] text-[var(--color-text-secondary)] mb-2">{total} 个团队</div>
          {teams.map((t) => (
            <div
              key={t.id}
              className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{t.display_name}</h3>
                    <span className="text-[12px] font-mono text-[var(--color-text-tertiary)]">{t.name}</span>
                  </div>
                  {t.description && (
                    <p className="text-[13px] text-[var(--color-text-secondary)] mb-1.5">{t.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-tertiary)]">
                    {t.department && <span>{t.department}</span>}
                    <span>{new Date(t.created_at).toLocaleDateString("zh-CN")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                  <button
                    onClick={() => {
                      openMembers(t.id);
                      setMembersTeamId(t.id);
                    }}
                    className="px-2 py-1 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-subtle)] transition-colors"
                  >
                    成员
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="px-2 py-1 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-subtle)] transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
                    className="px-2 py-1 text-[12px] font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] rounded-md transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>

              {/* Inline members panel */}
              {membersTeamId === t.id && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border-default)]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                      团队成员
                    </h4>
                    <button
                      onClick={loadUsers}
                      className="px-2 py-0.5 text-[12px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] rounded-md transition-colors"
                    >
                      + 添加成员
                    </button>
                  </div>

                  {membersLoading ? (
                    <div className="h-10 rounded-md bg-[var(--color-bg-subtle)] animate-pulse" />
                  ) : members.length === 0 ? (
                    <p className="text-[12px] text-[var(--color-text-tertiary)]">暂无成员</p>
                  ) : (
                    <div className="space-y-1">
                      {members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-[var(--color-bg-subtle)]"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-[var(--color-border-default)] flex items-center justify-center text-[10px] font-semibold text-[var(--color-text-secondary)]">
                              {(m.user?.display_name || m.user?.username || "?")[0]}
                            </div>
                            <span className="text-[13px] text-[var(--color-text-primary)]">
                              {m.user?.display_name || m.user?.username || m.user_id}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium ${
                                m.role === "admin"
                                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                                  : "bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)]"
                              }`}
                            >
                              {m.role === "admin" ? "管理员" : "成员"}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(m.user_id)}
                            className="px-1.5 py-0.5 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] rounded transition-colors"
                          >
                            移除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add member inline form */}
                  {showAddMember && (
                    <div className="mt-3 p-3 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]">
                      <div className="flex items-center gap-2">
                        <select
                          value={addUserId}
                          onChange={(e) => setAddUserId(e.target.value)}
                          className="px-2 py-1 text-[12px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                        >
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.display_name || u.username} ({u.email})
                            </option>
                          ))}
                        </select>
                        <select
                          value={addRole}
                          onChange={(e) => setAddRole(e.target.value)}
                          className="px-2 py-1 text-[12px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                        >
                          <option value="member">成员</option>
                          <option value="admin">管理员</option>
                        </select>
                        <button
                          onClick={handleAddMember}
                          className="px-2.5 py-1 text-[12px] font-medium bg-[var(--color-accent)] text-white rounded-md hover:bg-[var(--color-accent-emphasis)] transition-colors"
                        >
                          添加
                        </button>
                        <button
                          onClick={() => setShowAddMember(false)}
                          className="px-2 py-1 text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-[var(--color-bg-default)] rounded-lg border border-[var(--color-border-default)] shadow-lg w-[480px] max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-4">
              {editingTeam ? "编辑团队" : "创建团队"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
                  团队标识 <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={!!editingTeam}
                  placeholder="engineering-team"
                  className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50"
                />
                {!editingTeam && (
                  <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">仅限小写字母、数字和连字符</p>
                )}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
                  展示名称 <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  type="text"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="研发工程团队"
                  className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">描述</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="团队职责与说明..."
                  className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-none"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">部门</label>
                <input
                  type="text"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  placeholder="例如：研发部、市场部"
                  className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-[var(--color-border-default)]">
              <button
                onClick={() => setShowForm(false)}
                className="px-2.5 py-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50 transition-colors"
              >
                {saving ? "保存中..." : editingTeam ? "保存" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
