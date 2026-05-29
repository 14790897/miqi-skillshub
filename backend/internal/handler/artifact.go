package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/lichman0405/miqi-skills-hub/internal/service"
)

type ArtifactHandler struct {
	svc *service.ArtifactService
}

func NewArtifactHandler(svc *service.ArtifactService) *ArtifactHandler {
	return &ArtifactHandler{svc: svc}
}

func (h *ArtifactHandler) Upload(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请选择要上传的文件"})
		return
	}
	defer file.Close()

	userID, _ := c.Get("user_id")
	result, err := h.svc.Upload(file, header, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"skill_md_content": result.SKILLMDContent,
		"file_count":       result.FileCount,
		"total_size":       result.TotalSize,
		"sha256":           result.SHA256,
		"artifact_uri":     result.ArtifactURI,
	})
}
