"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * /callback — OAuth2 post-login landing page.
 *
 * The backend (handler/oauth_login.go) handles the full OAuth2 code exchange with
 * the Sandbox provider and then redirects here with:
 *
 *   /callback?token=<skillhub_jwt>
 *
 * This page simply:
 *   1. Reads the token from the URL query param.
 *   2. Stores it in localStorage (same place as normal login).
 *   3. Redirects to the home page.
 *
 * If the backend sent an error instead (e.g. /callback?error=...), it shows a
 * message and offers a link back to /login.
 */
function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = params.get("token");
    const error = params.get("error");
    const isOAuth = params.get("oauth") === "1";
    const provider = params.get("provider");

    if (error) {
      // Error from backend OAuth flow — stay on this page and show message.
      // The component will render the error UI below.
      return;
    }

    if (!token) {
      // No token and no error — redirect to login.
      router.replace("/login");
      return;
    }

    // Decode the JWT payload (base64url, no signature verification needed here)
    try {
      const [, payloadB64] = token.split(".");
      const padding = "=".repeat((4 - (payloadB64.length % 4)) % 4);
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/") + padding));

      // Build a minimal user object from JWT claims for UI use
      const user = {
        id: payload.user_id,
        username: payload.username,
        roles: payload.roles ?? [],
        oauth: isOAuth,
        oauth_provider: provider || "unknown",
      };

      localStorage.setItem("skillhub_token", token);
      localStorage.setItem("skillhub_user", JSON.stringify(user));
    } catch {
      // Malformed token — just store it and let the API calls fail naturally
      localStorage.setItem("skillhub_token", token);
    }

    router.replace("/");
  }, [params, router]);

  const error = params.get("error");
  const token = params.get("token");

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-subtle)]">
        <div className="w-full max-w-sm p-6 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] space-y-4 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--color-danger-subtle)] flex items-center justify-center mx-auto">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-[14px] font-medium text-[var(--color-text-primary)]">登录失败</p>
          <p className="text-[12px] text-[var(--color-text-secondary)]">{decodeURIComponent(error)}</p>
          <a
            href="/login"
            className="inline-block px-4 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] transition-colors"
          >
            返回登录
          </a>
        </div>
      </div>
    );
  }

  if (!token) {
    return null; // will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-subtle)]">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[13px] text-[var(--color-text-secondary)]">正在登录...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
