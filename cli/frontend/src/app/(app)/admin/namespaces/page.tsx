"use client";

import { useState, useEffect, useCallback } from "react";
import { listNamespaces, createNamespace } from "@/lib/api";
import type { Namespace } from "@/lib/types";

export default function NamespacesPage() {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create modal
  const [showForm, setShowForm] = useState(false);
  const [formPath, setFormPath] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listNamespaces();
      setNamespaces(res.namespaces ?? []);
    } catch {
      setNamespaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async () => {
    if (!formPath.trim() || !formDisplayName.trim()) {
      setError("路径和展示名称不能为空");
      return;
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(formPath)) {
      setError("命名空间路径只能包含小写字母、数字和连字符，且不能以连字符开头或结尾");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createNamespace({ path: formPath, display_name: formDisplayName, description: formDescription });
      setShowForm(false);
      setFormPath("");
      setFormDisplayName("");
      setFormDescription("");
      fetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">命名空间管理</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">管理技能所属的命名空间</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(""); }}
          className="px-3 py-1.5 bg-[var(--color-accent)] text-white text-[13px] font-medium rounded-md hover:bg-[var(--color-accent-emphasis)] transition-colors"
        >
          创建命名空间
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
      ) : namespaces.length === 0 ? (
        <div className="text-center py-14 rounded-md border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]">
          <p className="text-[var(--color-text-secondary)] text-[13px]">暂无命名空间</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[12px] text-[var(--color-text-secondary)] mb-2">{namespaces.length} 个命名空间</div>
          {namespaces.map((ns) => (
            <div
              key={ns.id}
              className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[13px] font-mono font-semibold text-[var(--color-accent)]">{ns.path}</span>
                <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{ns.display_name}</span>
              </div>
              {ns.description && (
                <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">{ns.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--color-text-tertiary)]">
                <span>创建时间: {new Date(ns.created_at).toLocaleString("zh-CN")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-[var(--color-bg-default)] rounded-lg border border-[var(--color-border-default)] shadow-lg w-[480px] p-6">
            <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-4">创建命名空间</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
                  路径 <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  type="text"
                  value={formPath}
                  onChange={(e) => setFormPath(e.target.value)}
                  placeholder="engineering"
                  className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
                <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">小写字母、数字、连字符，不能以连字符开头或结尾</p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
                  展示名称 <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  type="text"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="工程团队"
                  className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">描述</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="描述该命名空间的用途..."
                  className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-none"
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
                onClick={handleCreate}
                disabled={saving}
                className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50 transition-colors"
              >
                {saving ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
