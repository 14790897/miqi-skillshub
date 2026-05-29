package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/repository"
)

type RuntimeHandler struct {
	skillRepo     *repository.SkillRepo
	versionRepo   *repository.VersionRepo
	namespaceRepo *repository.NamespaceRepo
	auditRepo     *repository.AuditRepo
}

func NewRuntimeHandler(db *gorm.DB) *RuntimeHandler {
	return &RuntimeHandler{
		skillRepo:     repository.NewSkillRepo(db),
		versionRepo:   repository.NewVersionRepo(db),
		namespaceRepo: repository.NewNamespaceRepo(db),
		auditRepo:     repository.NewAuditRepo(db),
	}
}

type runtimeSkillInfo struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Namespace   string   `json:"namespace"`
	DisplayName string   `json:"display_name"`
	Description string   `json:"description"`
	Version     string   `json:"version"`
	TrustGrade  string   `json:"trust_grade"`
	Tags        []string `json:"tags"`
}

func (h *RuntimeHandler) ListSkills(c *gin.Context) {
	skills, _, err := h.skillRepo.List(repository.SkillFilter{
		Limit: 100,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var result []runtimeSkillInfo
	for _, s := range skills {
		info := runtimeSkillInfo{
			ID:          s.ID.String(),
			Name:        s.Name,
			DisplayName: s.DisplayName,
			Description: s.Description,
			Tags:        s.Tags,
		}

		versions, _ := h.versionRepo.ListBySkill(s.ID)
		for _, v := range versions {
			if v.Status == model.VersionPublished {
				info.Version = v.Version
				info.TrustGrade = string(v.TrustGrade)
				break
			}
		}

		if s.Namespace.Path != "" {
			info.Namespace = s.Namespace.Path
		}

		result = append(result, info)
	}

	c.JSON(http.StatusOK, gin.H{"skills": result})
}

type installManifest struct {
	SkillName   string `json:"skill_name"`
	Namespace   string `json:"namespace"`
	Version     string `json:"version"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
	TrustGrade  string `json:"trust_grade"`
	SHA256      string `json:"sha256"`
	DownloadURL string `json:"download_url"`
}

func (h *RuntimeHandler) resolveVersion(c *gin.Context) (*model.SkillVersion, *model.Skill, *model.Namespace, error) {
	nsPath := c.Param("namespace")
	name := c.Param("name")
	ver := c.Param("version")

	ns, err := h.namespaceRepo.GetByPath(nsPath)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("namespace not found: %s", nsPath)
	}

	skill, err := h.skillRepo.GetByNamespaceAndName(ns.ID, name)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("skill not found: %s/%s", nsPath, name)
	}

	// Resolve @latest and @stable pointers
	resolvedVersion := ver
	switch ver {
	case "latest":
		if skill.LatestVersionID == nil {
			return nil, nil, nil, fmt.Errorf("no latest version for skill: %s/%s", nsPath, name)
		}
		v, err := h.versionRepo.GetByID(*skill.LatestVersionID)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("latest version not found: %s/%s@latest", nsPath, name)
		}
		return v, skill, ns, nil
	case "stable":
		if skill.StableVersionID == nil {
			return nil, nil, nil, fmt.Errorf("no stable version for skill: %s/%s", nsPath, name)
		}
		v, err := h.versionRepo.GetByID(*skill.StableVersionID)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("stable version not found: %s/%s@stable", nsPath, name)
		}
		return v, skill, ns, nil
	}

	v, err := h.versionRepo.GetBySkillAndVersion(skill.ID, resolvedVersion)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("version not found: %s/%s@%s", nsPath, name, ver)
	}

	return v, skill, ns, nil
}

func (h *RuntimeHandler) GetInstallManifest(c *gin.Context) {
	v, skill, ns, err := h.resolveVersion(c)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	host := c.Request.Host

	manifest := installManifest{
		SkillName:   skill.Name,
		Namespace:   ns.Path,
		Version:     v.Version,
		DisplayName: skill.DisplayName,
		Description: skill.Description,
		TrustGrade:  string(v.TrustGrade),
		SHA256:      v.ArtifactSHA256,
		DownloadURL: fmt.Sprintf("%s://%s/api/v1/runtime/skills/%s/%s/%s/download", scheme, host, ns.Path, skill.Name, v.Version),
	}

	c.JSON(http.StatusOK, manifest)
}

func (h *RuntimeHandler) Download(c *gin.Context) {
	v, _, _, err := h.resolveVersion(c)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	if v.ArtifactURI == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "no artifact available for this version"})
		return
	}

	absURI, err := filepath.Abs(v.ArtifactURI)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid artifact path"})
		return
	}
	absUpload, err := filepath.Abs("uploads")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server misconfiguration"})
		return
	}
	if !strings.HasPrefix(absURI, absUpload) {
		c.JSON(http.StatusForbidden, gin.H{"error": "artifact path traversal detected"})
		return
	}

	if _, err := os.Stat(absURI); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "artifact file not found on disk"})
		return
	}

	// Log download audit
	if uid, exists := c.Get("user_id"); exists {
		h.auditRepo.Log(uid.(uuid.UUID), "artifact:download", "skill_version", v.ID.String(), map[string]interface{}{
			"version": v.Version,
		})
	}

	filename := filepath.Base(absURI)
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Header("Content-Type", "application/octet-stream")
	c.File(absURI)
}
