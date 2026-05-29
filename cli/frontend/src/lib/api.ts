import type {
  Skill,
  SkillVersion,
  ScanReport,
  Review,
  AuditLog,
  Namespace,
  User,
  Team,
  TeamMember,
  SkillsResponse,
  NamespacesResponse,
  VersionsResponse,
  ReviewsResponse,
  SearchResult,
  AuditResponse,
  AuthResponse,
  ProfileResponse,
  TeamsResponse,
  TeamMembersResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8088/api/v1";

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("skillhub_token");
}

async function request<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  const t = token();
  if (t) headers["Authorization"] = `Bearer ${t}`;

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return {} as T;
}

// ── Skills ──────────────────────────────────────────────

export function listSkills(params?: Record<string, string>) {
  const q = params ? new URLSearchParams(params).toString() : "";
  return request<SkillsResponse>(`/skills${q ? "?" + q : ""}`);
}

export function getSkill(id: string) {
  return request<Skill>(`/skills/${id}`);
}

export function createSkill(data: Partial<Skill>) {
  return request<Skill>("/skills", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSkill(id: string, data: Partial<Skill>) {
  return request<Skill>(`/skills/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteSkill(id: string) {
  return request<void>(`/skills/${id}`, { method: "DELETE" });
}

// ── Versions ────────────────────────────────────────────

export function listVersions(skillId: string) {
  return request<VersionsResponse>(`/skills/${skillId}/versions`);
}

export function createVersion(skillId: string, data: Partial<SkillVersion>) {
  return request<SkillVersion>(`/skills/${skillId}/versions`, {
    method: "POST",
    body: JSON.stringify({ ...data, skill_id: skillId }),
  });
}

export function getVersion(vid: string) {
  return request<SkillVersion>(`/versions/${vid}`);
}

export function submitVersion(vid: string) {
  return request<SkillVersion>(`/versions/${vid}/submit`, { method: "POST" });
}

export function publishVersion(vid: string) {
  return request<SkillVersion>(`/versions/${vid}/publish`, { method: "POST" });
}

export function deprecateVersion(vid: string) {
  return request<SkillVersion>(`/versions/${vid}/deprecate`, { method: "POST" });
}

export function blockVersion(vid: string) {
  return request<SkillVersion>(`/versions/${vid}/block`, { method: "POST" });
}

export function triggerLLMScan(vid: string) {
  return request<{ message: string; version_id: string; round: number; status: string }>(`/versions/${vid}/llm-scan`, { method: "POST" });
}

export function submitForHumanReview(vid: string) {
  return request<{ message: string; version_id: string; status: string }>(`/versions/${vid}/submit-review`, { method: "POST" });
}

// ── Scan Reports ────────────────────────────────────────

export function triggerScan(vid: string) {
  return request<{ scan_reports: ScanReport[] }>(`/versions/${vid}/scan`, { method: "POST" });
}

export function listScanReports(vid: string) {
  return request<{ scan_reports: ScanReport[] }>(`/versions/${vid}/scan-reports`);
}

export function getScanReport(rid: string) {
  return request<ScanReport>(`/scan-reports/${rid}`);
}

// ── Artifact ──────────────────────────────────────────────

export async function uploadArtifact(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const t = token();
  const res = await fetch(`${BASE}/artifacts/upload`, {
    method: "POST",
    headers: t ? { Authorization: `Bearer ${t}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json() as Promise<{
    skill_md_content: string;
    file_count: number;
    total_size: number;
    sha256: string;
    artifact_uri: string;
  }>;
}

// ── Reviews ─────────────────────────────────────────────

export function listPendingReviews() {
  return request<ReviewsResponse>("/reviews/pending");
}

export function approveReview(id: string, comment?: string) {
  return request<Review>(`/reviews/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export function requestChanges(id: string, comment: string) {
  return request<Review>(`/reviews/${id}/request-changes`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export function rejectReview(id: string, comment: string) {
  return request<Review>(`/reviews/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

// ── Search ──────────────────────────────────────────────

export function searchSkills(query: string, filters?: Record<string, string>) {
  const params = new URLSearchParams({ q: query, ...filters });
  return request<SearchResult>(`/search/skills?${params}`);
}

// ── Namespaces ──────────────────────────────────────────

export function listNamespaces() {
  return request<NamespacesResponse>("/namespaces");
}

export function createNamespace(data: Partial<Namespace>) {
  return request<Namespace>("/namespaces", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Audit ───────────────────────────────────────────────

export function listAuditLogs(params?: Record<string, string>) {
  const q = params ? new URLSearchParams(params).toString() : "";
  return request<AuditResponse>(`/admin/audit${q ? "?" + q : ""}`);
}

// ── Auth ────────────────────────────────────────────────

export function register(email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// ── Profile ─────────────────────────────────────────────

export function getProfile() {
  return request<ProfileResponse>("/profile");
}

export function updateProfile(data: { display_name?: string; department?: string; avatar_url?: string }) {
  return request<User>("/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function changePassword(oldPassword: string, newPassword: string) {
  return request<{ message: string }>("/profile/change-password", {
    method: "POST",
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}

// ── Admin ────────────────────────────────────────────────

export function getLLMConfig() {
  return request<{ llm_config: { id: string; provider_url: string; api_key: string; model_name: string; is_enabled: boolean } | null }>("/admin/llm-config");
}

export function updateLLMConfig(data: { provider_url: string; api_key: string; model_name: string; is_enabled: boolean }) {
  return request<{ llm_config: { id: string; provider_url: string; api_key: string; model_name: string; is_enabled: boolean } }>("/admin/llm-config", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function listUsers(params?: Record<string, string>) {
  const q = params ? new URLSearchParams(params).toString() : "";
  return request<{ users: User[]; total: number }>(`/admin/users${q ? "?" + q : ""}`);
}

export function updateUserRoles(userId: string, roles: string[]) {
  return request<User>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ roles }),
  });
}

// ── Teams ──────────────────────────────────────────────────

export function listTeams(params?: Record<string, string>) {
  const q = params ? new URLSearchParams(params).toString() : "";
  return request<TeamsResponse>(`/teams${q ? "?" + q : ""}`);
}

export function getTeam(id: string) {
  return request<Team>(`/teams/${id}`);
}

export function createTeam(data: { name: string; display_name: string; description?: string; department?: string }) {
  return request<Team>("/teams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTeam(id: string, data: { display_name?: string; description?: string; department?: string }) {
  return request<Team>(`/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTeam(id: string) {
  return request<void>(`/teams/${id}`, { method: "DELETE" });
}

export function listTeamMembers(teamId: string) {
  return request<TeamMembersResponse>(`/teams/${teamId}/members`);
}

export function addTeamMember(teamId: string, userId: string, role: string) {
  return request<TeamMember>(`/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, role }),
  });
}

export function removeTeamMember(teamId: string, userId: string) {
  return request<void>(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}
