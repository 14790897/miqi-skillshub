package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/lichman0405/miqi-skills-hub/internal/service"
)

type VersionHandler struct {
	svc *service.VersionService
}

func NewVersionHandler(svc *service.VersionService) *VersionHandler {
	return &VersionHandler{svc: svc}
}

func (h *VersionHandler) Create(c *gin.Context) {
	var input service.CreateVersionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	v, err := h.svc.Create(input, userID(c))
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, v)
}

func (h *VersionHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("vid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version id"})
		return
	}

	v, err := h.svc.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *VersionHandler) ListBySkill(c *gin.Context) {
	skillID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid skill id"})
		return
	}

	list, err := h.svc.ListBySkill(skillID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"versions": list})
}

func (h *VersionHandler) Submit(c *gin.Context) {
	id, err := uuid.Parse(c.Param("vid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version id"})
		return
	}

	v, err := h.svc.Submit(id, userID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *VersionHandler) Publish(c *gin.Context) {
	id, err := uuid.Parse(c.Param("vid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version id"})
		return
	}

	v, err := h.svc.Publish(id, userID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *VersionHandler) TriggerLLMScan(c *gin.Context) {
	id, err := uuid.Parse(c.Param("vid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version id"})
		return
	}

	v, err := h.svc.TriggerLLMScan(id, userID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusAccepted, gin.H{
		"message":    "LLM 扫描已启动",
		"version_id": v.ID.String(),
		"round":      v.LLMReviewRound,
		"status":     v.LLMReviewStatus,
	})
}

func (h *VersionHandler) SubmitForHumanReview(c *gin.Context) {
	id, err := uuid.Parse(c.Param("vid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version id"})
		return
	}

	v, err := h.svc.SubmitForHumanReview(id, userID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":    "已提交人工审核",
		"version_id": v.ID.String(),
		"status":     v.Status,
	})
}

func (h *VersionHandler) Deprecate(c *gin.Context) {
	id, err := uuid.Parse(c.Param("vid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version id"})
		return
	}

	v, err := h.svc.Deprecate(id, userID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}

func (h *VersionHandler) Block(c *gin.Context) {
	id, err := uuid.Parse(c.Param("vid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version id"})
		return
	}

	v, err := h.svc.Block(id, userID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, v)
}
