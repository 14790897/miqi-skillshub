package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Namespace struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ParentID    *uuid.UUID     `gorm:"type:uuid;index" json:"parent_id,omitempty"`
	Path        string         `gorm:"size:512;uniqueIndex;not null" json:"path"`
	DisplayName string         `gorm:"size:512;not null" json:"display_name"`
	Description string         `gorm:"type:text" json:"description"`
	OwnerID     uuid.UUID      `gorm:"type:uuid;not null" json:"owner_id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (n *Namespace) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}

func (Namespace) TableName() string {
	return "namespaces"
}
