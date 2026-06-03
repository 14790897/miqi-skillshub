package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/config"
	"github.com/lichman0405/miqi-skills-hub/internal/database"
	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/router"
)

func main() {
	devMode := flag.Bool("dev", false, "Run in development mode (SQLite + no auth)")
	flag.Parse()

	var db *gorm.DB
	var err error

	if *devMode {
		fmt.Println("=== DEV MODE: using SQLite + no auth ===")
		db, err = database.DevDB()
	} else {
		cfg := config.Load()
		db, err = database.Open("postgres", cfg.Database.DSN())
	}

	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	logger, err := zap.NewDevelopment()
	if err != nil {
		log.Fatalf("failed to create logger: %v", err)
	}
	defer logger.Sync()

	// Auto-migrate
	if err := model.MigrateAll(db); err != nil {
		logger.Fatal("failed to run migrations", zap.Error(err))
	}
	logger.Info("database migrations completed")

	if *devMode {
		seedDevUser(db)
	}

	// Router
	r := router.New(router.RouterConfig{
		DB:        db,
		Logger:    logger,
		JWTSecret: "dev-secret",
		DevMode:   *devMode,
		OAuthConfig: router.OAuthClientConfig{
			// MiQroSandbox dev server — see https://docs.miqroera.com/oauth2
			ProviderBaseURL: "http://139.196.211.120:6810",
			ClientID:        "miqi",
			ClientSecret:    "miqro123456",
			// Sandbox must whitelist this redirect_uri
			RedirectURI: "http://localhost:8088/api/v1/auth/oauth/callback",
			FrontendURL: "http://localhost:3000",
		},
	})

	addr := fmt.Sprintf("0.0.0.0:8088")
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	// Graceful shutdown
	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit
		logger.Info("shutting down server...")

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			logger.Fatal("server forced to shutdown", zap.Error(err))
		}
	}()

	logger.Info("server starting", zap.String("addr", addr))
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Fatal("server failed", zap.Error(err))
	}

	logger.Info("server stopped")
}

func seedDevUser(db *gorm.DB) {
	devID := uuid.MustParse("00000000-0000-0000-0000-000000000001")

	var count int64
	db.Model(&model.User{}).Where("id = ?", devID).Count(&count)
	if count > 0 {
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("seed: failed to hash password: %v", err)
		return
	}

	user := model.User{
		ID:           devID,
		Email:        "admin@skillhub.com",
		Username:     "admin@skillhub.com",
		DisplayName:  "管理员",
		PasswordHash: string(hash),
		Roles:        []model.UserRole{model.RoleConsumer, model.RoleAuthor, model.RoleMaintainer, model.RolePlatformAdmin},
	}
	if err := db.Create(&user).Error; err != nil {
		log.Printf("seed: failed to create dev user: %v", err)
		return
	}

	ns := model.Namespace{
		Path:        "default",
		DisplayName: "默认命名空间",
		Description: "默认命名空间，用于存放通用技能",
		OwnerID:     devID,
	}
	if err := db.Create(&ns).Error; err != nil {
		log.Printf("seed: failed to create namespace: %v", err)
		return
	}

	fmt.Println("=== DEV MODE: seeded test user (admin@skillhub.com / admin123) + default namespace ===")
}
