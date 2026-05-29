package service

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/repository"
)

func safeJoinPath(dest, name string) (string, error) {
	clean := filepath.Clean(filepath.Join(dest, name))
	if !strings.HasPrefix(clean, filepath.Clean(dest)+string(os.PathSeparator)) {
		return "", fmt.Errorf("路径穿越攻击检测: %s", name)
	}
	return clean, nil
}

type ArtifactService struct {
	db          *gorm.DB
	versionRepo *repository.VersionRepo
	auditRepo   *repository.AuditRepo
	uploadDir   string
}

func NewArtifactService(db *gorm.DB, uploadDir string) *ArtifactService {
	os.MkdirAll(uploadDir, 0755)
	return &ArtifactService{
		db:          db,
		versionRepo: repository.NewVersionRepo(db),
		auditRepo:   repository.NewAuditRepo(db),
		uploadDir:   uploadDir,
	}
}

type ArtifactResult struct {
	SKILLMDContent string `json:"skill_md_content"`
	FileCount      int    `json:"file_count"`
	TotalSize      int64  `json:"total_size"`
	SHA256         string `json:"sha256"`
	ArtifactURI    string `json:"artifact_uri"`
}

func (s *ArtifactService) Upload(file multipart.File, header *multipart.FileHeader, userID uuid.UUID) (*ArtifactResult, error) {
	// Read entire file into memory for processing
	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("读取文件失败: %w", err)
	}

	// Compute SHA256
	hash := sha256.Sum256(data)
	hashStr := fmt.Sprintf("%x", hash)

	// Save original file
	artifactID := uuid.New().String()
	origPath := filepath.Join(s.uploadDir, artifactID+"_"+header.Filename)
	if err := os.WriteFile(origPath, data, 0644); err != nil {
		return nil, fmt.Errorf("保存文件失败: %w", err)
	}

	// Extract and find SKILL.md
	extractDir := filepath.Join(s.uploadDir, artifactID)
	if err := os.MkdirAll(extractDir, 0755); err != nil {
		return nil, fmt.Errorf("创建解压目录失败: %w", err)
	}

	var skillmd string
	var fileCount int

	ext := strings.ToLower(filepath.Ext(header.Filename))
	switch {
	case ext == ".zip":
		skillmd, fileCount, err = extractZip(data, extractDir)
	case ext == ".gz" && strings.HasSuffix(strings.ToLower(header.Filename), ".tar.gz"):
		skillmd, fileCount, err = extractTarGz(data, extractDir)
	case ext == ".tgz":
		skillmd, fileCount, err = extractTarGz(data, extractDir)
	default:
		// Assume it's a raw SKILL.md or unknown file
		if strings.ToLower(header.Filename) == "skill.md" || strings.HasSuffix(strings.ToLower(header.Filename), ".md") {
			skillmd = string(data)
			fileCount = 1
			writePath := filepath.Join(extractDir, header.Filename)
			os.WriteFile(writePath, data, 0644)
		} else {
			return nil, fmt.Errorf("不支持的文件格式，请上传 .zip 或 .tar.gz 技能包或 SKILL.md 文件")
		}
	}

	if err != nil {
		return nil, fmt.Errorf("解压失败: %w", err)
	}

	if strings.TrimSpace(skillmd) == "" {
		return nil, fmt.Errorf("技能包中未找到 SKILL.md 文件")
	}

	s.auditRepo.Log(userID, "artifact:upload", "artifact", artifactID, map[string]interface{}{
		"filename":  header.Filename,
		"file_count": fileCount,
		"total_size": int64(len(data)),
		"sha256":    hashStr,
	})

	return &ArtifactResult{
		SKILLMDContent: skillmd,
		FileCount:      fileCount,
		TotalSize:      int64(len(data)),
		SHA256:         hashStr,
		ArtifactURI:    origPath,
	}, nil
}

func extractZip(data []byte, dest string) (skillmd string, fileCount int, err error) {
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", 0, err
	}

	for _, f := range reader.File {
		fileCount++
		destPath, err := safeJoinPath(dest, f.Name)
		if err != nil {
			return skillmd, fileCount, err
		}
		name := strings.ToUpper(filepath.Base(f.Name))

		if f.FileInfo().IsDir() {
			os.MkdirAll(destPath, 0755)
			continue
		}

		os.MkdirAll(filepath.Dir(destPath), 0755)

		rc, err := f.Open()
		if err != nil {
			continue
		}
		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			continue
		}

		os.WriteFile(destPath, content, 0644)

		if name == "SKILL.MD" || strings.HasSuffix(name, ".MD") && strings.Contains(string(content), "适用场景") {
			if skillmd == "" {
				skillmd = string(content)
			}
		}
	}
	return
}

func extractTarGz(data []byte, dest string) (skillmd string, fileCount int, err error) {
	gzReader, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return "", 0, err
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", fileCount, err
		}

		fileCount++
		destPath, err := safeJoinPath(dest, header.Name)
		if err != nil {
			return skillmd, fileCount, err
		}

		switch header.Typeflag {
		case tar.TypeDir:
			os.MkdirAll(destPath, 0755)
		case tar.TypeReg:
			os.MkdirAll(filepath.Dir(destPath), 0755)
			content, err := io.ReadAll(tarReader)
			if err != nil {
				continue
			}
			os.WriteFile(destPath, content, 0644)

			name := strings.ToUpper(filepath.Base(header.Name))
			if name == "SKILL.MD" {
				skillmd = string(content)
			}
		}
	}
	return
}
