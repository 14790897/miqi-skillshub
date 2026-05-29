"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getSkill, listVersions, createVersion, submitVersion, publishVersion, deprecateVersion, blockVersion, triggerLLMScan, submitForHumanReview, listScanReports } from "@/lib/api";
import type { Skill, SkillVersion, ScanReport, Finding } from "@/lib/types";
import { ShieldIcon, DownloadIcon, TagIcon, WarningIcon, CheckIcon, PlusIcon, CloseIcon, RefreshIcon } from "@/components/icons";

const gradeStyles: Record<string, string> = {
  A: "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success)]",
  B: "bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-accent)]",
  C: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]",
  D: "bg-[var(--color-warning-subtle)] text-[var(--color-danger)] border-[var(--color-danger)]",
  F: "bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border-[var(--color-danger)]",
};

const statusStyles: Record<string, string> = {
  candidate: "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]",
  approved: "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]",
  published: "bg-[var(--color-success-subtle)] text-[var(--color-success)]",
  blocked: "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]",
  deprecated: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]",
};

const statusLabels: Record<string, string> = {
  candidate: "待审核",
  approved: "已批准",
  published: "已发布",
  blocked: "已阻断",
  deprecated: "已废弃",
};

const skillStatusStyles: Record<string, string> = {
  active: "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success)]",
  deprecated: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]",
  archived: "bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] border-[var(--color-text-tertiary)]",
};

const severityStyles: Record<string, string> = {
  info: "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]",
  low: "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success)]",
  medium: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]",
  high: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border-[var(--color-warning)]",
  critical: "bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border-[var(--color-danger)]",
};

const severityLabels: Record<string, string> = {
  info: "信息",
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};

const reviewStatusLabels: Record<string, string> = {
  pending: "待扫描",
  scanning: "扫描中",
  completed: "扫描完成",
  failed: "扫描失败",
  ready_for_human: "待人工审核",
};

const reviewStatusColors: Record<string, string> = {
  pending: "text-[var(--color-text-tertiary)]",
  scanning: "text-[var(--color-accent)]",
  completed: "text-[var(--color-success)]",
  failed: "text-[var(--color-danger)]",
  ready_for_human: "text-[var(--color-accent)]",
};

