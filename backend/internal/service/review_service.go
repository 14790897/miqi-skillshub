package service

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/repository"
)

type ReviewService struct {
	reviewRepo  *repository.ReviewRepo
	versionRepo *repository.VersionRepo
	auditRepo   *repository.AuditRepo
}

func NewReviewService(db *gorm.DB) *ReviewService {
	return &ReviewService{
		reviewRepo:  repository.NewReviewRepo(db),
		versionRepo: repository.NewVersionRepo(db),
		auditRepo:   repository.NewAuditRepo(db),
	}
}

type ReviewDecisionInput struct {
	ReviewID uuid.UUID `json:"review_id"`
	Comment  string    `json:"comment"`
}

func (s *ReviewService) Approve(input ReviewDecisionInput, reviewerID uuid.UUID) (*model.Review, error) {
	review, err := s.reviewRepo.GetByID(input.ReviewID)
	if err != nil {
		return nil, fmt.Errorf("review not found: %w", err)
	}

	review.Decision = model.DecisionApproved
	review.ReviewerID = reviewerID
	review.Comment = input.Comment

	if err := s.reviewRepo.Update(review); err != nil {
		return nil, err
	}

	version, _ := s.versionRepo.GetByID(review.SkillVersionID)
	if version != nil {
		version.Status = model.VersionApproved
		version.LLMReviewStatus = "approved"
		s.versionRepo.Update(version)
	}

	s.auditRepo.Log(reviewerID, "review:approve", "review", input.ReviewID.String(), nil)
	return review, nil
}

func (s *ReviewService) RequestChanges(input ReviewDecisionInput, reviewerID uuid.UUID) (*model.Review, error) {
	review, err := s.reviewRepo.GetByID(input.ReviewID)
	if err != nil {
		return nil, fmt.Errorf("review not found: %w", err)
	}

	review.Decision = model.DecisionChangesRequested
	review.ReviewerID = reviewerID
	review.Comment = input.Comment

	if err := s.reviewRepo.Update(review); err != nil {
		return nil, err
	}

	version, _ := s.versionRepo.GetByID(review.SkillVersionID)
	if version != nil {
		version.LLMReviewRound = 0
		version.LLMReviewStatus = "pending"
		s.versionRepo.Update(version)
	}

	s.auditRepo.Log(reviewerID, "review:changes_requested", "review", input.ReviewID.String(), nil)
	return review, nil
}

func (s *ReviewService) Reject(input ReviewDecisionInput, reviewerID uuid.UUID) (*model.Review, error) {
	review, err := s.reviewRepo.GetByID(input.ReviewID)
	if err != nil {
		return nil, fmt.Errorf("review not found: %w", err)
	}

	review.Decision = model.DecisionRejected
	review.ReviewerID = reviewerID
	review.Comment = input.Comment

	if err := s.reviewRepo.Update(review); err != nil {
		return nil, err
	}

	version, _ := s.versionRepo.GetByID(review.SkillVersionID)
	if version != nil {
		version.Status = model.VersionBlocked
		version.LLMReviewStatus = "rejected"
		s.versionRepo.Update(version)
	}

	s.auditRepo.Log(reviewerID, "review:reject", "review", input.ReviewID.String(), nil)
	return review, nil
}

func (s *ReviewService) ListPending(limit, offset int) ([]model.Review, int64, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.reviewRepo.ListPending(limit, offset)
}

func (s *ReviewService) GetByID(id uuid.UUID) (*model.Review, error) {
	return s.reviewRepo.GetByID(id)
}
