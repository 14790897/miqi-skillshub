package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
)

type VersionRepo struct {
	db *gorm.DB
}

func NewVersionRepo(db *gorm.DB) *VersionRepo { return &VersionRepo{db: db} }

func (r *VersionRepo) Create(v *model.SkillVersion) error {
	return r.db.Create(v).Error
}

func (r *VersionRepo) GetByID(id uuid.UUID) (*model.SkillVersion, error) {
	var v model.SkillVersion
	err := r.db.Preload("ScanReports").Preload("Reviews.Reviewer").First(&v, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *VersionRepo) GetBySkillAndVersion(skillID uuid.UUID, version string) (*model.SkillVersion, error) {
	var v model.SkillVersion
	err := r.db.Where("skill_id = ? AND version = ?", skillID, version).First(&v).Error
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *VersionRepo) ListBySkill(skillID uuid.UUID) ([]model.SkillVersion, error) {
	var list []model.SkillVersion
	err := r.db.Where("skill_id = ?", skillID).Order("created_at DESC").Find(&list).Error
	return list, err
}

func (r *VersionRepo) ListByStatus(status model.VersionStatus) ([]model.SkillVersion, error) {
	var list []model.SkillVersion
	err := r.db.Where("status = ?", status).Order("created_at DESC").Find(&list).Error
	return list, err
}

func (r *VersionRepo) Update(v *model.SkillVersion) error {
	return r.db.Save(v).Error
}

func (r *VersionRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.SkillVersion{}, "id = ?", id).Error
}
