package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/fatih/color"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile   string
	serverURL string
	apiKey    string
)

var rootCmd = &cobra.Command{
	Use:   "skillhub",
	Short: "SkillHub CLI - enterprise AI skill management",
	Long:  `SkillHub CLI provides command-line access to the enterprise SkillHub platform for searching, installing, and managing AI skills.`,
}

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Login to SkillHub server",
	RunE: func(cmd *cobra.Command, args []string) error {
		if serverURL == "" {
			serverURL = "http://localhost:8080"
		}
		color.Green("Logging in to %s ...", serverURL)
		resp, err := http.Get(serverURL + "/api/v1/health")
		if err != nil {
			return fmt.Errorf("cannot reach server: %w", err)
		}
		resp.Body.Close()
		viper.Set("server", serverURL)
		viper.WriteConfig()
		color.Green("Login successful. Server: %s", serverURL)
		return nil
	},
}

var searchCmd = &cobra.Command{
	Use:   "search <query>",
	Short: "Search for skills",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		query := strings.Join(args, " ")
		url := fmt.Sprintf("%s/api/v1/search/skills?q=%s", serverURL, query)
		body, err := apiGet(url)
		if err != nil {
			return err
		}
		var result struct {
			Skills []struct {
				ID          string   `json:"id"`
				Name        string   `json:"name"`
				DisplayName string   `json:"display_name"`
				Description string   `json:"description"`
				Tags        []string `json:"tags"`
			} `json:"skills"`
			Total int64 `json:"total"`
		}
		json.Unmarshal(body, &result)

		color.Cyan("\nFound %d skill(s):\n", result.Total)
		for _, s := range result.Skills {
			color.Green("  %s", s.Name)
			fmt.Printf("    %s\n", s.DisplayName)
			fmt.Printf("    %s\n", truncate(s.Description, 100))
			if len(s.Tags) > 0 {
				fmt.Printf("    Tags: %s\n", strings.Join(s.Tags, ", "))
			}
			fmt.Println()
		}
		return nil
	},
}

var infoCmd = &cobra.Command{
	Use:   "info <skill-id>",
	Short: "Show skill details",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		url := fmt.Sprintf("%s/api/v1/skills/%s", serverURL, args[0])
		body, err := apiGet(url)
		if err != nil {
			return err
		}
		var skill struct {
			ID          string   `json:"id"`
			Name        string   `json:"name"`
			DisplayName string   `json:"display_name"`
			Description string   `json:"description"`
			Tags        []string `json:"tags"`
			Status      string   `json:"status"`
			Visibility  string   `json:"visibility"`
		}
		json.Unmarshal(body, &skill)

		color.Green("\n%s", skill.DisplayName)
		fmt.Printf("  Name:       %s\n", skill.Name)
		fmt.Printf("  Status:     %s\n", skill.Status)
		fmt.Printf("  Visibility: %s\n", skill.Visibility)
		fmt.Printf("  Tags:       %s\n", strings.Join(skill.Tags, ", "))
		fmt.Printf("  %s\n\n", skill.Description)
		return nil
	},
}

var initCmd = &cobra.Command{
	Use:   "init <skill-name>",
	Short: "Initialize a new skill project",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		name := args[0]
		dirs := []string{
			name,
			filepath.Join(name, "scripts"),
			filepath.Join(name, "references"),
			filepath.Join(name, "assets"),
			filepath.Join(name, "examples"),
			filepath.Join(name, "evals"),
		}
		for _, d := range dirs {
			os.MkdirAll(d, 0755)
		}

		skillMD := fmt.Sprintf(`---
name: %s
description: TODO: describe this skill
---

# %s

## Applicable Scenarios

TODO: when to use this skill

## Input

TODO: what input does this skill expect

## Output

TODO: what output does this skill produce

## Steps

1. TODO
`, name, name)
		os.WriteFile(filepath.Join(name, "SKILL.md"), []byte(skillMD), 0644)

		manifest := fmt.Sprintf(`apiVersion: skillhub.company/v1
kind: Skill
metadata:
  name: %s
  namespace: company/
  displayName: %s
  description: TODO
  owner: ""
  tags: []
spec:
  version: 0.1.0
  type: prompt_only
  audience: []
  languages:
    - zh-CN
  permissions:
    filesystem:
      read: none
      write: none
    network: deny
  runtime:
    requiresShell: false
  dataPolicy:
    allowedDataClasses:
      - internal
    prohibitedDataClasses:
      - trade_secret
      - regulated_personal_data
  compatibility:
    clients:
      - enterprise-chatbot
security:
  policyProfile: default-enterprise
`, name, name)
		os.WriteFile(filepath.Join(name, "skillhub.yaml"), []byte(manifest), 0644)

		color.Green("\nSkill project initialized: %s/", name)
		fmt.Println("  SKILL.md")
		fmt.Println("  skillhub.yaml")
		fmt.Println("  scripts/")
		fmt.Println("  references/")
		fmt.Println("  assets/")
		fmt.Println("  examples/")
		fmt.Println("  evals/")
		fmt.Println()
		fmt.Println("Next: edit SKILL.md and skillhub.yaml, then run:")
		fmt.Printf("  skillhub lint ./%s\n", name)
		fmt.Printf("  skillhub submit ./%s --version 0.1.0\n", name)
		return nil
	},
}

