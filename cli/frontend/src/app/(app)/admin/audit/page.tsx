"use client";

import { useState, useEffect, useCallback } from "react";
import { listAuditLogs } from "@/lib/api";
import type { AuditLog } from "@/lib/types";

const resourceTypes = [
  { value: "", label: "全部" },
  { value: "skill", label: "技能" },
  { value: "skill_version", label: "版本" },
  { value: "namespace", label: "命名空间" },
  { value: "review", label: "审核" },
  { value: "team", label: "团队" },
  { value: "artifact:download", label: "下载" },
];

const actionLabels: Record<string, string> = {
  "skill:create": "创建技能",
  "skill:update": "更新技能",
  "skill:delete": "删除技能",
  "version:create": "创建版本",
  "version:submit": "提交审核",
  "version:publish": "发布版本",
  "version:deprecate": "废弃版本",
  "version:block": "封禁版本",
  "namespace:create": "创建命名空间",
  "review:approve": "审核通过",
  "review:request_changes": "要求修改",
  "review:reject": "审核拒绝",
  "team:create": "创建团队",
  "team:update": "更新团队",
  "team:delete": "删除团队",
  "team:add_member": "添加成员",
  "team:remove_member": "移除成员",
  "artifact:download": "下载制品",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resourceType, setResourceType] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: String(limit), offset: String(offset) };
      if (resourceType) params.resource_type = resourceType;
      const res = await listAuditLogs(params);
      setLogs(res.logs ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [resourceType, offset]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="max-w-[960px] mx-auto px-6 py-8">
      <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)] mb-1">审计日志</h1>
      <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">系统操作记录与合规追踪</p>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">资源类型:</span>
        <div className="flex gap-1">
          {resourceTypes.map((rt) => (
            <button
              key={rt.value}
              onClick={() => { setResourceType(rt.value); setOffset(0); }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                resourceType === rt.value
                  ? "bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-accent)]"
                  : "bg-[var(--color-bg-default)] border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-[12px] text-[var(--color-text-secondary)] mb-3">{total} 条记录</div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-14 rounded-md border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]">
          <p className="text-[var(--color-text-secondary)] text-[13px]">暂无审计日志</p>
        </div>
      ) : (
        <div className="border border-[var(--color-border-default)] rounded-md overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-default)]">
                <th className="text-left px-3 py-2 font-medium text-[var(--color-text-secondary)]">操作</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--color-text-secondary)]">资源</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--color-text-secondary)]">资源 ID</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--color-text-secondary)]">IP</th>
                <th className="text-right px-3 py-2 font-medium text-[var(--color-text-secondary)]">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-accent-subtle)] text-[var(--color-accent)] text-[11px] font-medium">
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-secondary)] font-mono text-[12px]">
                    {log.resource_type}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-tertiary)] font-mono text-[11px] max-w-[160px] truncate">
                    {log.resource_id || "-"}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-tertiary)] font-mono text-[12px]">
                    {log.ip || "-"}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--color-text-tertiary)]">
                    {new Date(log.created_at).toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border-default)]">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-2.5 py-1 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-subtle)] transition-colors disabled:opacity-30"
          >
            &larr; 上一页
          </button>
          <span className="text-[12px] text-[var(--color-text-tertiary)]">
            {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="px-2.5 py-1 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-subtle)] transition-colors disabled:opacity-30"
          >
            下一页 &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
