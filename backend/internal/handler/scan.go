package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/repository"
	"github.com/lichman0405/miqi-skills-hub/internal/service"
)

type ScanHandler struct {
	db       *gorm.DB
	scanRepo *repository.ScanReportRepo
	scanSvc  *service.ScanService
}

func NewScanHandler(db *gorm.DB, scanSvc *service.ScanService) *ScanHandler {
	return &ScanHandler{
		db:      db,
		scanRepo: repository.NewScanReportRepo(db),
		scanSvc: scanSvc,
	}
}

func (h *ScanHandler) TriggerScan(c *gin.Context) {
	versionID, err := uuid.Parse(c.Param("vid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version id"})
		return
	}

	var v model.SkillVersion
	if err := h.db.First(&v, "id = ?", versionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "version not found"})
		return
	}

	manifest := v.Manifest
	if manifest == nil {
		manifest = json.RawMessage("{}")
	}

	content := service.BuildScanContent(manifest, v.ArtifactURI)
	h.scanSvc.RunAsync(versionID, manifest, content, 0)

	c.JSON(http.StatusAccepted, gin.H{"message": "扫描已启动", "version_id": versionID.String()})
}

func (h *ScanHandler) ListByVersion(c *gin.Context) {
	versionID, err := uuid.Parse(c.Param("vid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid version id"})
		return
	}

	reports, err := h.scanRepo.ListByVersion(versionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"scan_reports": reports})
}

func (h *ScanHandler) GetReport(c *gin.Context) {
	id, err := uuid.Parse(c.Param("rid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid report id"})
		return
	}

	report, err := h.scanRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "scan report not found"})
		return
	}
	c.JSON(http.StatusOK, report)
}
