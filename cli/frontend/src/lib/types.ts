export interface Skill {
  id: string;
  namespace_id: string;
  name: string;
  display_name: string;
  description: string;
  owner_id: string;
  visibility: "private" | "team" | "org";
  status: "active" | "deprecated" | "archived";
  tags: string[];
  latest_version_id?: string | null;
  stable_version_id?: string | null;
  created_at: string;
  updated_at: string;
  namespace?: Namespace;
  versions?: SkillVersion[];
}

export interface Namespace {
  id: string;
  parent_id?: string;
  path: string;
  display_name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface SkillVersion {
  id: string;
  skill_id: string;
  version: string;
  status: "candidate" | "approved" | "published" | "blocked" | "deprecated";
  artifact_uri: string;
  artifact_sha256: string;
  manifest: Record<string, unknown> | null;
  release_note: string;
  trust_grade: "A" | "B" | "C" | "D" | "F" | "";
  llm_review_round: number;
  llm_review_status: "pending" | "scanning" | "completed" | "failed" | "ready_for_human";
  created_by: string;
  published_by: string | null;
  created_at: string;
  published_at: string | null;
  updated_at: string;
  scan_reports?: ScanReport[];
  reviews?: Review[];
}

export interface ScanReport {
  id: string;
  skill_version_id: string;
  scanner_name: string;
  scanner_version: string;
  status: "passed" | "failed" | "error";
  risk_level: "info" | "low" | "medium" | "high" | "critical";
  findings: Finding[];
  review_round: number;
  started_at: string;
  completed_at: string;
  created_at: string;
}

export interface Finding {
  file: string;
  line: number;
  rule: string;
  severity: string;
  message: string;
  evidence?: string;
}

export interface Review {
  id: string;
  skill_version_id: string;
  reviewer_id: string;
  decision: "approved" | "changes_requested" | "rejected" | "";
  comment: string;
  created_at: string;
  updated_at: string;
  reviewer?: User;
  skill_version?: SkillVersion & { skill?: Skill };
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  ip: string;
  user_agent: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SkillsResponse {
  skills: Skill[];
  total: number;
}

export interface NamespacesResponse {
  namespaces: Namespace[];
}

export interface VersionsResponse {
  versions: SkillVersion[];
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
}

export interface SearchResult {
  skills: Skill[];
  total: number;
}

export interface AuditResponse {
  logs: AuditLog[];
  total: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  roles: string[];
  department: string;
  avatar_url: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileStats {
  skill_count: number;
  version_count: number;
  review_count: number;
}

export interface ProfileResponse {
  user: User;
  stats: ProfileStats;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
}

export interface OAuthUserInfo {
  id: string;
  username: string;
  email: string;
  display_name: string;
  roles: string[];
  department: string;
  avatar_url: string;
}

export interface Team {
  id: string;
  name: string;
  display_name: string;
  description: string;
  department: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "admin" | "member";
  team?: Team;
  user?: User;
}

export interface TeamsResponse {
  teams: Team[];
  total: number;
}

export interface TeamMembersResponse {
  members: TeamMember[];
}
