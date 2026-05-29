package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/lichman0405/miqi-skills-hub/internal/service"
)

type ProfileHandler struct {
	profileSvc *service.ProfileService
	authSvc    *service.AuthService
}

func NewProfileHandler(profileSvc *service.ProfileService, authSvc *service.AuthService) *ProfileHandler {
	return &ProfileHandler{profileSvc: profileSvc, authSvc: authSvc}
}

func (h *ProfileHandler) Get(c *gin.Context) {
	profile, err := h.profileSvc.Get(userID(c))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, profile)
}

func (h *ProfileHandler) Update(c *gin.Context) {
	var input service.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.profileSvc.Update(userID(c), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}

type changePasswordInput struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

func (h *ProfileHandler) ChangePassword(c *gin.Context) {
	var input changePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入原密码和新密码（新密码至少6位）"})
		return
	}

	if err := h.authSvc.ChangePassword(userID(c), input.OldPassword, input.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "密码修改成功"})
}
