"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listSkills } from "@/lib/api";
import type { Skill } from "@/lib/types";
import { SearchIcon, TagIcon, ClockIcon } from "@/components/icons";

const departments = [
  { label: "人力资源", tag: "hr", color: "#0969da" },
  { label: "财务", tag: "finance", color: "#1a7f37" },
  { label: "行政", tag: "admin", color: "#8250df" },
  { label: "法务", tag: "legal", color: "#cf222e" },
  { label: "数据", tag: "data", color: "#9a6700" },
  { label: "研发", tag: "engineering", color: "#0550ae" },
  { label: "市场", tag: "marketing", color: "#1a7f37" },
  { label: "销售", tag: "sales", color: "#8250df" },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    listSkills().then((res) => setSkills(res.skills ?? [])).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/skills?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="max-w-[960px] mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-[26px] font-semibold tracking-tight text-[var(--color-text-primary)] mb-2">
          发现企业 AI 技能
        </h1>
        <p className="text-[14px] text-[var(--color-text-secondary)] max-w-lg">
          搜索、安装、创建可复用的 AI 工作能力，为每一个岗位赋能
        </p>

        <form onSubmit={handleSearch} className="mt-5 max-w-xl">
          <div className="flex items-center gap-2 p-1.5 bg-[var(--color-bg-default)] rounded-xl shadow-[var(--shadow-card)] focus-within:ring-2 focus-within:ring-[var(--color-accent)] focus-within:ring-offset-2 transition-shadow">
            <SearchIcon className="w-4 h-4 text-[var(--color-text-tertiary)] ml-2 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索技能，例如：报销检查、会议纪要、数据清洗..."
              className="flex-1 bg-transparent text-[14px] py-1.5 outline-none placeholder:text-[var(--color-text-tertiary)] text-[var(--color-text-primary)]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-[var(--color-accent)] text-white text-[13px] font-medium rounded-md hover:bg-[var(--color-accent-emphasis)] transition-colors"
            >
              搜索
            </button>
          </div>
        </form>
      </div>

      <section className="mb-10">
        <h2 className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
          按部门浏览
        </h2>
        <div className="grid grid-cols-4 gap-2.5">
          {departments.map((d) => (
            <Link
              key={d.tag}
              href={`/skills?tag=${d.tag}`}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--color-bg-default)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-all duration-200"
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[11px] font-bold"
                style={{ backgroundColor: d.color }}
              >
                {d.label[0]}
              </div>
              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{d.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            最近更新
          </h2>
          <Link href="/skills" className="text-[13px] text-[var(--color-accent)] hover:underline font-medium">
            查看全部 &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-[var(--color-bg-default)] shadow-[var(--shadow-card)] animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-14 rounded-xl bg-[var(--color-bg-default)] shadow-[var(--shadow-card)]">
            <p className="text-[var(--color-text-secondary)] text-[13px]">加载失败，请刷新页面重试</p>
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-14 rounded-xl bg-[var(--color-bg-default)] shadow-[var(--shadow-card)]">
            <svg className="w-10 h-10 mx-auto mb-3 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[var(--color-text-secondary)] text-[13px]">还没有技能。成为第一个创建技能的人吧！</p>
            <Link href="/skills/create" className="inline-block mt-3 px-3 py-1.5 bg-[var(--color-accent)] text-white text-[13px] font-medium rounded-md hover:bg-[var(--color-accent-emphasis)] transition-colors">
              创建技能
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {skills.slice(0, 8).map((skill) => (
              <Link
                key={skill.id}
                href={`/skills/${skill.id}`}
                className="block p-4 rounded-xl bg-[var(--color-bg-default)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-all duration-200"
              >
                <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-1">
                  {skill.display_name || skill.name}
                </h3>
                <p className="text-[12px] text-[var(--color-text-secondary)] line-clamp-2 mb-2.5">
                  {skill.description || "暂无描述"}
                </p>
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
      </section>
    </div>
  );
}
