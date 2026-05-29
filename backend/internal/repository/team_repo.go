package repository

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
)

type TeamRepo struct {
	db *gorm.DB
}

func NewTeamRepo(db *gorm.DB) *TeamRepo { return &TeamRepo{db: db} }

func (r *TeamRepo) Create(team *model.Team) error {
	return r.db.Create(team).Error
}

func (r *TeamRepo) GetByID(id uuid.UUID) (*model.Team, error) {
	var team model.Team
	err := r.db.First(&team, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &team, nil
}

func (r *TeamRepo) List(offset, limit int) ([]model.Team, int64, error) {
	var teams []model.Team
	var total int64

	q := r.db.Model(&model.Team{})
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.Order("created_at DESC").Offset(offset).Limit(limit).Find(&teams).Error
	return teams, total, err
}

func (r *TeamRepo) Update(team *model.Team) error {
	return r.db.Save(team).Error
}

func (r *TeamRepo) Delete(id uuid.UUID) error {
	return r.db.Delete(&model.Team{}, "id = ?", id).Error
}

func (r *TeamRepo) AddMember(member *model.TeamMember) error {
	return r.db.Create(member).Error
}

func (r *TeamRepo) RemoveMember(teamID, userID uuid.UUID) error {
	return r.db.Where("team_id = ? AND user_id = ?", teamID, userID).Delete(&model.TeamMember{}).Error
}

func (r *TeamRepo) ListMembers(teamID uuid.UUID) ([]model.TeamMember, error) {
	var members []model.TeamMember
	err := r.db.Preload("User").Where("team_id = ?", teamID).Order("created_at ASC").Find(&members).Error
	return members, err
}

func (r *TeamRepo) GetMemberRole(teamID, userID uuid.UUID) (string, error) {
	var member model.TeamMember
	err := r.db.Where("team_id = ? AND user_id = ?", teamID, userID).First(&member).Error
	if err != nil {
		return "", fmt.Errorf("user is not a member of this team: %w", err)
	}
	return member.Role, nil
}
