package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditLog struct {
	ID           uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	ActorID      *uuid.UUID      `gorm:"type:uuid;index" json:"actor_id,omitempty"`
	Action       string          `gorm:"size:128;not null;index" json:"action"`
	ResourceType string          `gorm:"size:64;not null;index" json:"resource_type"`
	ResourceID   string          `gorm:"size:256" json:"resource_id"`
	IP           string          `gorm:"size:64" json:"ip"`
	UserAgent    string          `gorm:"size:512" json:"user_agent"`
	Metadata     json.RawMessage `gorm:"type:jsonb" json:"metadata"`
	CreatedAt    time.Time       `json:"created_at"`
}

func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

func (AuditLog) TableName() string {
	return "audit_logs"
}
