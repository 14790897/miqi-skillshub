package service

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/repository"
)

type VersionService struct {
	db          *gorm.DB
	versionRepo *repository.VersionRepo
	skillRepo   *repository.SkillRepo
	auditRepo   *repository.AuditRepo
	scanRepo    *repository.ScanReportRepo
	reviewRepo  *repository.ReviewRepo
	scanSvc     *ScanService
}

func NewVersionService(db *gorm.DB, scanSvc *ScanService) *VersionService {
	return &VersionService{
		db:          db,
		versionRepo: repository.NewVersionRepo(db),
		skillRepo:   repository.NewSkillRepo(db),
		auditRepo:   repository.NewAuditRepo(db),
		scanRepo:    repository.NewScanReportRepo(db),
		reviewRepo:  repository.NewReviewRepo(db),
		scanSvc:     scanSvc,
	}
}

type CreateVersionInput struct {
	SkillID        uuid.UUID       `json:"skill_id" binding:"required"`
	Version        string          `json:"version" binding:"required"`
	Manifest       json.RawMessage `json:"manifest"`
	ReleaseNote    string          `json:"release_note"`
	ArtifactURI    string          `json:"artifact_uri"`
	ArtifactSHA256 string          `json:"artifact_sha256"`
}

func (s *VersionService) Create(input CreateVersionInput, userID uuid.UUID) (*model.SkillVersion, error) {
	skill, err := s.skillRepo.GetByID(input.SkillID)
	if err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}
	if skill.OwnerID != userID {
		return nil, fmt.Errorf("permission denied: you are not the owner of this skill")
	}

	existing, _ := s.versionRepo.GetBySkillAndVersion(input.SkillID, input.Version)
	if existing != nil {
		return nil, fmt.Errorf("version %s already exists for this skill", input.Version)
	}

	v := &model.SkillVersion{
		SkillID:        input.SkillID,
		Version:        input.Version,
		Status:         model.VersionCandidate,
		Manifest:       input.Manifest,
		ReleaseNote:    input.ReleaseNote,
		ArtifactURI:    input.ArtifactURI,
		ArtifactSHA256: input.ArtifactSHA256,
		CreatedBy:      userID,
	}

	if err := s.versionRepo.Create(v); err != nil {
		return nil, err
	}

	s.auditRepo.Log(userID, "version:create", "skill_version", v.ID.String(), map[string]interface{}{
		"skill_id": input.SkillID.String(),
		"version":  input.Version,
	})
	return v, nil
}

// TriggerLLMScan starts an async LLM security scan for the version.
// Called automatically on skill create, or when user re-uploads content.
// Enforces max 3 review rounds.
func (s *VersionService) TriggerLLMScan(id uuid.UUID, userID uuid.UUID) (*model.SkillVersion, error) {
	v, err := s.versionRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	skill, err := s.skillRepo.GetByID(v.SkillID)
	if err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}
	if skill.OwnerID != userID {
		return nil, fmt.Errorf("permission denied: you are not the owner of this skill")
	}

	if v.LLMReviewRound >= 3 {
		return nil, fmt.Errorf("已达到最大审查轮次（3轮），请提交人工审核")
	}
	if v.LLMReviewStatus == "scanning" {
		return nil, fmt.Errorf("扫描正在进行中，请等待完成后再重试")
	}

	// Increment round and mark scanning
	nextRound := v.LLMReviewRound + 1
	v.LLMReviewRound = nextRound
	v.LLMReviewStatus = "scanning"
	s.versionRepo.Update(v)

	// Build scan content and launch async
	manifest := v.Manifest
	if manifest == nil {
		manifest = json.RawMessage("{}")
	}
	scanContent := BuildScanContent(manifest, v.ArtifactURI)
	s.scanSvc.RunAsync(id, manifest, scanContent, nextRound)

	s.auditRepo.Log(userID, "version:llm_scan", "skill_version", id.String(), map[string]interface{}{
		"version": v.Version,
		"round":   nextRound,
	})

	return v, nil
}

