package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type VersionStatus string

const (
	VersionCandidate  VersionStatus = "candidate"
	VersionApproved   VersionStatus = "approved"
	VersionPublished  VersionStatus = "published"
	VersionBlocked    VersionStatus = "blocked"
	VersionDeprecated VersionStatus = "deprecated"
)

type TrustGrade string

const (
	TrustGradeA TrustGrade = "A"
	TrustGradeB TrustGrade = "B"
	TrustGradeC TrustGrade = "C"
	TrustGradeD TrustGrade = "D"
	TrustGradeF TrustGrade = "F"
)

type SkillType string

const (
	SkillTypePromptOnly          SkillType = "prompt_only"
	SkillTypePromptWithRefs      SkillType = "prompt_with_references"
	SkillTypePromptWithScripts   SkillType = "prompt_with_scripts"
	SkillTypeWorkflow            SkillType = "workflow_skill"
	SkillTypeMCPAdapter          SkillType = "mcp_adapter_skill"
)

type SkillManifest struct {
	APIVersion  string              `json:"apiVersion"`
	Kind        string              `json:"kind"`
	Metadata    ManifestMetadata    `json:"metadata"`
	Spec        ManifestSpec        `json:"spec"`
	Security    ManifestSecurity    `json:"security"`
}

type ManifestMetadata struct {
	Name        string   `json:"name"`
	Namespace   string   `json:"namespace"`
	DisplayName string   `json:"displayName"`
	Description string   `json:"description"`
	Owner       string   `json:"owner"`
	Maintainers []string `json:"maintainers"`
	Tags        []string `json:"tags"`
}

type ManifestSpec struct {
	Version       string        `json:"version"`
	Type          SkillType     `json:"type"`
	Audience      []string      `json:"audience"`
	Languages     []string      `json:"languages"`
	Permissions   Permissions   `json:"permissions"`
	Runtime       Runtime       `json:"runtime"`
	DataPolicy    DataPolicy    `json:"dataPolicy"`
	Compatibility Compatibility `json:"compatibility"`
}

type Permissions struct {
	Filesystem     FilesystemPerm `json:"filesystem"`
	Network        string         `json:"network"`
	EnterpriseApis []string       `json:"enterpriseApis"`
	Secrets        []string       `json:"secrets"`
}

type FilesystemPerm struct {
	Read  string `json:"read"`
	Write string `json:"write"`
}

type Runtime struct {
	RequiresShell bool     `json:"requiresShell"`
	Dependencies  []string `json:"dependencies"`
}

type DataPolicy struct {
	AllowedDataClasses    []string `json:"allowedDataClasses"`
	ProhibitedDataClasses []string `json:"prohibitedDataClasses"`
}

type Compatibility struct {
	Clients []string `json:"clients"`
}

type ManifestSecurity struct {
	PolicyProfile      string   `json:"policyProfile"`
	RequiredReviewers  []string `json:"requiredReviewers"`
}

type SkillVersion struct {
	ID             uuid.UUID     `gorm:"type:uuid;primaryKey" json:"id"`
	SkillID        uuid.UUID     `gorm:"type:uuid;not null;index;uniqueIndex:idx_skill_version" json:"skill_id"`
	Version        string        `gorm:"size:64;not null;uniqueIndex:idx_skill_version" json:"version"`
	Status         VersionStatus `gorm:"size:32;not null;default:'candidate'" json:"status"`
	ArtifactURI    string        `gorm:"size:1024" json:"artifact_uri"`
	ArtifactSHA256 string        `gorm:"size:64" json:"artifact_sha256"`
	Manifest       json.RawMessage `gorm:"type:jsonb" json:"manifest"`
	ReleaseNote      string        `gorm:"type:text" json:"release_note"`
	TrustGrade       TrustGrade    `gorm:"size:4" json:"trust_grade"`
	LLMReviewRound   int           `gorm:"not null;default:0" json:"llm_review_round"`
	LLMReviewStatus  string        `gorm:"size:32;not null;default:'pending'" json:"llm_review_status"`
	CreatedBy      uuid.UUID     `gorm:"type:uuid;not null" json:"created_by"`
	PublishedBy    *uuid.UUID    `gorm:"type:uuid" json:"published_by,omitempty"`
	CreatedAt      time.Time     `json:"created_at"`
	PublishedAt    *time.Time    `json:"published_at,omitempty"`
	UpdatedAt      time.Time     `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Skill       Skill        `gorm:"foreignKey:SkillID" json:"skill,omitempty"`
	ScanReports []ScanReport `gorm:"foreignKey:SkillVersionID" json:"scan_reports,omitempty"`
	Reviews     []Review     `gorm:"foreignKey:SkillVersionID" json:"reviews,omitempty"`
}

func (v *SkillVersion) BeforeCreate(tx *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}

func (SkillVersion) TableName() string {
	return "skill_versions"
}
