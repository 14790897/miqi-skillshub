package database

import (
	"log"
	"os"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Open opens a database connection. When dbType is "sqlite", no external
// dependencies are required — useful for local development and testing.
func Open(dbType, dsn string) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch dbType {
	case "sqlite":
		dialector = sqlite.Open(dsn)
	case "postgres":
		dialector = postgres.Open(dsn)
	default:
		dialector = postgres.Open(dsn)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	// PostgreSQL UUID extension
	if dbType == "postgres" {
		db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
		db.Exec("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"")
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)

	if dbType == "sqlite" {
		// Enable WAL and foreign keys
		db.Exec("PRAGMA journal_mode=WAL")
		db.Exec("PRAGMA foreign_keys=ON")
	}

	log.Printf("[DB] Connected to %s (%s)", dbType, dsn)
	return db, nil
}

// DevDB connects to or creates a local SQLite database for development.
func DevDB() (*gorm.DB, error) {
	path := os.Getenv("SKILLHUB_DB_PATH")
	if path == "" {
		path = "skillhub.db"
	}
	return Open("sqlite", path)
}
