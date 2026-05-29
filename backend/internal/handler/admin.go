package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/service"
)

type AdminHandler struct {
	svc *service.AdminService
}

func NewAdminHandler(svc *service.AdminService) *AdminHandler {
	return &AdminHandler{svc: svc}
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 {
		limit = 50
	}

	result, err := h.svc.ListUsers(offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": result.Users, "total": result.Total})
}

type updateUserRolesInput struct {
	Roles []model.UserRole `json:"roles" binding:"required"`
}

func (h *AdminHandler) UpdateUserRoles(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var input updateUserRolesInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供角色列表"})
		return
	}

	user, err := h.svc.UpdateUserRoles(id, input.Roles)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) GetLLMConfig(c *gin.Context) {
	cfg, err := h.svc.GetLLMConfig()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"llm_config": nil})
		return
	}
	// Mask API key in response
	cfg.APIKey = maskKey(cfg.APIKey)
	c.JSON(http.StatusOK, gin.H{"llm_config": cfg})
}

func (h *AdminHandler) UpdateLLMConfig(c *gin.Context) {
	var input model.LLMConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cfg, err := h.svc.UpsertLLMConfig(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	cfg.APIKey = maskKey(cfg.APIKey)
	c.JSON(http.StatusOK, gin.H{"llm_config": cfg})
}

func maskKey(key string) string {
	if len(key) <= 8 {
		return "****"
	}
	return key[:4] + "****" + key[len(key)-4:]
}
