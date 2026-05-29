package model

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TeamMember struct {
	ID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	TeamID uuid.UUID `gorm:"type:uuid;not null;index;uniqueIndex:idx_team_member" json:"team_id"`
	UserID uuid.UUID `gorm:"type:uuid;not null;index;uniqueIndex:idx_team_member" json:"user_id"`
	Role   string    `gorm:"size:32;not null;default:'member'" json:"role"`

	Team Team `gorm:"foreignKey:TeamID" json:"team,omitempty"`
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (tm *TeamMember) BeforeCreate(tx *gorm.DB) error {
	if tm.ID == uuid.Nil {
		tm.ID = uuid.New()
	}
	return nil
}

func (TeamMember) TableName() string {
	return "team_members"
}
