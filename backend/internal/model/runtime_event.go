package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RuntimeEvent struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	SkillName         string     `gorm:"size:512;not null;index" json:"skill_name"`
	Version           string     `gorm:"size:64;not null" json:"version"`
	UserID            uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	ClientType        string     `gorm:"size:64;not null" json:"client_type"`
	ExecutionID       string     `gorm:"size:128;uniqueIndex" json:"execution_id"`
	StartTime         time.Time  `json:"start_time"`
	EndTime           *time.Time `json:"end_time,omitempty"`
	Success           *bool      `json:"success,omitempty"`
	ErrorType         string     `gorm:"size:256" json:"error_type,omitempty"`
	AccessedSensitive bool       `json:"accessed_sensitive"`
	TokenUsage        int64      `json:"token_usage"`
	CreatedAt         time.Time  `json:"created_at"`
}

func (e *RuntimeEvent) BeforeCreate(tx *gorm.DB) error {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return nil
}

func (RuntimeEvent) TableName() string {
	return "runtime_events"
}

// MigrateAll runs auto migration for all models
func MigrateAll(db *gorm.DB) error {
	// Drop old unique index on reviews(skill_version_id, reviewer_id) if it exists.
	// GORM AutoMigrate adds indexes but never removes them, so old uniqueIndex
	// tags must be cleaned up manually when the schema changes.
	db.Exec("DROP INDEX IF EXISTS idx_version_reviewer")
	db.Exec("DROP INDEX IF EXISTS idx_reviews_idx_version_reviewer")

	return db.AutoMigrate(
		&User{},
		&Namespace{},
		&Skill{},
		&SkillVersion{},
		&ScanReport{},
		&Review{},
		&Install{},
		&AuditLog{},
		&RuntimeEvent{},
		&Team{},
		&TeamMember{},
		&LLMConfig{},
	)
}
