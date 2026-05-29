package service

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
)

type AdminService struct {
	db *gorm.DB
}

func NewAdminService(db *gorm.DB) *AdminService {
	return &AdminService{db: db}
}

type UserListResult struct {
	Users []model.User `json:"users"`
	Total int64        `json:"total"`
}

func (s *AdminService) ListUsers(offset, limit int) (*UserListResult, error) {
	var users []model.User
	var total int64
	s.db.Model(&model.User{}).Count(&total)
	if err := s.db.Offset(offset).Limit(limit).Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("查询用户列表失败: %w", err)
	}
	return &UserListResult{Users: users, Total: total}, nil
}

type UpdateUserRolesInput struct {
	Roles []model.UserRole `json:"roles" binding:"required"`
}

func (s *AdminService) UpdateUserRoles(userID uuid.UUID, roles []model.UserRole) (*model.User, error) {
	var user model.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, fmt.Errorf("用户不存在")
	}

	user.Roles = roles
	if err := s.db.Save(&user).Error; err != nil {
		return nil, fmt.Errorf("更新用户角色失败: %w", err)
	}
	return &user, nil
}

// LLMConfig management
func (s *AdminService) GetLLMConfig() (*model.LLMConfig, error) {
	var cfg model.LLMConfig
	err := s.db.First(&cfg).Error
	if err != nil {
		return nil, err
	}
	return &cfg, nil
}

func (s *AdminService) UpsertLLMConfig(input model.LLMConfig) (*model.LLMConfig, error) {
	var existing model.LLMConfig
	err := s.db.First(&existing).Error
	if err != nil {
		// Create new
		input.ID = uuid.New()
		if err := s.db.Create(&input).Error; err != nil {
			return nil, fmt.Errorf("创建LLM配置失败: %w", err)
		}
		return &input, nil
	}

	// Update existing
	existing.ProviderURL = input.ProviderURL
	existing.APIKey = input.APIKey
	existing.ModelName = input.ModelName
	existing.IsEnabled = input.IsEnabled
	if err := s.db.Save(&existing).Error; err != nil {
		return nil, fmt.Errorf("更新LLM配置失败: %w", err)
	}
	return &existing, nil
}
