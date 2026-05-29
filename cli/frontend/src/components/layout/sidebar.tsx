"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SearchIcon, ShieldIcon, PlusIcon, UserIcon, FolderIcon, ClipboardIcon } from "../icons";

const reviewerRoles = ["security_reviewer", "maintainer", "platform_admin"];

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

const adminItems = [
  { href: "/teams", label: "团队管理", icon: UserIcon },
  { href: "/admin/users", label: "用户管理", icon: UserIcon },
  { href: "/admin/namespaces", label: "命名空间", icon: FolderIcon },
  { href: "/admin/llm-settings", label: "LLM 扫描配置", icon: SettingsIcon },
  { href: "/admin/audit", label: "审计日志", icon: ClipboardIcon },
];

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
        active
          ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent-emphasis)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("skillhub_user");
      if (raw) {
        const user = JSON.parse(raw);
        setUserRoles(user.roles || []);
      }
    } catch {}
  }, []);

  const canReview = userRoles.some((r) => reviewerRoles.includes(r));

  const mainItems = [
    { href: "/", label: "首页", icon: HomeIcon },
    { href: "/skills", label: "技能市场", icon: SearchIcon },
    { href: "/skills/create", label: "创建技能", icon: PlusIcon },
    ...(canReview ? [{ href: "/reviews", label: "审核工作台", icon: ShieldIcon }] : []),
  ];

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <aside className="w-[232px] shrink-0 border-r border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
      <div className="flex items-center gap-2 h-12 px-4">
        <div className="w-6 h-6 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.9"/>
            <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-semibold text-[14px] text-[var(--color-text-primary)] tracking-tight">SkillHub</span>
      </div>

      <nav className="p-2 space-y-4">
        <div className="space-y-0.5">
          {mainItems.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>
        <div className="space-y-0.5">
          <p className="px-2.5 text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-1">
            管理
          </p>
          {adminItems.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
