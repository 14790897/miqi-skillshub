package service

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
)

type ProfileService struct {
	db *gorm.DB
}

func NewProfileService(db *gorm.DB) *ProfileService {
	return &ProfileService{db: db}
}

type ProfileStats struct {
	SkillCount    int64 `json:"skill_count"`
	VersionCount  int64 `json:"version_count"`
	ReviewCount   int64 `json:"review_count"`
}

type ProfileResponse struct {
	User  model.User   `json:"user"`
	Stats ProfileStats `json:"stats"`
}

func (s *ProfileService) Get(userID uuid.UUID) (*ProfileResponse, error) {
	var user model.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, fmt.Errorf("用户不存在")
	}

	var stats ProfileStats
	s.db.Model(&model.Skill{}).Where("owner_id = ?", userID).Count(&stats.SkillCount)
	s.db.Model(&model.SkillVersion{}).Where("created_by = ?", userID).Count(&stats.VersionCount)
	s.db.Model(&model.Review{}).Where("reviewer_id = ?", userID).Count(&stats.ReviewCount)

	return &ProfileResponse{User: user, Stats: stats}, nil
}

type UpdateProfileInput struct {
	DisplayName *string `json:"display_name"`
	Department  *string `json:"department"`
	AvatarURL   *string `json:"avatar_url"`
}

func (s *ProfileService) Update(userID uuid.UUID, input UpdateProfileInput) (*model.User, error) {
	var user model.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, fmt.Errorf("用户不存在")
	}

	updates := map[string]interface{}{}
	if input.DisplayName != nil {
		updates["display_name"] = *input.DisplayName
	}
	if input.Department != nil {
		updates["department"] = *input.Department
	}
	if input.AvatarURL != nil {
		updates["avatar_url"] = *input.AvatarURL
	}

	if len(updates) > 0 {
		if err := s.db.Model(&user).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("更新失败: %w", err)
		}
	}

	// re-fetch to get the updated user
	s.db.First(&user, "id = ?", userID)
	return &user, nil
}
