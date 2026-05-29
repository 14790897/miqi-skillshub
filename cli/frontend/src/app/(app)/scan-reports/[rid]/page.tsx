"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getScanReport, getVersion } from "@/lib/api";
import type { ScanReport, Finding } from "@/lib/types";
import { ShieldIcon, WarningIcon, CheckIcon } from "@/components/icons";

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

export default function ScanReportPage() {
  const { rid } = useParams<{ rid: string }>();
  const [report, setReport] = useState<ScanReport | null>(null);
  const [skillId, setSkillId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const r = await getScanReport(rid);
      setReport(r);
      try {
        const v = await getVersion(r.skill_version_id);
        setSkillId(v.skill_id);
      } catch {
        // ignore
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [rid]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="h-64 rounded-md bg-[var(--color-bg-default)] border border-[var(--color-border-default)] animate-pulse" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <ShieldIcon className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-3 opacity-30" />
        <h2 className="text-[16px] font-medium text-[var(--color-text-primary)] mb-1">报告未找到</h2>
        <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">您查找的扫描报告不存在。</p>
        <Link href="/" className="text-[13px] font-medium text-[var(--color-accent)] hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  const findings = (report.findings || []) as Finding[];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <Link
        href={skillId ? `/skills/${skillId}` : "/skills"}
        className="text-[12px] font-medium text-[var(--color-accent)] hover:underline mb-4 inline-block"
      >
        &larr; 返回技能详情
      </Link>

      {/* Report header */}
      <div className="flex items-start gap-3 mb-6">
        <ShieldIcon
          className={`w-8 h-8 mt-0.5 shrink-0 ${
            report.status === "passed"
              ? "text-[var(--color-success)]"
              : report.status === "failed"
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-warning)]"
          }`}
        />
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">安全扫描报告</h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
            {report.scanner_name} v{report.scanner_version} &middot; {new Date(report.completed_at).toLocaleString("zh-CN")}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
          <div className="text-[11px] text-[var(--color-text-tertiary)] mb-1 uppercase tracking-wide">状态</div>
          <div
            className={`text-[14px] font-semibold ${
              report.status === "passed"
                ? "text-[var(--color-success)]"
                : report.status === "failed"
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-warning)]"
            }`}
          >
            {report.status === "passed" ? "通过" : report.status === "failed" ? "未通过" : "错误"}
          </div>
        </div>
        <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
          <div className="text-[11px] text-[var(--color-text-tertiary)] mb-1 uppercase tracking-wide">风险等级</div>
          <span
            className={`inline-block px-1.5 py-0.5 rounded-md text-[11px] font-bold border ${
              severityStyles[report.risk_level] || ""
            }`}
          >
            {severityLabels[report.risk_level] || report.risk_level}
          </span>
        </div>
        <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
          <div className="text-[11px] text-[var(--color-text-tertiary)] mb-1 uppercase tracking-wide">发现项</div>
          <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">{findings.length}</div>
        </div>
      </div>

      {/* Findings section */}
      <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-3">发现项</h2>

      {findings.length === 0 ? (
        <div className="p-8 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] text-center">
          <CheckIcon className="w-10 h-10 text-[var(--color-success)] mx-auto mb-2 opacity-50" />
          <h3 className="text-[16px] font-medium text-[var(--color-text-primary)] mb-1">未发现问题</h3>
          <p className="text-[13px] text-[var(--color-text-secondary)]">该技能通过所有检查，未发现问题。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {findings.map((f, i) => {
            const isHighSeverity = f.severity === "critical" || f.severity === "high";
            return (
              <div
                key={i}
                className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]"
              >
                <div className="flex items-start gap-3">
                  <WarningIcon
                    className={`w-5 h-5 mt-0.5 shrink-0 ${
                      isHighSeverity
                        ? "text-[var(--color-danger)]"
                        : "text-[var(--color-warning)]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold border ${
                          severityStyles[f.severity] || ""
                        }`}
                      >
                        {severityLabels[f.severity] || f.severity}
                      </span>
                      <span className="text-[12px] font-mono text-[var(--color-text-tertiary)]">{f.rule}</span>
                    </div>
                    <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">{f.message}</p>
                    <p className="text-[12px] font-mono text-[var(--color-text-tertiary)] mt-1">
                      {f.file}{f.line ? `:${f.line}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
