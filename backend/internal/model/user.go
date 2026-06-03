package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string

const (
	RoleConsumer         UserRole = "consumer"
	RoleAuthor           UserRole = "author"
	RoleMaintainer       UserRole = "maintainer"
	RoleSecurityReviewer UserRole = "security_reviewer"
	RoleNamespaceAdmin   UserRole = "namespace_admin"
	RolePlatformAdmin    UserRole = "platform_admin"
)

type User struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Username     string         `gorm:"size:128;uniqueIndex;not null" json:"username"`
	Email        string         `gorm:"size:256;uniqueIndex;not null" json:"email"`
	PasswordHash string         `gorm:"size:256" json:"-"` // empty for OAuth-only users
	DisplayName  string         `gorm:"size:256" json:"display_name"`
	Roles        []UserRole     `gorm:"serializer:json" json:"roles"`
	Department   string         `gorm:"size:256" json:"department"`
	AvatarURL    string         `gorm:"size:1024" json:"avatar_url"`
	// ExternalID stores the user ID from an external OAuth provider (e.g. Sandbox).
	// Used to identify the same remote user across logins without relying solely on email.
	ExternalID  string         `gorm:"size:256;index" json:"external_id,omitempty"`
	LastLoginAt  *time.Time     `json:"last_login_at"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

func (User) TableName() string {
	return "users"
}