// SubmitForHumanReview submits a version for human review after LLM rounds are acceptable.
func (s *VersionService) SubmitForHumanReview(id uuid.UUID, userID uuid.UUID) (*model.SkillVersion, error) {
	v, err := s.versionRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	skill, err := s.skillRepo.GetByID(v.SkillID)
	if err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}
	if skill.OwnerID != userID {
		return nil, fmt.Errorf("permission denied: you are not the owner of this skill")
	}

	if v.Status != model.VersionCandidate {
		return nil, fmt.Errorf("only candidate versions can be submitted (current: %s)", v.Status)
	}

	if v.LLMReviewRound == 0 {
		return nil, fmt.Errorf("请先触发 LLM 安全扫描再提交人工审核")
	}
	if v.LLMReviewStatus == "scanning" {
		return nil, fmt.Errorf("LLM 扫描仍在进行中，请稍后重试")
	}

	// Check latest scan results for critical issues
	reports, _ := s.scanRepo.ListByVersion(id)
	for _, r := range reports {
		if r.ReviewRound == v.LLMReviewRound && (r.RiskLevel == model.RiskCritical || r.Status == model.ScanFailed) {
			return nil, fmt.Errorf("当前版本存在严重安全风险（%s），请修改后重新扫描", r.RiskLevel)
		}
	}

	v.LLMReviewStatus = "ready_for_human"
	// Status stays "candidate" — human reviewer will decide
	s.versionRepo.Update(v)

	// Check if a pending review already exists
	existing, _ := s.reviewRepo.ListByVersion(id)
	for _, r := range existing {
		if r.Decision == "" {
			return nil, fmt.Errorf("该版本已提交人工审核，请等待审核结果")
		}
	}

	// Create a pending human review
	review := &model.Review{
		SkillVersionID: id,
		ReviewerID:     uuid.New(),
		Decision:       "",
	}
	if err := s.reviewRepo.Create(review); err != nil {
		return nil, fmt.Errorf("创建审核记录失败: %w", err)
	}

	s.auditRepo.Log(userID, "version:submit_review", "skill_version", id.String(), map[string]interface{}{
		"version":    v.Version,
		"llm_rounds": v.LLMReviewRound,
		"llm_status": v.LLMReviewStatus,
	})
	return v, nil
}

// Submit is kept for backward compatibility — runs LLM scan + auto-submits if clean.
func (s *VersionService) Submit(id uuid.UUID, userID uuid.UUID) (*model.SkillVersion, error) {
	v, err := s.versionRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	skill, err := s.skillRepo.GetByID(v.SkillID)
	if err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}
	if skill.OwnerID != userID {
		return nil, fmt.Errorf("permission denied: you are not the owner of this skill")
	}

	if v.Status != model.VersionCandidate {
		return nil, fmt.Errorf("only candidate versions can be submitted (current: %s)", v.Status)
	}

	// If no LLM scan done yet, trigger one
	if v.LLMReviewRound == 0 {
		v, _ = s.TriggerLLMScan(id, userID)
		return v, fmt.Errorf("LLM 安全扫描已启动（第 %d 轮），请等待扫描完成后提交人工审核", v.LLMReviewRound)
	}

	// If scanning, tell user to wait
	if v.LLMReviewStatus == "scanning" {
		return nil, fmt.Errorf("LLM 扫描进行中，请等待完成")
	}

	// Check latest scan results
	reports, _ := s.scanRepo.ListByVersion(id)
	for _, r := range reports {
		if r.ReviewRound == v.LLMReviewRound && (r.RiskLevel == model.RiskCritical || r.Status == model.ScanFailed) {
			return nil, fmt.Errorf("当前版本存在严重安全风险（%s），请修改后重新扫描（剩余 %d 轮）", r.RiskLevel, 3-v.LLMReviewRound)
		}
	}

	// Auto-submit for human review
	return s.SubmitForHumanReview(id, userID)
}

