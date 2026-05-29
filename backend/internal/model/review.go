package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ReviewDecision string

const (
	DecisionApproved         ReviewDecision = "approved"
	DecisionChangesRequested ReviewDecision = "changes_requested"
	DecisionRejected         ReviewDecision = "rejected"
)

type Review struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	SkillVersionID uuid.UUID      `gorm:"type:uuid;not null;index" json:"skill_version_id"`
	ReviewerID     uuid.UUID      `gorm:"type:uuid;not null;index" json:"reviewer_id"`
	Decision       ReviewDecision `gorm:"size:32;not null" json:"decision"`
	Comment        string         `gorm:"type:text" json:"comment"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`

	Reviewer     User         `gorm:"foreignKey:ReviewerID" json:"reviewer,omitempty"`
	SkillVersion SkillVersion `gorm:"foreignKey:SkillVersionID" json:"skill_version,omitempty"`
}

func (r *Review) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

func (Review) TableName() string {
	return "reviews"
}
