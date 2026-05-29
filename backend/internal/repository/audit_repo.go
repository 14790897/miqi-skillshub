package repository

import (
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
)

type AuditRepo struct {
	db *gorm.DB
}

func NewAuditRepo(db *gorm.DB) *AuditRepo { return &AuditRepo{db: db} }

func (r *AuditRepo) Log(actorID uuid.UUID, action, resourceType, resourceID string, metadata map[string]interface{}) {
	var metaBytes json.RawMessage
	if metadata != nil {
		metaBytes, _ = json.Marshal(metadata)
	}

	entry := &model.AuditLog{
		ActorID:      &actorID,
		Action:       action,
		ResourceType: resourceType,
		ResourceID:   resourceID,
		Metadata:     metaBytes,
	}
	r.db.Create(entry)
}

func (r *AuditRepo) List(resourceType string, limit, offset int) ([]model.AuditLog, int64, error) {
	var logs []model.AuditLog
	var total int64

	q := r.db.Model(&model.AuditLog{})
	if resourceType != "" {
		q = q.Where("resource_type = ?", resourceType)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("created_at DESC").Limit(limit).Offset(offset).Find(&logs).Error
	return logs, total, err
}
