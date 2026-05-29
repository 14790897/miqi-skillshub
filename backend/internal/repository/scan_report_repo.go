package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
)

type ScanReportRepo struct {
	db *gorm.DB
}

func NewScanReportRepo(db *gorm.DB) *ScanReportRepo { return &ScanReportRepo{db: db} }

func (r *ScanReportRepo) Create(report *model.ScanReport) error {
	return r.db.Create(report).Error
}

func (r *ScanReportRepo) GetByID(id uuid.UUID) (*model.ScanReport, error) {
	var s model.ScanReport
	err := r.db.First(&s, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ScanReportRepo) ListByVersion(versionID uuid.UUID) ([]model.ScanReport, error) {
	var list []model.ScanReport
	err := r.db.Where("skill_version_id = ?", versionID).Order("created_at DESC").Find(&list).Error
	return list, err
}
