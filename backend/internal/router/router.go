package router

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/handler"
	"github.com/lichman0405/miqi-skills-hub/internal/middleware"
	"github.com/lichman0405/miqi-skills-hub/internal/service"
)

var devUserID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

type RouterConfig struct {
	DB        *gorm.DB
	Logger    *zap.Logger
	JWTSecret string
	DevMode   bool
}

func New(cfg RouterConfig) *gin.Engine {
	r := gin.New()

	r.Use(middleware.RequestID())
	r.Use(middleware.Logger(cfg.Logger))
	r.Use(middleware.Recovery(cfg.Logger))
	corsOrigins := []string{"http://localhost:3000", "http://localhost:5173"}
	if cfg.DevMode {
		corsOrigins = []string{"http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:5173"}
	}
	r.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Request-ID"},
		AllowCredentials: true,
	}))

	// Services
	authSvc := service.NewAuthService(cfg.DB, cfg.JWTSecret)
	scanSvc := service.NewScanService(cfg.DB)
	skillSvc := service.NewSkillService(cfg.DB)
	nsSvc := service.NewNamespaceService(cfg.DB)
	versionSvc := service.NewVersionService(cfg.DB, scanSvc)
	reviewSvc := service.NewReviewService(cfg.DB)
	profileSvc := service.NewProfileService(cfg.DB)
	adminSvc := service.NewAdminService(cfg.DB)
	artifactSvc := service.NewArtifactService(cfg.DB, "./uploads")
	teamSvc := service.NewTeamService(cfg.DB)

	// Handlers
	authH := handler.NewAuthHandler(authSvc)
	skillH := handler.NewSkillHandler(skillSvc)
	nsH := handler.NewNamespaceHandler(nsSvc)
	searchH := handler.NewSearchHandler(cfg.DB)
	versionH := handler.NewVersionHandler(versionSvc)
	reviewH := handler.NewReviewHandler(reviewSvc)
	scanH := handler.NewScanHandler(cfg.DB, scanSvc)
	runtimeH := handler.NewRuntimeHandler(cfg.DB)
	profileH := handler.NewProfileHandler(profileSvc, authSvc)
	adminH := handler.NewAdminHandler(adminSvc)
	artifactH := handler.NewArtifactHandler(artifactSvc)
	teamH := handler.NewTeamHandler(teamSvc)

	var auth gin.HandlerFunc
	if cfg.DevMode {
		auth = devAuth()
	} else {
		auth = middleware.Auth(cfg.JWTSecret)
	}

	// RBAC helpers
	authorRoles := []string{"author", "maintainer", "platform_admin"}
	maintainerRoles := []string{"maintainer", "platform_admin"}
	reviewerRoles := []string{"security_reviewer", "maintainer", "platform_admin"}
	adminRoles := []string{"platform_admin", "namespace_admin"}

	noop := func(c *gin.Context) { c.Next() }
	requireAuthor := middleware.RequireRoles(authorRoles...)
	requireMaintainer := middleware.RequireRoles(maintainerRoles...)
	requireReviewer := middleware.RequireRoles(reviewerRoles...)
	requireAdmin := middleware.RequireRoles(adminRoles...)
	if cfg.DevMode {
		requireAuthor = noop
		requireMaintainer = noop
		requireReviewer = noop
		requireAdmin = noop
	}

	api := r.Group("/api/v1")
	{
		// Auth routes (no auth required)
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", authH.Register)
			authGroup.POST("/login", authH.Login)
		}

		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// Artifact upload (auth required)
		artifact := api.Group("/artifacts")
		artifact.Use(auth)
		{
			artifact.POST("/upload", artifactH.Upload)
		}

		// Profile
		profile := api.Group("/profile")
		profile.Use(auth)
		{
			profile.GET("", profileH.Get)
			profile.PATCH("", profileH.Update)
			profile.POST("/change-password", profileH.ChangePassword)
		}

		// Skills
		skills := api.Group("/skills")
		skills.Use(auth)
		{
			skills.GET("", skillH.List)
			skills.POST("", requireAuthor, skillH.Create)
			skills.GET("/:id", skillH.Get)
			skills.PATCH("/:id", requireAuthor, skillH.Update)
			skills.DELETE("/:id", requireAuthor, skillH.Delete)

			skills.GET("/:id/versions", versionH.ListBySkill)
			skills.POST("/:id/versions", requireAuthor, versionH.Create)
		}

		// Versions (standalone operations)
		versions := api.Group("/versions")
		versions.Use(auth)
		{
			versions.GET("/:vid", versionH.Get)
			versions.POST("/:vid/submit", requireAuthor, versionH.Submit)
			versions.POST("/:vid/llm-scan", requireAuthor, versionH.TriggerLLMScan)
			versions.POST("/:vid/submit-review", requireAuthor, versionH.SubmitForHumanReview)
			versions.POST("/:vid/publish", requireMaintainer, versionH.Publish)
			versions.POST("/:vid/deprecate", requireMaintainer, versionH.Deprecate)
			versions.POST("/:vid/block", requireMaintainer, versionH.Block)

			versions.POST("/:vid/scan", scanH.TriggerScan)
			versions.GET("/:vid/scan-reports", scanH.ListByVersion)
		}

		// Scan reports
		scanReports := api.Group("/scan-reports")
		scanReports.Use(auth)
		{
			scanReports.GET("/:rid", scanH.GetReport)
		}

		// Namespaces
		ns := api.Group("/namespaces")
		ns.Use(auth)
		{
			ns.GET("", nsH.List)
			ns.POST("", requireAdmin, nsH.Create)
			ns.GET("/:id", nsH.Get)
		}

		// Reviews
		reviews := api.Group("/reviews")
		reviews.Use(auth)
		{
			reviews.GET("/pending", reviewH.ListPending)
			reviews.POST("/:id/approve", requireReviewer, reviewH.Approve)
			reviews.POST("/:id/request-changes", requireReviewer, reviewH.RequestChanges)
			reviews.POST("/:id/reject", requireReviewer, reviewH.Reject)
		}

		// Search
		search := api.Group("/search")
		search.Use(auth)
		{
			search.GET("/skills", searchH.Search)
		}

		// Runtime (for agent clients)
		runtime := api.Group("/runtime")
		runtime.Use(auth)
		{
			runtime.GET("/skills", runtimeH.ListSkills)
			runtime.GET("/skills/:namespace/:name/:version/install-manifest", runtimeH.GetInstallManifest)
			runtime.GET("/skills/:namespace/:name/:version/download", runtimeH.Download)
		}

		// Teams
		teams := api.Group("/teams")
		teams.Use(auth)
		{
			teams.GET("", teamH.List)
			teams.POST("", requireAdmin, teamH.Create)
			teams.GET("/:id", teamH.Get)
			teams.PATCH("/:id", requireAdmin, teamH.Update)
			teams.DELETE("/:id", requireAdmin, teamH.Delete)
			teams.GET("/:id/members", teamH.ListMembers)
			teams.POST("/:id/members", requireAdmin, teamH.AddMember)
			teams.DELETE("/:id/members/:userId", requireAdmin, teamH.RemoveMember)
		}

		// Admin
		admin := api.Group("/admin")
		admin.Use(auth)
		if !cfg.DevMode {
			admin.Use(middleware.RequireRoles("platform_admin"))
		}
		{
			admin.GET("/audit", searchH.ListAudit)
			admin.GET("/users", adminH.ListUsers)
			admin.PATCH("/users/:id", adminH.UpdateUserRoles)
			admin.GET("/llm-config", adminH.GetLLMConfig)
			admin.PUT("/llm-config", adminH.UpdateLLMConfig)
		}
	}

	return r
}

func devAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("user_id", devUserID)
		c.Set("username", "dev-user")
		c.Set("roles", []string{"consumer", "author", "maintainer", "platform_admin"})
		c.Next()
	}
}
