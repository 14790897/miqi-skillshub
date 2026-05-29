package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
)

type SkillRepo struct {
	db *gorm.DB
}

func NewSkillRepo(db *gorm.DB) *SkillRepo { return &SkillRepo{db: db} }

func (r *SkillRepo) Create(skill *model.Skill) error {
	return r.db.Create(skill).Error
}

func (r *SkillRepo) GetByID(id uuid.UUID) (*model.Skill, error) {
	var skill model.Skill
	err := r.db.Preload("Namespace").Preload("Versions").First(&skill, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &skill, nil
}

func (r *SkillRepo) GetByNamespaceAndName(namespaceID uuid.UUID, name string) (*model.Skill, error) {
	var skill model.Skill
	err := r.db.Preload("Namespace").Where("namespace_id = ? AND name = ?", namespaceID, name).First(&skill).Error
	if err != nil {
		return nil, err
	}
	return &skill, nil
}

func (r *SkillRepo) List(filter SkillFilter) ([]model.Skill, int64, error) {
	var skills []model.Skill
	var total int64

	q := r.db.Model(&model.Skill{})
	if filter.NamespaceID != nil {
		q = q.Where("namespace_id = ?", *filter.NamespaceID)
	}
	if filter.Status != nil {
		q = q.Where("status = ?", *filter.Status)
	}
	if filter.Visibility != nil {
		q = q.Where("visibility = ?", *filter.Visibility)
	}
	if filter.Department != "" {
		q = q.Joins("JOIN users ON users.id = skills.owner_id").
			Where("users.department = ?", filter.Department)
	}
	if filter.Query != "" {
		like := "%" + filter.Query + "%"
		q = q.Where("name LIKE ? OR display_name LIKE ? OR description LIKE ?", like, like, like)
	}
	if len(filter.Tags) > 0 {
		for _, t := range filter.Tags {
			q = q.Where("tags LIKE ?", "%\""+t+"\"%")
		}
	}
	if filter.TrustGrade != "" {
		q = q.Where("EXISTS (SELECT 1 FROM skill_versions WHERE skill_versions.skill_id = skills.id AND skill_versions.trust_grade = ?)", filter.TrustGrade)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if filter.Limit > 0 {
		q = q.Limit(filter.Limit).Offset(filter.Offset)
	}

	err := q.Order("updated_at DESC").Find(&skills).Error
	return skills, total, err
}

func (r *SkillRepo) Update(skill *model.Skill) error {
	return r.db.Save(skill).Error
}

func (r *SkillRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Skill{}, "id = ?", id).Error
}

type SkillFilter struct {
	NamespaceID *uuid.UUID
	Query       string
	Status      *model.SkillStatus
	Visibility  *model.SkillVisibility
	Tags        []string
	Department  string
	TrustGrade  string
	Limit       int
	Offset      int
}
