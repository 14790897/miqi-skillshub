package service

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/middleware"
	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/repository"
)

type AuthService struct {
	db        *gorm.DB
	jwtKey    []byte
	auditRepo *repository.AuditRepo
}

func NewAuthService(db *gorm.DB, jwtSecret string) *AuthService {
	return &AuthService{
		db:        db,
		jwtKey:    []byte(jwtSecret),
		auditRepo: repository.NewAuditRepo(db),
	}
}

func (s *AuthService) Register(email, password string) (*model.User, string, error) {
	if password == "" || len(password) < 6 {
		return nil, "", fmt.Errorf("密码至少需要6个字符")
	}

	var existing model.User
	if err := s.db.Where("email = ?", email).First(&existing).Error; err == nil {
		return nil, "", fmt.Errorf("该邮箱已注册")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", fmt.Errorf("密码加密失败")
	}

	user := model.User{
		Email:        email,
		Username:     email,
		PasswordHash: string(hash),
		Roles:        []model.UserRole{model.RoleConsumer},
	}
	if err := s.db.Create(&user).Error; err != nil {
		return nil, "", fmt.Errorf("注册失败: %w", err)
	}

	token, err := s.issueToken(&user)
	if err != nil {
		return nil, "", err
	}

	s.auditRepo.Log(user.ID, "auth:register", "user", user.ID.String(), nil)
	return &user, token, nil
}

func (s *AuthService) Login(email, password string) (*model.User, string, error) {
	var user model.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, "", fmt.Errorf("邮箱或密码错误")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", fmt.Errorf("邮箱或密码错误")
	}

	now := time.Now()
	user.LastLoginAt = &now
	s.db.Save(&user)

	token, err := s.issueToken(&user)
	if err != nil {
		return nil, "", err
	}

	s.auditRepo.Log(user.ID, "auth:login", "user", user.ID.String(), nil)
	return &user, token, nil
}

func (s *AuthService) ChangePassword(userID uuid.UUID, oldPassword, newPassword string) error {
	if newPassword == "" || len(newPassword) < 6 {
		return fmt.Errorf("新密码至少需要6个字符")
	}

	var user model.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return fmt.Errorf("用户不存在")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return fmt.Errorf("原密码错误")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("密码加密失败")
	}

	user.PasswordHash = string(hash)
	if err := s.db.Save(&user).Error; err != nil {
		return err
	}
	s.auditRepo.Log(userID, "auth:change_password", "user", userID.String(), nil)
	return nil
}

func (s *AuthService) issueToken(user *model.User) (string, error) {
	return s.IssueTokenForUser(user)
}

// IssueTokenForUser issues a signed JWT for an already-authenticated user.
// Exported so that OAuth login handlers can call it directly.
func (s *AuthService) IssueTokenForUser(user *model.User) (string, error) {
	roles := make([]string, len(user.Roles))
	for i, r := range user.Roles {
		roles[i] = string(r)
	}

	claims := &middleware.Claims{
		UserID:   user.ID,
		Username: user.Username,
		Roles:    roles,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtKey)
}

var _ = uuid.Nil
