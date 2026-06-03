"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BellIcon } from "@/components/icons";

export default function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [username, setUsername] = useState("用户");
  const [isOAuth, setIsOAuth] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("skillhub_user");
      if (raw) {
        const user = JSON.parse(raw);
        setUsername(user.display_name || user.username || "用户");
        setIsOAuth(user.oauth === true);
      }
    } catch {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("skillhub_token");
    localStorage.removeItem("skillhub_user");
    router.push("/login");
  };

  return (
    <header className="h-12 bg-[var(--color-bg-default)] flex items-center justify-between px-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-1.5">
        <button
          className="p-1.5 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-default)] hover:text-[var(--color-text-primary)] transition-colors"
          title="通知"
        >
          <BellIcon className="w-3.5 h-3.5" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-default)] px-2 py-1 rounded-md transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-[10px] font-semibold text-white">
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium">{username}</span>
            {isOAuth && (
              <span
                className="text-[10px] px-1 py-0.5 rounded font-medium"
                style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-tertiary)", border: "1px solid var(--color-border-default)" }}
              >
                OAuth
              </span>
            )}
            <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-[var(--color-bg-default)] rounded-md border border-[var(--color-border-default)] shadow-[0_8px_24px_rgba(140,149,159,0.2)] py-1 z-50">
              <div className="px-3 py-1.5 border-b border-[var(--color-border-default)]">
                <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {username}
                </div>
              </div>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-1.5 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                个人中心
              </Link>
              <div className="border-t border-[var(--color-border-default)] mt-0.5 pt-0.5">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-1.5 text-[13px] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                >
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