export default function SkillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [versions, setVersions] = useState<SkillVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [newVersion, setNewVersion] = useState("");
  const [newReleaseNote, setNewReleaseNote] = useState("");
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [installModal, setInstallModal] = useState<SkillVersion | null>(null);
  const [actingVersions, setActingVersions] = useState<Record<string, boolean>>({});
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [scanReportsCache, setScanReportsCache] = useState<Record<string, ScanReport[]>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevScanStatus = useRef<Record<string, string>>({});

  const latestVersion = versions.length > 0 ? versions[0] : null;

  const fetch = useCallback(async () => {
    try {
      const [s, vResp] = await Promise.all([getSkill(id), listVersions(id)]);
      setSkill(s);
      setVersions(vResp.versions ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  // Poll for versions that are scanning; invalidate cache when scan completes
  useEffect(() => {
    const scanning = versions.filter((v) => v.llm_review_status === "scanning");
    if (scanning.length === 0) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    if (scanning.length > 0 && !pollRef.current) {
      pollRef.current = setInterval(() => fetch(), 3000);
    }

    // Invalidate scan reports cache when scan starts or completes
    for (const v of versions) {
      const prev = prevScanStatus.current[v.id];
      if (v.llm_review_status !== prev) {
        setScanReportsCache((cache) => {
          const next = { ...cache };
          delete next[v.id];
          return next;
        });
      }
      prevScanStatus.current[v.id] = v.llm_review_status;
    }

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [versions, fetch]);

  const loadScanReports = async (vid: string) => {
    if (scanReportsCache[vid]) return scanReportsCache[vid];
    try {
      const res = await listScanReports(vid);
      const reports = res.scan_reports ?? [];
      setScanReportsCache((prev) => ({ ...prev, [vid]: reports }));
      return reports;
    } catch {
      return [];
    }
  };

  const toggleFindings = async (vid: string) => {
    if (expandedFindings[vid]) {
      setExpandedFindings((prev) => ({ ...prev, [vid]: false }));
    } else {
      setExpandedFindings((prev) => ({ ...prev, [vid]: true }));
      await loadScanReports(vid);
    }
  };

  const setActing = (vid: string, v: boolean) => {
    setActingVersions((prev) => ({ ...prev, [vid]: v }));
  };

  const handleAction = async (vid: string, action: string) => {
    setActionError("");
    setActing(vid, true);
    try {
      if (action === "submit") await submitVersion(vid);
      else if (action === "publish") await publishVersion(vid);
      else if (action === "deprecate") await deprecateVersion(vid);
      else if (action === "block") await blockVersion(vid);
      await fetch();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActing(vid, false);
    }
  };

  const handleLLMScan = async (vid: string) => {
    setActionError("");
    setActing(vid, true);
    try {
      await triggerLLMScan(vid);
      await fetch();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "启动扫描失败");
    } finally {
      setActing(vid, false);
    }
  };

  const handleSubmitReview = async (vid: string) => {
    setActionError("");
    setActing(vid, true);
    try {
      await submitForHumanReview(vid);
      await fetch();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "提交审核失败");
    } finally {
      setActing(vid, false);
    }
  };

  const handleAddVersion = async () => {
    if (!newVersion.trim()) return;
    setActionError("");
    try {
      await createVersion(id, { version: newVersion, release_note: newReleaseNote });
      setNewVersion("");
      setNewReleaseNote("");
      setShowAddVersion(false);
      await fetch();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "创建版本失败");
    }
  };

  const canLLMScan = (v: SkillVersion) =>
    v.llm_review_round < 3 && v.llm_review_status !== "scanning";

  const canSubmitReview = (v: SkillVersion) =>
    v.status === "candidate" && v.llm_review_status === "completed" && v.llm_review_round > 0;

  const isPendingReview = (v: SkillVersion) =>
    v.llm_review_status === "ready_for_human";

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="h-8 w-48 bg-[var(--color-bg-subtle)] rounded-md animate-pulse mb-4" />
        <div className="h-4 w-96 bg-[var(--color-bg-subtle)] rounded-md animate-pulse" />
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-[var(--color-text-tertiary)] text-[13px]">技能不存在</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
            {skill.display_name || skill.name}
          </h1>
          <span className={`px-2 py-0.5 rounded-md text-[12px] font-medium border ${skillStatusStyles[skill.status] || "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"}`}>
            {skill.status === "active" ? "活跃" : skill.status}
          </span>
        </div>
        <p className="text-[var(--color-text-secondary)] text-[13px] max-w-2xl">{skill.description}</p>
      </div>

      {/* Action error banner */}
      {actionError && (
        <div className="p-3 rounded-md bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-[13px] mb-6">{actionError}</div>
      )}

      {/* Main grid: 2/3 + 1/3 */}
      <div className="grid grid-cols-3 gap-8">
        {/* Left column */}
        <div className="col-span-2 space-y-8">
          {/* Info cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
              <div className="text-[11px] text-[var(--color-text-tertiary)] mb-1">命名空间</div>
              <div className="text-[13px] font-medium">{skill.namespace?.path || skill.namespace?.display_name || "-"}</div>
            </div>
            <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
              <div className="text-[11px] text-[var(--color-text-tertiary)] mb-1">可见范围</div>
              <div className="text-[13px] font-medium">{skill.visibility === "org" ? "全组织" : skill.visibility === "team" ? "团队" : "私有"}</div>
            </div>
            <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
              <div className="text-[11px] text-[var(--color-text-tertiary)] mb-1">更新时间</div>
              <div className="text-[13px] font-medium">{new Date(skill.updated_at).toLocaleDateString("zh-CN")}</div>
            </div>
          </div>

          {/* Version history */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">版本历史</h2>
              <button
                onClick={() => setShowAddVersion(!showAddVersion)}
                className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] flex items-center gap-1"
              >
                <PlusIcon className="w-3 h-3" /> 新建版本
              </button>
            </div>

            {showAddVersion && (
              <div className="mb-4 p-4 rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] space-y-3">
                <input
                  type="text" value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="版本号，例如 1.0.0"
                  className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
                <input
                  type="text" value={newReleaseNote}
                  onChange={(e) => setNewReleaseNote(e.target.value)}
                  placeholder="发布说明（可选）"
                  className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddVersion} className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)]">创建</button>
                  <button onClick={() => setShowAddVersion(false)} className="px-2.5 py-1.5 text-[13px] font-medium rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]">取消</button>
                </div>
              </div>
            )}

            {versions.length === 0 ? (
              <div className="text-center py-8 bg-[var(--color-bg-default)] rounded-md border border-[var(--color-border-default)]">
                <p className="text-[var(--color-text-secondary)] text-[13px]">暂无版本</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((v) => {
                  const isScanning = v.llm_review_status === "scanning";
                  const isExpanded = expandedFindings[v.id];
                  const allReports = scanReportsCache[v.id] ?? [];

                  return (
                    <div key={v.id} className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
                      {/* Version header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-mono font-semibold">{v.version}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[12px] font-medium ${statusStyles[v.status] || "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"}`}>
                            {statusLabels[v.status] || v.status}
                          </span>
                          {v.trust_grade && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[12px] font-semibold border ${gradeStyles[v.trust_grade] || ""}`}>
                              {v.trust_grade}
                            </span>
                          )}
                          {/* LLM review round badge */}
                          {v.llm_review_round > 0 && (
                            <span className="text-[11px] text-[var(--color-text-tertiary)]">第 {v.llm_review_round}/3 轮</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* LLM scan status */}
                          <span className={`text-[12px] ${reviewStatusColors[v.llm_review_status] || "text-[var(--color-text-tertiary)]"}`}>
                            {isScanning && <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse mr-1 align-middle" />}
                            {reviewStatusLabels[v.llm_review_status] || v.llm_review_status}
                          </span>
                        </div>
                      </div>

                      {/* LLM review section */}
                      {v.llm_review_round > 0 && (
                        <div className="mt-2 border-t border-[var(--color-border-default)] pt-2">
                          {/* Toggle findings button */}
                          <button
                            onClick={() => toggleFindings(v.id)}
                            className="text-[12px] text-[var(--color-accent)] hover:underline flex items-center gap-1"
                          >
                            <ShieldIcon className="w-3 h-3" />
                            {isExpanded ? "收起扫描结果" : "查看扫描结果"}
                            {allReports.length > 0 && (
                              <span className="text-[var(--color-text-tertiary)]">({allReports.length} 份报告)</span>
                            )}
                          </button>

                          {/* Expanded findings */}
                          {isExpanded && (
                            <div className="mt-2 space-y-2">
                              {allReports.length === 0 ? (
                                <p className="text-[12px] text-[var(--color-text-tertiary)] py-2">正在加载...</p>
                              ) : (
                                <>
                                  {/* Group by review round */}
                                  {(() => {
                                    const rounds = [...new Set(allReports.map((r) => r.review_round))].sort((a, b) => b - a);
                                    return rounds.map((round) => {
                                      const roundReports = allReports.filter((r) => r.review_round === round);
                                      return (
                                        <div key={round} className="border border-[var(--color-border-default)] rounded-md overflow-hidden">
                                          <div className="px-3 py-1.5 bg-[var(--color-bg-subtle)] text-[12px] font-medium text-[var(--color-text-secondary)] flex items-center justify-between">
                                            <span>第 {round} 轮扫描</span>
                                            <span className={
                                              roundReports.some((r) => r.status === "failed" || r.risk_level === "critical" || r.risk_level === "high")
                                                ? "text-[var(--color-danger)]"
                                                : "text-[var(--color-success)]"
                                            }>
                                              {roundReports.some((r) => r.status === "failed" || r.risk_level === "critical" || r.risk_level === "high") ? "有问题" : "低风险"}
                                            </span>
                                          </div>
                                          <div className="divide-y divide-[var(--color-border-default)]">
                                            {roundReports.map((report) => {
                                              const findings = (report.findings || []) as Finding[];
                                              return (
                                                <div key={report.id} className="px-3 py-2">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-1 py-0.5 rounded text-[11px] border ${severityStyles[report.risk_level] || ""}`}>
                                                      {severityLabels[report.risk_level] || report.risk_level}
                                                    </span>
                                                    <span className="text-[11px] text-[var(--color-text-tertiary)]">
                                                      {report.status === "passed" ? "通过" : "未通过"} &middot; {findings.length} 项发现
                                                    </span>
                                                    <Link
                                                      href={`/scan-reports/${report.id}`}
                                                      className="text-[11px] text-[var(--color-accent)] hover:underline ml-auto"
                                                    >
                                                      详细报告
                                                    </Link>
                                                  </div>
                                                  {findings.length > 0 && (
                                                    <div className="space-y-1 mt-1">
                                                      {findings.slice(0, 5).map((f, fi) => (
                                                        <div key={fi} className="flex items-start gap-1.5 text-[11px]">
                                                          <WarningIcon className={`w-3 h-3 mt-0.5 shrink-0 ${f.severity === "critical" || f.severity === "high" ? "text-[var(--color-danger)]" : "text-[var(--color-warning)]"}`} />
                                                          <span className="text-[var(--color-text-secondary)]">{f.message}</span>
                                                          <span className="text-[var(--color-text-tertiary)] shrink-0">{f.file}:{f.line}</span>
                                                        </div>
                                                      ))}
                                                      {findings.length > 5 && (
                                                        <p className="text-[11px] text-[var(--color-text-tertiary)] ml-4">...还有 {findings.length - 5} 项</p>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Release note */}
                      {v.release_note && (
                        <div className="text-[12px] text-[var(--color-text-tertiary)] mt-2">{v.release_note}</div>
                      )}
                      <div className="text-[12px] text-[var(--color-text-tertiary)] mt-1">
                        创建于 {new Date(v.created_at).toLocaleString("zh-CN")}
                        {v.published_at && ` · 发布于 ${new Date(v.published_at).toLocaleString("zh-CN")}`}
                      </div>

                      {/* Action buttons row */}
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--color-border-default)]">
                        {/* LLM Scan button */}
                        {v.status === "candidate" && canLLMScan(v) && (
                          <button
                            onClick={() => handleLLMScan(v.id)}
                            disabled={actingVersions[v.id]}
                            className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50 flex items-center gap-1"
                          >
                            <RefreshIcon className={`w-3 h-3 ${isScanning ? "animate-spin" : ""}`} />
                            {actingVersions[v.id] ? "启动中..." : v.llm_review_round > 0 ? `重新扫描 (第 ${v.llm_review_round + 1} 轮)` : "LLM 安全扫描"}
                          </button>
                        )}
                        {isScanning && (
                          <span className="text-[12px] text-[var(--color-accent)] animate-pulse">扫描进行中...</span>
                        )}

                        {/* Submit for human review */}
                        {canSubmitReview(v) && (
                          <button
                            onClick={() => handleSubmitReview(v.id)}
                            disabled={actingVersions[v.id]}
                            className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-success)] text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {actingVersions[v.id] ? "提交中..." : "提交人工审核"}
                          </button>
                        )}

                        {/* Pending human review indicator */}
                        {isPendingReview(v) && (
                          <span className="text-[12px] text-[var(--color-accent)] flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                            等待人工审核
                          </span>
                        )}

                        {/* Legacy submit (triggers LLM + auto-submit) */}
                        {v.status === "candidate" && v.llm_review_round === 0 && (
                          <button onClick={() => handleAction(v.id, "submit")} disabled={actingVersions[v.id]} className="px-2.5 py-1.5 text-[13px] font-medium rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50">
                            {actingVersions[v.id] ? "提交中..." : "一键提交"}
                          </button>
                        )}

                        {/* Publish */}
                        {v.status === "approved" && (
                          <button onClick={() => handleAction(v.id, "publish")} disabled={actingVersions[v.id]} className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50">
                            {actingVersions[v.id] ? "发布中..." : "发布"}
                          </button>
                        )}

                        {/* Published actions */}
                        {v.status === "published" && (
                          <>
                            <button onClick={() => setInstallModal(v)} className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] flex items-center gap-1">
                              <DownloadIcon className="w-3 h-3" /> 安装
                            </button>
                            <button onClick={() => handleAction(v.id, "deprecate")} disabled={actingVersions[v.id]} className="px-2.5 py-1.5 text-[13px] font-medium rounded-md text-[var(--color-warning)] hover:bg-[var(--color-warning-subtle)] disabled:opacity-50">废弃</button>
                            <button onClick={() => handleAction(v.id, "block")} disabled={actingVersions[v.id]} className="px-2.5 py-1.5 text-[13px] font-medium rounded-md text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] disabled:opacity-50">阻断</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Security info card */}
          <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
            <h3 className="text-[14px] font-semibold mb-3 flex items-center gap-2">
              <ShieldIcon className="w-4 h-4 text-[var(--color-success)]" />
              安全信息
            </h3>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">可信等级</span>
                <span className={`font-medium ${latestVersion?.trust_grade === "A" || latestVersion?.trust_grade === "B" ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}`}>
                  {latestVersion?.trust_grade ? `${latestVersion.trust_grade} 级` : "未评级"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">版本数</span>
                <span className="font-medium">{versions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">最新版本</span>
                <span className="font-medium">{latestVersion?.version || "-"}</span>
              </div>
            </div>
          </div>

          {/* Tags card */}
          <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
            <h3 className="text-[14px] font-semibold mb-3 flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-[var(--color-purple)]" />
              标签
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {skill.tags && skill.tags.length > 0 ? (
                skill.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-[var(--color-bg-subtle)] rounded-md text-[12px] text-[var(--color-text-secondary)]">{t}</span>
                ))
              ) : (
                <span className="text-[12px] text-[var(--color-text-tertiary)]">暂无标签</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Install modal */}
      {installModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setInstallModal(null)}>
          <div className="bg-[var(--color-bg-default)] rounded-md border border-[var(--color-border-default)] p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[14px] text-[var(--color-text-primary)]">安装技能</h3>
              <button onClick={() => setInstallModal(null)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">技能</span>
                <span className="font-medium text-[var(--color-text-primary)]">{skill.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">版本</span>
                <span className="font-mono text-[var(--color-text-primary)]">{installModal.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">可信等级</span>
                <span className="font-medium text-[var(--color-text-primary)]">{installModal.trust_grade || "-"} 级</span>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-md bg-[var(--color-bg-subtle)] border border-[var(--color-border-default)]">
              <p className="text-[12px] text-[var(--color-text-secondary)] mb-2">通过 CLI 安装：</p>
              <code className="text-[12px] font-mono text-[var(--color-text-primary)] break-all select-all">
                skillhub install {skill.namespace?.path || "default"}/{skill.name}@{installModal.version}
              </code>
            </div>
            <button
              onClick={() => setInstallModal(null)}
              className="mt-4 w-full px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)]"
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
