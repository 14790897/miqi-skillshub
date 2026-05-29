package handler

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func userID(c *gin.Context) uuid.UUID {
	id, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil
	}
	uid, ok := id.(uuid.UUID)
	if !ok {
		return uuid.Nil
	}
	return uid
}
