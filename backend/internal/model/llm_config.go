package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LLMConfig struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ProviderURL string    `gorm:"size:1024;not null" json:"provider_url"`
	APIKey      string    `gorm:"size:512;not null" json:"api_key"`
	ModelName   string    `gorm:"size:128;not null;default:'gpt-4o'" json:"model_name"`
	IsEnabled   bool      `gorm:"not null;default:false" json:"is_enabled"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (c *LLMConfig) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

func (LLMConfig) TableName() string {
	return "llm_configs"
}
