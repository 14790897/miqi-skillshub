package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/lichman0405/miqi-skills-hub/internal/service"
)

type NamespaceHandler struct {
	svc *service.NamespaceService
}

func NewNamespaceHandler(svc *service.NamespaceService) *NamespaceHandler {
	return &NamespaceHandler{svc: svc}
}

func (h *NamespaceHandler) Create(c *gin.Context) {
	var input service.CreateNamespaceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ns, err := h.svc.Create(input, userID(c))
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, ns)
}

func (h *NamespaceHandler) List(c *gin.Context) {
	list, err := h.svc.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"namespaces": list})
}

func (h *NamespaceHandler) Get(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid namespace id"})
		return
	}

	ns, err := h.svc.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "namespace not found"})
		return
	}
	c.JSON(http.StatusOK, ns)
}
