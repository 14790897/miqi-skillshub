package config

import (
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	MinIO    MinIOConfig
	JWT      JWTConfig
	LLM      LLMConfig
	Scan     ScanConfig
	OAuth    OAuthConfig
}

// OAuthConfig holds settings for SkillHub as an OAuth2 client connecting to an external provider (e.g. Sandbox).
type OAuthConfig struct {
	// ProviderBaseURL is the base URL of the OAuth2 provider, e.g. "http://sandbox.example.com"
	ProviderBaseURL string
	// ClientID registered in the provider
	ClientID string
	// ClientSecret registered in the provider
	ClientSecret string
	// RedirectURI must match what the provider has whitelisted
	// e.g. "http://localhost:8088/api/v1/auth/oauth/callback"
	RedirectURI string
	// FrontendURL is where the browser is redirected after successful login
	// e.g. "http://localhost:3000"
	FrontendURL string
}

type ServerConfig struct {
	Host         string
	Port         int
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	SSLMode  string
}

func (c DatabaseConfig) DSN() string {
	return "host=" + c.Host +
		" user=" + c.User +
		" password=" + c.Password +
		" dbname=" + c.Name +
		" port=" + itoa(c.Port) +
		" sslmode=" + c.SSLMode
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

type MinIOConfig struct {
	Endpoint  string
	AccessKey string
	SecretKey string
	Bucket    string
	UseSSL    bool
}

type JWTConfig struct {
	Secret     string
	Expiration time.Duration
}

type LLMConfig struct {
	Endpoint string
	APIKey   string
	Model    string
}

type ScanConfig struct {
	SandboxImage   string
	TimeoutSeconds int
	MaxFileSizeMB  int
}

func Load() *Config {
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.read_timeout", 30*time.Second)
	viper.SetDefault("server.write_timeout", 30*time.Second)

	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.user", "skillhub")
	viper.SetDefault("database.password", "skillhub")
	viper.SetDefault("database.name", "skillhub")
	viper.SetDefault("database.sslmode", "disable")

	viper.SetDefault("redis.host", "localhost")
	viper.SetDefault("redis.port", 6379)
	viper.SetDefault("redis.password", "")
	viper.SetDefault("redis.db", 0)

	viper.SetDefault("minio.endpoint", "localhost:9000")
	viper.SetDefault("minio.access_key", "minioadmin")
	viper.SetDefault("minio.secret_key", "minioadmin")
	viper.SetDefault("minio.bucket", "skillhub-artifacts")
	viper.SetDefault("minio.use_ssl", false)

	viper.SetDefault("jwt.secret", "change-me-in-production")
	viper.SetDefault("jwt.expiration", 24*time.Hour)

	viper.SetDefault("llm.endpoint", "http://localhost:11434")
	viper.SetDefault("llm.api_key", "")
	viper.SetDefault("llm.model", "llama3")

	viper.SetDefault("scan.sandbox_image", "skillhub-sandbox:latest")
	viper.SetDefault("scan.timeout_seconds", 300)
	viper.SetDefault("scan.max_file_size_mb", 50)

	// OAuth2 client (SkillHub as consumer of Sandbox SSO)
	// Dev default points to the MiQroSandbox dev server per official docs.
	viper.SetDefault("oauth.provider_base_url", "http://139.196.211.120:6810")
	viper.SetDefault("oauth.client_id", "miqi")
	viper.SetDefault("oauth.client_secret", "miqro123456")
	viper.SetDefault("oauth.redirect_uri", "http://localhost:8088/api/v1/auth/oauth/callback")
	viper.SetDefault("oauth.frontend_url", "http://localhost:3000")

	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	viper.AutomaticEnv()
	_ = viper.ReadInConfig()

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		panic("failed to unmarshal config: " + err.Error())
	}
	return &cfg
}

func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	s := ""
	for i > 0 {
		s = string(rune('0'+i%10)) + s
		i /= 10
	}
	return s
}
