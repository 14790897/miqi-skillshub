"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { searchSkills, listSkills } from "@/lib/api";
import type { Skill } from "@/lib/types";
import { SearchIcon, TagIcon, ClockIcon } from "@/components/icons";

const trustGrades = ["A", "B", "C", "D", "F"];

function SkillListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlQuery = searchParams.get("q") || "";
  const urlTag = searchParams.get("tag") || "";
  const [query, setQuery] = useState(urlQuery);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (selectedGrade) filters.grade = selectedGrade;
      if (selectedType) filters.type = selectedType;
      if (urlTag) filters.tag = urlTag;
      if (selectedDepartment) filters.department = selectedDepartment;

      if (urlQuery) {
        const res = await searchSkills(urlQuery, filters);
        setSkills(res.skills);
        setTotal(res.total);
      } else {
        const res = await listSkills(filters);
        setSkills(res.skills ?? []);
        setTotal(res.total ?? 0);
      }
    } catch {
      setError("加载技能列表失败，请检查网络连接后重试");
      setSkills([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [urlQuery, urlTag, selectedGrade, selectedType, selectedDepartment]);

  useEffect(() => {
    setQuery(urlQuery);
    fetch();
  }, [fetch, urlQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (selectedGrade) params.set("grade", selectedGrade);
    if (selectedType) params.set("type", selectedType);
    router.push(`/skills?${params.toString()}`);
  };

  const GradeButton = ({ grade }: { grade: string }) => {
    // Color per grade – green for A, blue for B, amber for C, orange for D, red for F
    const activeColors: Record<string, string> = {
      A: "bg-[var(--color-success-subtle)] border-[var(--color-success)] text-[var(--color-success)]",
      B: "bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-accent)]",
      C: "bg-[var(--color-warning-subtle)] border-[var(--color-warning)] text-[var(--color-warning)]",
      D: "bg-orange-50 border-orange-500 text-orange-600",
      F: "bg-[var(--color-danger-subtle)] border-[var(--color-danger)] text-[var(--color-danger)]",
    };
    const active = selectedGrade === grade;
    return (
      <button
        onClick={() => setSelectedGrade(active ? "" : grade)}
        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors ${
          active
            ? activeColors[grade]
            : "bg-[var(--color-bg-default)] border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
        }`}
      >
        {grade}
      </button>
    );
  };

  return (
    <div className="max-w-[960px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">技能市场</h1>
        <Link
          href="/skills/create"
          className="px-3 py-1.5 bg-[var(--color-accent)] text-white text-[13px] font-medium rounded-md hover:bg-[var(--color-accent-emphasis)] transition-colors"
        >
          创建技能
        </Link>
      </div>

      <div className="space-y-3 mb-8">
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-2 p-1.5 bg-[var(--color-bg-default)] rounded-md border border-[var(--color-border-default)] shadow-[0_1px_0_rgba(27,31,36,0.04)] focus-within:ring-2 focus-within:ring-[var(--color-accent)] focus-within:ring-offset-1">
            <SearchIcon className="w-4 h-4 text-[var(--color-text-tertiary)] ml-2 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="关键词搜索..."
              className="flex-1 bg-transparent text-[14px] py-1.5 outline-none placeholder:text-[var(--color-text-tertiary)] text-[var(--color-text-primary)]"
            />
            <button type="submit" className="px-3 py-1.5 bg-[var(--color-accent)] text-white text-[13px] font-medium rounded-md hover:bg-[var(--color-accent-emphasis)] transition-colors">
              搜索
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">等级:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedGrade("")}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${
                  !selectedGrade
                    ? "bg-[var(--color-accent-subtle)] border-[var(--color-accent)] text-[var(--color-accent)]"
                    : "bg-[var(--color-bg-default)] border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                }`}
              >
                全部
              </button>
              {trustGrades.map((g) => (
                <GradeButton key={g} grade={g} />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">部门:</span>
            <input
              type="text"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              placeholder="输入部门..."
              className="w-32 px-2 py-1 text-[12px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] placeholder:text-[var(--color-text-tertiary)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--color-text-secondary)] font-medium">类型:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2 py-1 text-[12px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              <option value="">全部</option>
              <option value="prompt_only">纯指令</option>
              <option value="prompt_with_references">指令+参考资料</option>
              <option value="prompt_with_scripts">指令+脚本</option>
            </select>
          </div>
        </div>

        {urlTag && (
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-[var(--color-text-secondary)]">过滤标签:</span>
            <span className="px-2 py-0.5 bg-[var(--color-accent-subtle)] text-[var(--color-accent)] rounded-md font-medium text-[11px]">{urlTag}</span>
            <button onClick={() => router.push("/skills")} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)]">清除</button>
          </div>
        )}
      </div>

      <div className="text-[12px] text-[var(--color-text-secondary)] mb-4">
        {total > 0 ? `${total} 个技能` : "无结果"}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-subtle)] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-14 rounded-md border border-dashed border-[var(--color-danger)] bg-[var(--color-danger-subtle)]">
          <p className="text-[var(--color-danger)] text-[13px]">{error}</p>
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-14 rounded-md border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-subtle)]">
          <p className="text-[var(--color-text-secondary)] text-[13px]">没有找到技能</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {skills.map((skill) => (
            <Link
              key={skill.id}
              href={`/skills/${skill.id}`}
              className="block p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] hover:border-[var(--color-accent)] hover:shadow-[0_1px_0_rgba(27,31,36,0.04)] transition-all"
            >
              <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-1">{skill.display_name || skill.name}</h3>
              <p className="text-[12px] text-[var(--color-text-secondary)] line-clamp-2 mb-2.5">{skill.description || "暂无描述"}</p>
              <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-tertiary)]">
                <TagIcon className="w-3 h-3" />
                <span>{skill.tags?.join(", ") || skill.namespace?.path || "-"}</span>
                <span className="text-[var(--color-border-default)]">|</span>
                <ClockIcon className="w-3 h-3" />
                <span>{new Date(skill.updated_at).toLocaleDateString("zh-CN")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SkillListPage() {
  return (
    <Suspense fallback={<div className="max-w-[960px] mx-auto px-6 py-16 text-center text-[var(--color-text-secondary)] text-[13px]">加载中...</div>}>
      <SkillListContent />
    </Suspense>
  );
}
