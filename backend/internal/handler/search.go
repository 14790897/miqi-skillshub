package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/repository"
)

type SearchHandler struct {
	skillRepo *repository.SkillRepo
	auditRepo *repository.AuditRepo
}

func NewSearchHandler(db *gorm.DB) *SearchHandler {
	return &SearchHandler{
		skillRepo: repository.NewSkillRepo(db),
		auditRepo: repository.NewAuditRepo(db),
	}
}

type SearchInput struct {
	Query      string `form:"q"`
	Tag        string `form:"tag"`
	Department string `form:"department"`
	Grade      string `form:"grade"`
	Limit      int    `form:"limit"`
	Offset     int    `form:"offset"`
}

func (h *SearchHandler) Search(c *gin.Context) {
	var input SearchInput
	if err := c.ShouldBindQuery(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Limit <= 0 {
		input.Limit = 20
	}

	var tags []string
	if input.Tag != "" {
		tags = []string{input.Tag}
	}

	skills, total, err := h.skillRepo.List(repository.SkillFilter{
		Query:      input.Query,
		Department: input.Department,
		Tags:       tags,
		TrustGrade: input.Grade,
		Limit:      input.Limit,
		Offset:     input.Offset,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"skills": skills, "total": total})
}

type AuditListInput struct {
	ResourceType string `form:"resource_type"`
	Limit        int    `form:"limit"`
	Offset       int    `form:"offset"`
}

func (h *SearchHandler) ListAudit(c *gin.Context) {
	var input AuditListInput
	if err := c.ShouldBindQuery(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Limit <= 0 {
		input.Limit = 50
	}

	logs, total, err := h.auditRepo.List(input.ResourceType, input.Limit, input.Offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs, "total": total})
}
