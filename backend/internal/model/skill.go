package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SkillStatus string

const (
	SkillStatusActive     SkillStatus = "active"
	SkillStatusDeprecated SkillStatus = "deprecated"
	SkillStatusArchived   SkillStatus = "archived"
)

type SkillVisibility string

const (
	VisibilityPrivate SkillVisibility = "private"
	VisibilityTeam    SkillVisibility = "team"
	VisibilityOrg     SkillVisibility = "org"
)

type Skill struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	NamespaceID uuid.UUID      `gorm:"type:uuid;not null;index;uniqueIndex:idx_namespace_skill" json:"namespace_id"`
	Name        string         `gorm:"size:255;not null;uniqueIndex:idx_namespace_skill" json:"name"`
	DisplayName string         `gorm:"size:512;not null" json:"display_name"`
	Description string         `gorm:"type:text" json:"description"`
	OwnerID     uuid.UUID      `gorm:"type:uuid;not null" json:"owner_id"`
	Visibility  SkillVisibility `gorm:"size:32;not null;default:'team'" json:"visibility"`
	Status      SkillStatus    `gorm:"size:32;not null;default:'active'" json:"status"`
	Tags             []string       `gorm:"serializer:json" json:"tags"`
	LatestVersionID  *uuid.UUID     `gorm:"type:uuid" json:"latest_version_id,omitempty"`
	StableVersionID  *uuid.UUID     `gorm:"type:uuid" json:"stable_version_id,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Namespace Namespace      `gorm:"foreignKey:NamespaceID" json:"namespace,omitempty"`
	Versions  []SkillVersion `gorm:"foreignKey:SkillID" json:"versions,omitempty"`
}

func (s *Skill) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (Skill) TableName() string {
	return "skills"
}
