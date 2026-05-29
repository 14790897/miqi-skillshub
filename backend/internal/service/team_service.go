package service

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/repository"
)

type TeamService struct {
	repo      *repository.TeamRepo
	auditRepo *repository.AuditRepo
	db        *gorm.DB
}

func NewTeamService(db *gorm.DB) *TeamService {
	return &TeamService{
		repo:      repository.NewTeamRepo(db),
		auditRepo: repository.NewAuditRepo(db),
		db:        db,
	}
}

type CreateTeamInput struct {
	Name        string `json:"name" binding:"required"`
	DisplayName string `json:"display_name" binding:"required"`
	Description string `json:"description"`
	Department  string `json:"department"`
}

type UpdateTeamInput struct {
	DisplayName *string `json:"display_name"`
	Description *string `json:"description"`
	Department  *string `json:"department"`
}

type AddMemberInput struct {
	UserID uuid.UUID `json:"user_id" binding:"required"`
	Role   string    `json:"role" binding:"required"`
}

func (s *TeamService) CreateTeam(input CreateTeamInput, ownerID uuid.UUID) (*model.Team, error) {
	team := &model.Team{
		Name:        input.Name,
		DisplayName: input.DisplayName,
		Description: input.Description,
		Department:  input.Department,
		OwnerID:     ownerID,
	}

	if err := s.repo.Create(team); err != nil {
		return nil, fmt.Errorf("failed to create team: %w", err)
	}

	// Auto-add the creator as an admin member
	member := &model.TeamMember{
		TeamID: team.ID,
		UserID: ownerID,
		Role:   "admin",
	}
	if err := s.repo.AddMember(member); err != nil {
		return nil, fmt.Errorf("failed to add owner as member: %w", err)
	}

	s.auditRepo.Log(ownerID, "team:create", "team", team.ID.String(), map[string]interface{}{
		"team_name": team.Name,
	})

	return team, nil
}

func (s *TeamService) GetTeam(id uuid.UUID) (*model.Team, error) {
	return s.repo.GetByID(id)
}

type TeamListResult struct {
	Teams []model.Team `json:"teams"`
	Total int64        `json:"total"`
}

func (s *TeamService) ListTeams(offset, limit int) (*TeamListResult, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	teams, total, err := s.repo.List(offset, limit)
	if err != nil {
		return nil, err
	}
	return &TeamListResult{Teams: teams, Total: total}, nil
}

func (s *TeamService) UpdateTeam(id uuid.UUID, input UpdateTeamInput, actorID uuid.UUID) (*model.Team, error) {
	team, err := s.repo.GetByID(id)
	if err != nil {
		return nil, fmt.Errorf("team not found: %w", err)
	}

	if input.DisplayName != nil {
		team.DisplayName = *input.DisplayName
	}
	if input.Description != nil {
		team.Description = *input.Description
	}
	if input.Department != nil {
		team.Department = *input.Department
	}

	if err := s.repo.Update(team); err != nil {
		return nil, fmt.Errorf("failed to update team: %w", err)
	}

	s.auditRepo.Log(actorID, "team:update", "team", team.ID.String(), map[string]interface{}{
		"team_name": team.Name,
	})

	return team, nil
}

func (s *TeamService) DeleteTeam(id uuid.UUID, actorID uuid.UUID) error {
	team, err := s.repo.GetByID(id)
	if err != nil {
		return fmt.Errorf("team not found: %w", err)
	}

	if err := s.repo.Delete(id); err != nil {
		return fmt.Errorf("failed to delete team: %w", err)
	}

	s.auditRepo.Log(actorID, "team:delete", "team", id.String(), map[string]interface{}{
		"team_name": team.Name,
	})

	return nil
}

func (s *TeamService) AddMember(teamID uuid.UUID, input AddMemberInput, actorID uuid.UUID) (*model.TeamMember, error) {
	// Verify team exists
	if _, err := s.repo.GetByID(teamID); err != nil {
		return nil, fmt.Errorf("team not found: %w", err)
	}

	// Verify user exists
	var user model.User
	if err := s.db.First(&user, "id = ?", input.UserID).Error; err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	if input.Role != "admin" && input.Role != "member" {
		return nil, fmt.Errorf("role must be 'admin' or 'member'")
	}

	member := &model.TeamMember{
		TeamID: teamID,
		UserID: input.UserID,
		Role:   input.Role,
	}

	if err := s.repo.AddMember(member); err != nil {
		return nil, fmt.Errorf("failed to add member: %w", err)
	}

	s.auditRepo.Log(actorID, "team:add_member", "team_member", member.ID.String(), map[string]interface{}{
		"team_id": teamID.String(),
		"user_id": input.UserID.String(),
		"role":    input.Role,
	})

	return member, nil
}

func (s *TeamService) RemoveMember(teamID, userID, actorID uuid.UUID) error {
	// Verify team exists
	if _, err := s.repo.GetByID(teamID); err != nil {
		return fmt.Errorf("team not found: %w", err)
	}

	// Prevent removing the team owner
	team, _ := s.repo.GetByID(teamID)
	if team != nil && team.OwnerID == userID {
		return fmt.Errorf("cannot remove the team owner from the team")
	}

	if err := s.repo.RemoveMember(teamID, userID); err != nil {
		return fmt.Errorf("failed to remove member: %w", err)
	}

	s.auditRepo.Log(actorID, "team:remove_member", "team_member", "", map[string]interface{}{
		"team_id": teamID.String(),
		"user_id": userID.String(),
	})

	return nil
}

func (s *TeamService) ListMembers(teamID uuid.UUID) ([]model.TeamMember, error) {
	// Verify team exists
	if _, err := s.repo.GetByID(teamID); err != nil {
		return nil, fmt.Errorf("team not found: %w", err)
	}

	return s.repo.ListMembers(teamID)
}
