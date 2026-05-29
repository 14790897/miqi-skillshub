package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
)

type NamespaceRepo struct {
	db *gorm.DB
}

func NewNamespaceRepo(db *gorm.DB) *NamespaceRepo { return &NamespaceRepo{db: db} }

func (r *NamespaceRepo) Create(ns *model.Namespace) error {
	return r.db.Create(ns).Error
}

func (r *NamespaceRepo) GetByID(id uuid.UUID) (*model.Namespace, error) {
	var ns model.Namespace
	err := r.db.First(&ns, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &ns, nil
}

func (r *NamespaceRepo) GetByPath(path string) (*model.Namespace, error) {
	var ns model.Namespace
	err := r.db.First(&ns, "path = ?", path).Error
	if err != nil {
		return nil, err
	}
	return &ns, nil
}

func (r *NamespaceRepo) List() ([]model.Namespace, error) {
	var list []model.Namespace
	err := r.db.Order("path ASC").Find(&list).Error
	return list, err
}

func (r *NamespaceRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Namespace{}, "id = ?", id).Error
}
