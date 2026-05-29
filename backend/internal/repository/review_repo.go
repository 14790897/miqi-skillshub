package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
)

type ReviewRepo struct {
	db *gorm.DB
}

func NewReviewRepo(db *gorm.DB) *ReviewRepo { return &ReviewRepo{db: db} }

func (r *ReviewRepo) Create(review *model.Review) error {
	return r.db.Create(review).Error
}

func (r *ReviewRepo) GetByID(id uuid.UUID) (*model.Review, error) {
	var rev model.Review
	err := r.db.Preload("Reviewer").First(&rev, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &rev, nil
}

func (r *ReviewRepo) ListPending(limit, offset int) ([]model.Review, int64, error) {
	var list []model.Review
	var total int64

	base := r.db.Model(&model.Review{}).Where("reviews.decision = ?", "")

	if err := base.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := base.Session(&gorm.Session{}).
		Preload("SkillVersion.Skill").
		Preload("Reviewer").
		Order("reviews.created_at ASC").
		Limit(limit).Offset(offset).
		Find(&list).Error
	return list, total, err
}

func (r *ReviewRepo) ListByVersion(versionID uuid.UUID) ([]model.Review, error) {
	var list []model.Review
	err := r.db.Preload("Reviewer").Where("skill_version_id = ?", versionID).Order("created_at DESC").Find(&list).Error
	return list, err
}

func (r *ReviewRepo) Update(review *model.Review) error {
	return r.db.Save(review).Error
}
