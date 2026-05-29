package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ScanStatus string

const (
	ScanPassed  ScanStatus = "passed"
	ScanFailed  ScanStatus = "failed"
	ScanError   ScanStatus = "error"
)

type RiskLevel string

const (
	RiskInfo     RiskLevel = "info"
	RiskLow      RiskLevel = "low"
	RiskMedium   RiskLevel = "medium"
	RiskHigh     RiskLevel = "high"
	RiskCritical RiskLevel = "critical"
)

type ScanFinding struct {
	File       string `json:"file"`
	Line       int    `json:"line"`
	Rule       string `json:"rule"`
	Severity   string `json:"severity"`
	Message    string `json:"message"`
	Evidence   string `json:"evidence"`
}

type ScanReport struct {
	ID              uuid.UUID       `gorm:"type:uuid;primaryKey" json:"id"`
	SkillVersionID  uuid.UUID       `gorm:"type:uuid;not null;index" json:"skill_version_id"`
	ScannerName     string          `gorm:"size:128;not null" json:"scanner_name"`
	ScannerVersion  string          `gorm:"size:64" json:"scanner_version"`
	Status          ScanStatus      `gorm:"size:32;not null" json:"status"`
	RiskLevel       RiskLevel       `gorm:"size:32" json:"risk_level"`
	Findings        json.RawMessage `gorm:"type:jsonb" json:"findings"`
	ReviewRound     int             `gorm:"not null;default:0" json:"review_round"`
	StartedAt       *time.Time      `json:"started_at"`
	CompletedAt     *time.Time      `json:"completed_at"`
	CreatedAt       time.Time       `json:"created_at"`
}

func (s *ScanReport) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

func (ScanReport) TableName() string {
	return "scan_reports"
}
