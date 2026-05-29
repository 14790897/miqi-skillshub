package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Team struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string         `gorm:"size:128;uniqueIndex;not null" json:"name"`
	DisplayName string         `gorm:"size:256" json:"display_name"`
	Description string         `gorm:"type:text" json:"description"`
	Department  string         `gorm:"size:256" json:"department"`
	OwnerID     uuid.UUID      `gorm:"type:uuid;not null" json:"owner_id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (t *Team) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

func (Team) TableName() string {
	return "teams"
}