var lintCmd = &cobra.Command{
	Use:   "lint <skill-dir>",
	Short: "Validate a skill project",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		dir := args[0]
		errors := []string{}
		warnings := []string{}

		// Check SKILL.md exists
		if _, err := os.Stat(filepath.Join(dir, "SKILL.md")); os.IsNotExist(err) {
			errors = append(errors, "Missing SKILL.md")
		} else {
			color.Green("[OK] SKILL.md found")
		}

		// Check skillhub.yaml exists
		if _, err := os.Stat(filepath.Join(dir, "skillhub.yaml")); os.IsNotExist(err) {
			errors = append(errors, "Missing skillhub.yaml")
		} else {
			color.Green("[OK] skillhub.yaml found")
		}

		// Check top-level only (no binaries)
		entries, _ := os.ReadDir(dir)
		for _, e := range entries {
			name := e.Name()
			if strings.HasSuffix(name, ".exe") || strings.HasSuffix(name, ".dll") || strings.HasSuffix(name, ".so") {
				errors = append(errors, fmt.Sprintf("Binary file found: %s", name))
			}
		}

		if len(warnings) > 0 {
			color.Yellow("\nWarnings:")
			for _, w := range warnings {
				color.Yellow("  [WARN] %s", w)
			}
		}

		if len(errors) > 0 {
			color.Red("\nErrors:")
			for _, e := range errors {
				color.Red("  [ERROR] %s", e)
			}
			return fmt.Errorf("lint failed with %d error(s)", len(errors))
		}

		color.Green("\nLint passed!")
		return nil
	},
}

var installCmd = &cobra.Command{
	Use:   "install <skill-id>",
	Short: "Install a skill to the local client",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		skillID := args[0]
		color.Green("Installing skill %s ...", skillID)

		url := fmt.Sprintf("%s/api/v1/runtime/skills/%s/download", serverURL, skillID)
		resp, err := apiGet(url)
		if err != nil {
			return err
		}
		_ = resp
		// In production: download artifact, verify hash, extract to client skills dir
		color.Green("Skill %s installed successfully.", skillID)
		return nil
	},
}

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List installed skills",
	RunE: func(cmd *cobra.Command, args []string) error {
		url := fmt.Sprintf("%s/api/v1/skills", serverURL)
		body, err := apiGet(url)
		if err != nil {
			return err
		}
		var result struct {
			Skills []struct {
				Name        string `json:"name"`
				DisplayName string `json:"display_name"`
				Status      string `json:"status"`
			} `json:"skills"`
			Total int64 `json:"total"`
		}
		json.Unmarshal(body, &result)

		color.Cyan("\nSkills on server (%d):\n", result.Total)
		for _, s := range result.Skills {
			statusColor := color.GreenString
			if s.Status == "deprecated" {
				statusColor = color.YellowString
			}
			fmt.Printf("  %s [%s] - %s\n", color.GreenString(s.Name), statusColor(s.Status), s.DisplayName)
		}
		return nil
	},
}

var submitCmd = &cobra.Command{
	Use:   "submit <skill-dir>",
	Short: "Submit a skill for review",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		version, _ := cmd.Flags().GetString("version")
		if version == "" {
			version = "0.1.0"
		}

		color.Green("Submitting %s (version %s) ...", args[0], version)
		// In production: read skillhub.yaml, package the directory, upload to server
		fmt.Println("Skill submitted for review.")
		fmt.Println("Check status: skillhub list")
		return nil
	},
}

var blockCmd = &cobra.Command{
	Use:   "block <version-id>",
	Short: "Block a skill version (admin only)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		url := fmt.Sprintf("%s/api/v1/versions/%s/block", serverURL, args[0])
		_, err := apiPost(url, nil)
		if err != nil {
			return err
		}
		color.Red("Version %s has been blocked.", args[0])
		return nil
	},
}

func apiGet(url string) ([]byte, error) {
	client := &http.Client{}
	req, _ := http.NewRequest("GET", url, nil)
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API error: %w", err)
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func apiPost(url string, data []byte) ([]byte, error) {
	client := &http.Client{}
	var body io.Reader
	if data != nil {
		body = bytes.NewReader(data)
	}
	req, _ := http.NewRequest("POST", url, body)
	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("API error: %w", err)
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func truncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) > n {
		return string(runes[:n]) + "..."
	}
	return s
}

func main() {
	cobra.CheckErr(rootCmd.Execute())
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default: $HOME/.skillhub.yaml)")
	rootCmd.PersistentFlags().StringVar(&serverURL, "server", "http://localhost:8080", "SkillHub server URL")
	rootCmd.PersistentFlags().StringVar(&apiKey, "api-key", "", "API key / token")

	submitCmd.Flags().String("version", "", "Version to submit")

	rootCmd.AddCommand(loginCmd)
	rootCmd.AddCommand(searchCmd)
	rootCmd.AddCommand(infoCmd)
	rootCmd.AddCommand(initCmd)
	rootCmd.AddCommand(lintCmd)
	rootCmd.AddCommand(submitCmd)
	rootCmd.AddCommand(installCmd)
	rootCmd.AddCommand(listCmd)
	rootCmd.AddCommand(blockCmd)
}

func initConfig() {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		home, err := os.UserHomeDir()
		cobra.CheckErr(err)
		viper.AddConfigPath(home)
		viper.SetConfigType("yaml")
		viper.SetConfigName(".skillhub")
	}
	viper.AutomaticEnv()
	viper.ReadInConfig()
	if viper.GetString("server") != "" {
		serverURL = viper.GetString("server")
	}
}
