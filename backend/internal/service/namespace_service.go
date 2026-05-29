package service

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/repository"
)

type NamespaceService struct {
	repo     *repository.NamespaceRepo
	auditRepo *repository.AuditRepo
}

func NewNamespaceService(db *gorm.DB) *NamespaceService {
	return &NamespaceService{
		repo:     repository.NewNamespaceRepo(db),
		auditRepo: repository.NewAuditRepo(db),
	}
}

type CreateNamespaceInput struct {
	Path        string `json:"path" binding:"required"`
	DisplayName string `json:"display_name" binding:"required"`
	Description string `json:"description"`
}

func (s *NamespaceService) Create(input CreateNamespaceInput, ownerID uuid.UUID) (*model.Namespace, error) {
	existing, _ := s.repo.GetByPath(input.Path)
	if existing != nil {
		return nil, fmt.Errorf("namespace path already exists: %s", input.Path)
	}

	ns := &model.Namespace{
		Path:        input.Path,
		DisplayName: input.DisplayName,
		Description: input.Description,
		OwnerID:     ownerID,
	}

	if err := s.repo.Create(ns); err != nil {
		return nil, err
	}

	s.auditRepo.Log(ownerID, "namespace:create", "namespace", ns.ID.String(), nil)
	return ns, nil
}

func (s *NamespaceService) List() ([]model.Namespace, error) {
	return s.repo.List()
}

func (s *NamespaceService) GetByID(id uuid.UUID) (*model.Namespace, error) {
	return s.repo.GetByID(id)
}
