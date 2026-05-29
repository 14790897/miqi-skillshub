package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Install struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID          uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	SkillVersionID  uuid.UUID `gorm:"type:uuid;not null;index" json:"skill_version_id"`
	ClientType      string    `gorm:"size:64;not null" json:"client_type"`
	TargetScope     string    `gorm:"size:64;not null;default:'personal'" json:"target_scope"`
	InstalledAt     time.Time `json:"installed_at"`
}

func (i *Install) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

func (Install) TableName() string {
	return "installs"
}
