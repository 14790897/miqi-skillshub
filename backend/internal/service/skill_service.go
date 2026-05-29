package service

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/repository"
)

type SkillService struct {
	skillRepo     *repository.SkillRepo
	namespaceRepo *repository.NamespaceRepo
	auditRepo     *repository.AuditRepo
}

func NewSkillService(db *gorm.DB) *SkillService {
	return &SkillService{
		skillRepo:     repository.NewSkillRepo(db),
		namespaceRepo: repository.NewNamespaceRepo(db),
		auditRepo:     repository.NewAuditRepo(db),
	}
}

type CreateSkillInput struct {
	Name        string                 `json:"name" binding:"required"`
	DisplayName string                 `json:"display_name" binding:"required"`
	Description string                 `json:"description"`
	NamespaceID uuid.UUID              `json:"namespace_id" binding:"required"`
	Visibility  model.SkillVisibility  `json:"visibility"`
	Tags        []string               `json:"tags"`
	OwnerID     uuid.UUID              `json:"-"`
}

func (s *SkillService) Create(input CreateSkillInput) (*model.Skill, error) {
	// Verify namespace exists
	_, err := s.namespaceRepo.GetByID(input.NamespaceID)
	if err != nil {
		return nil, fmt.Errorf("namespace not found: %w", err)
	}

	if input.Visibility == "" {
		input.Visibility = model.VisibilityTeam
	}

	skill := &model.Skill{
		NamespaceID: input.NamespaceID,
		Name:        input.Name,
		DisplayName: input.DisplayName,
		Description: input.Description,
		OwnerID:     input.OwnerID,
		Visibility:  input.Visibility,
		Status:      model.SkillStatusActive,
		Tags:        input.Tags,
	}

	if err := s.skillRepo.Create(skill); err != nil {
		return nil, err
	}

	s.auditRepo.Log(skill.OwnerID, "skill:create", "skill", skill.ID.String(), nil)
	return skill, nil
}

func (s *SkillService) GetByID(id uuid.UUID) (*model.Skill, error) {
	return s.skillRepo.GetByID(id)
}

type ListSkillsInput struct {
	Query       string                  `form:"q"`
	NamespaceID *uuid.UUID              `form:"namespace_id"`
	Status      *model.SkillStatus      `form:"status"`
	Visibility  *model.SkillVisibility  `form:"visibility"`
	Tag         string                  `form:"tag"`
	Department  string                  `form:"department"`
	Grade       string                  `form:"grade"`
	Limit       int                     `form:"limit"`
	Offset      int                     `form:"offset"`
}

func (s *SkillService) List(input ListSkillsInput) ([]model.Skill, int64, error) {
	if input.Limit <= 0 {
		input.Limit = 20
	}
	var tags []string
	if input.Tag != "" {
		tags = []string{input.Tag}
	}
	return s.skillRepo.List(repository.SkillFilter{
		NamespaceID: input.NamespaceID,
		Query:       input.Query,
		Status:      input.Status,
		Visibility:  input.Visibility,
		Tags:        tags,
		Department:  input.Department,
		TrustGrade:  input.Grade,
		Limit:       input.Limit,
		Offset:      input.Offset,
	})
}

type UpdateSkillInput struct {
	DisplayName *string                 `json:"display_name"`
	Description *string                 `json:"description"`
	Visibility  *model.SkillVisibility  `json:"visibility"`
	Status      *model.SkillStatus      `json:"status"`
	Tags        *[]string               `json:"tags"`
}

func (s *SkillService) Update(id uuid.UUID, input UpdateSkillInput, actorID uuid.UUID) (*model.Skill, error) {
	skill, err := s.skillRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if skill.OwnerID != actorID {
		return nil, fmt.Errorf("permission denied: you are not the owner of this skill")
	}

	if input.DisplayName != nil {
		skill.DisplayName = *input.DisplayName
	}
	if input.Description != nil {
		skill.Description = *input.Description
	}
	if input.Visibility != nil {
		skill.Visibility = *input.Visibility
	}
	if input.Status != nil {
		skill.Status = *input.Status
	}
	if input.Tags != nil {
		skill.Tags = *input.Tags
	}

	if err := s.skillRepo.Update(skill); err != nil {
		return nil, err
	}

	s.auditRepo.Log(actorID, "skill:update", "skill", id.String(), nil)
	return skill, nil
}

func (s *SkillService) Delete(id uuid.UUID, actorID uuid.UUID) error {
	skill, err := s.skillRepo.GetByID(id)
	if err != nil {
		return err
	}
	if skill.OwnerID != actorID {
		return fmt.Errorf("permission denied: you are not the owner of this skill")
	}

	if err := s.skillRepo.Delete(id); err != nil {
		return err
	}
	s.auditRepo.Log(actorID, "skill:delete", "skill", id.String(), nil)
	return nil
}