func (s *VersionService) Publish(id uuid.UUID, userID uuid.UUID) (*model.SkillVersion, error) {
	v, err := s.versionRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	skill, err := s.skillRepo.GetByID(v.SkillID)
	if err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}
	if skill.OwnerID != userID {
		return nil, fmt.Errorf("permission denied: you are not the owner of this skill")
	}

	if v.Status != model.VersionCandidate && v.Status != model.VersionApproved {
		return nil, fmt.Errorf("cannot publish version with status: %s", v.Status)
	}

	// Version must pass scans
	reports, err := s.scanRepo.ListByVersion(id)
	if err != nil {
		return nil, fmt.Errorf("获取扫描报告失败: %w", err)
	}
	hasCritical := false
	for _, r := range reports {
		if r.RiskLevel == model.RiskCritical || r.Status == model.ScanFailed {
			hasCritical = true
			break
		}
	}
	if hasCritical {
		return nil, fmt.Errorf("cannot publish: critical scan findings exist")
	}

	// Run in transaction: update version + skill pointers atomically
	err = s.db.Transaction(func(tx *gorm.DB) error {
		txVersionRepo := repository.NewVersionRepo(tx)
		txSkillRepo := repository.NewSkillRepo(tx)

		hash := sha256.Sum256(v.Manifest)
		v.ArtifactSHA256 = fmt.Sprintf("%x", hash)
		v.Status = model.VersionPublished
		v.PublishedBy = &userID
		now := time.Now()
		v.PublishedAt = &now
		v.TrustGrade = model.TrustGradeB

		if err := txVersionRepo.Update(v); err != nil {
			return err
		}

		skill.LatestVersionID = &v.ID
		if v.TrustGrade == model.TrustGradeA || v.TrustGrade == model.TrustGradeB {
			skill.StableVersionID = &v.ID
		}
		if err := txSkillRepo.Update(skill); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	s.auditRepo.Log(userID, "version:publish", "skill_version", id.String(), map[string]interface{}{
		"version":     v.Version,
		"trust_grade": v.TrustGrade,
	})
	return v, nil
}

func (s *VersionService) Deprecate(id uuid.UUID, userID uuid.UUID) (*model.SkillVersion, error) {
	v, err := s.versionRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	skill, err := s.skillRepo.GetByID(v.SkillID)
	if err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}
	if skill.OwnerID != userID {
		return nil, fmt.Errorf("permission denied: you are not the owner of this skill")
	}

	if v.Status != model.VersionPublished {
		return nil, fmt.Errorf("only published versions can be deprecated")
	}

	v.Status = model.VersionDeprecated
	if err := s.versionRepo.Update(v); err != nil {
		return nil, err
	}

	s.auditRepo.Log(userID, "version:deprecate", "skill_version", id.String(), map[string]interface{}{
		"version": v.Version,
	})
	return v, nil
}

func (s *VersionService) Block(id uuid.UUID, userID uuid.UUID) (*model.SkillVersion, error) {
	v, err := s.versionRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	skill, err := s.skillRepo.GetByID(v.SkillID)
	if err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}
	if skill.OwnerID != userID {
		return nil, fmt.Errorf("permission denied: you are not the owner of this skill")
	}

	v.Status = model.VersionBlocked
	v.TrustGrade = model.TrustGradeF
	if err := s.versionRepo.Update(v); err != nil {
		return nil, err
	}

	s.auditRepo.Log(userID, "version:block", "skill_version", id.String(), map[string]interface{}{
		"version": v.Version,
	})
	return v, nil
}

func (s *VersionService) GetByID(id uuid.UUID) (*model.SkillVersion, error) {
	return s.versionRepo.GetByID(id)
}

func (s *VersionService) ListBySkill(skillID uuid.UUID) ([]model.SkillVersion, error) {
	return s.versionRepo.ListBySkill(skillID)
}

func timePtr(t time.Time) *time.Time { return &t }

func BuildScanContent(manifest json.RawMessage, artifactURI string) string {
	var parts []string

	// Extract text fields from manifest
	if manifest != nil {
		var m map[string]interface{}
		if err := json.Unmarshal(manifest, &m); err == nil {
			for _, key := range []string{"name", "description", "displayName", "instructions", "prompt"} {
				if v, ok := m[key]; ok {
					if s, ok := v.(string); ok && s != "" {
						parts = append(parts, s)
					}
				}
			}
			// Also check nested metadata
			if meta, ok := m["metadata"]; ok {
				if metaMap, ok := meta.(map[string]interface{}); ok {
					for _, key := range []string{"name", "description", "displayName"} {
						if v, ok := metaMap[key]; ok {
							if s, ok := v.(string); ok && s != "" {
								parts = append(parts, s)
							}
						}
					}
				}
			}
		}
	}

	// Read artifact file content if available
	if artifactURI != "" {
		if data, err := os.ReadFile(artifactURI); err == nil {
			parts = append(parts, string(data))
		}
	}

	if len(parts) == 0 {
		return "{}"
	}

	result := ""
	for _, p := range parts {
		result += p + "\n"
	}
	return result
}
