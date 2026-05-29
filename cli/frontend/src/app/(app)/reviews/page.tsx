"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { listPendingReviews, approveReview, requestChanges, rejectReview, listScanReports } from "@/lib/api";
import type { Review, ScanReport, Finding } from "@/lib/types";
import { ShieldIcon, CheckIcon, WarningIcon, CloseIcon } from "@/components/icons";

const reviewerRoles = ["security_reviewer", "maintainer", "platform_admin"];

const severityLabels: Record<string, string> = {
  info: "信息", low: "低", medium: "中", high: "高", critical: "严重",
};

export default function ReviewWorkbenchPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("skillhub_user");
      if (raw) {
        const user = JSON.parse(raw);
        const roles: string[] = user.roles || [];
        setCanReview(roles.some((r) => reviewerRoles.includes(r)));
      }
    } catch {}
  }, []);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [scanCache, setScanCache] = useState<Record<string, ScanReport[]>>({});
  const [expandedScans, setExpandedScans] = useState<Record<string, boolean>>({});

  const fetch = useCallback(async () => {
    try {
      const data = await listPendingReviews();
      setReviews(data.reviews ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const loadScans = async (vid: string) => {
    if (scanCache[vid]) return scanCache[vid];
    try {
      const res = await listScanReports(vid);
      const reports = res.scan_reports ?? [];
      setScanCache((prev) => ({ ...prev, [vid]: reports }));
      return reports;
    } catch { return []; }
  };

  const toggleScans = async (vid: string) => {
    if (expandedScans[vid]) {
      setExpandedScans((prev) => ({ ...prev, [vid]: false }));
    } else {
      setExpandedScans((prev) => ({ ...prev, [vid]: true }));
      await loadScans(vid);
    }
  };

  const handleAction = async (reviewId: string, action: "approve" | "changes" | "reject") => {
    const comment = comments[reviewId] || "";
    setActionErrors((prev) => ({ ...prev, [reviewId]: "" }));
    setSubmitting((prev) => ({ ...prev, [reviewId]: true }));
    try {
      if (action === "approve") await approveReview(reviewId, comment);
      else if (action === "changes") await requestChanges(reviewId, comment);
      else if (action === "reject") await rejectReview(reviewId, comment);
      setComments((prev) => ({ ...prev, [reviewId]: "" }));
      await fetch();
    } catch (e: unknown) {
      setActionErrors((prev) => ({ ...prev, [reviewId]: e instanceof Error ? e.message : "操作失败" }));
    } finally {
      setSubmitting((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">审核工作台</h1>
        <span className="text-[13px] text-[var(--color-text-secondary)]">{reviews.length} 个待审核</span>
      </div>

      {!canReview ? (
        <div className="text-center py-16 bg-[var(--color-bg-default)] rounded-md border border-[var(--color-border-default)]">
          <ShieldIcon className="w-10 h-10 text-[var(--color-text-tertiary)] mx-auto mb-3 opacity-40" />
          <h2 className="text-[16px] font-medium text-[var(--color-text-primary)] mb-1">无权限</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">审核工作台仅供安全审核员、维护者和平台管理员使用。</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-md bg-[var(--color-bg-default)] border border-[var(--color-border-default)] animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 bg-[var(--color-bg-default)] rounded-md border border-[var(--color-border-default)]">
          <ShieldIcon className="w-10 h-10 text-[var(--color-success)] mx-auto mb-3 opacity-40" />
          <h2 className="text-[16px] font-medium text-[var(--color-text-primary)] mb-1">全部完成！</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)]">当前没有待审核的内容。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const sv = review.skill_version;
            const skill = sv?.skill;
            const reports = scanCache[sv?.id ?? ""] ?? [];
            const latestRound = sv?.llm_review_round ?? 0;
            const isExpanded = expandedScans[sv?.id ?? ""];

            return (
              <div key={review.id} className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
                {/* Review header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={skill ? `/skills/${skill.id}` : "#"}
                        className="font-semibold text-[14px] text-[var(--color-accent)] hover:underline"
                      >
                        {skill?.display_name || skill?.name || "未知技能"}
                      </Link>
                      {sv && (
                        <span className="font-mono text-[12px] text-[var(--color-text-secondary)]">v{sv.version}</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      提交时间: {new Date(review.created_at).toLocaleString("zh-CN")}
                      {latestRound > 0 && ` · 已通过 ${latestRound} 轮 LLM 扫描`}
                    </p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border border-[var(--color-warning)] shrink-0">
                    待审核
                  </span>
                </div>

                {/* Scan reports toggle */}
                {latestRound > 0 && (
                  <div className="mb-3">
                    <button
                      onClick={() => toggleScans(sv?.id ?? "")}
                      className="text-[12px] text-[var(--color-accent)] hover:underline flex items-center gap-1"
                    >
                      <ShieldIcon className="w-3 h-3" />
                      {isExpanded ? "收起扫描结果" : "查看 LLM 扫描结果"}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                        {reports.length === 0 ? (
                          <p className="text-[12px] text-[var(--color-text-tertiary)]">加载中...</p>
                        ) : (
                          reports
                            .sort((a, b) => b.review_round - a.review_round)
                            .map((r) => {
                              const findings = (r.findings || []) as Finding[];
                              return (
                                <div key={r.id} className="flex items-center gap-2 text-[12px] py-1 px-2 rounded bg-[var(--color-bg-subtle)]">
                                  <span className="text-[var(--color-text-tertiary)]">第 {r.review_round} 轮</span>
                                  <span className={
                                    r.risk_level === "critical" || r.risk_level === "high"
                                      ? "text-[var(--color-danger)]"
                                      : r.risk_level === "medium"
                                      ? "text-[var(--color-warning)]"
                                      : "text-[var(--color-success)]"
                                  }>
                                    {severityLabels[r.risk_level] || r.risk_level}
                                  </span>
                                  <span className="text-[var(--color-text-tertiary)]">{findings.length} 项</span>
                                  <Link href={`/scan-reports/${r.id}`} className="text-[var(--color-accent)] hover:underline ml-auto">详情</Link>
                                </div>
                              );
                            })
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {actionErrors[review.id] && (
                  <div className="mb-3 px-3 py-2 rounded-md bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-[12px] border border-[var(--color-danger)]">
                    {actionErrors[review.id]}
                  </div>
                )}

                {/* Comment */}
                <div className="mb-3">
                  <textarea
                    value={comments[review.id] || ""}
                    onChange={(e) => setComments((prev) => ({ ...prev, [review.id]: e.target.value }))}
                    placeholder="输入审核意见..."
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(review.id, "approve")}
                    disabled={submitting[review.id]}
                    className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-success-subtle)] text-[var(--color-success)] border border-[var(--color-success)] hover:opacity-80 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                    批准
                  </button>
                  <button
                    onClick={() => handleAction(review.id, "changes")}
                    disabled={submitting[review.id]}
                    className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-warning-subtle)] text-[var(--color-warning)] border border-[var(--color-warning)] hover:opacity-80 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <WarningIcon className="w-3.5 h-3.5" />
                    请求修改
                  </button>
                  <button
                    onClick={() => handleAction(review.id, "reject")}
                    disabled={submitting[review.id]}
                    className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border border-[var(--color-danger)] hover:opacity-80 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                    拒绝
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
