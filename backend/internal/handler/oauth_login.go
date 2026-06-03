package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/lichman0405/miqi-skills-hub/internal/model"
	"github.com/lichman0405/miqi-skills-hub/internal/service"
)

// OAuthLoginConfig holds Sandbox OAuth2 provider credentials.
// SkillHub is the *client*; Sandbox is the *authorization server*.
type OAuthLoginConfig struct {
	ProviderBaseURL string // e.g. "http://sandbox.example.com"
	ClientID        string // client_id registered at Sandbox
	ClientSecret    string // client_secret registered at Sandbox
	RedirectURI     string // must match Sandbox whitelist, e.g. "http://localhost:8088/api/v1/auth/oauth/callback"
	FrontendURL     string // redirect destination after login, e.g. "http://localhost:3000"
}

// OAuthLoginHandler handles the OAuth2 login flow where SkillHub is the client.
type OAuthLoginHandler struct {
	cfg     OAuthLoginConfig
	authSvc *service.AuthService
	db      *gorm.DB
}

func NewOAuthLoginHandler(cfg OAuthLoginConfig, authSvc *service.AuthService, db *gorm.DB) *OAuthLoginHandler {
	return &OAuthLoginHandler{cfg: cfg, authSvc: authSvc, db: db}
}

// Redirect handles GET /api/v1/auth/oauth/redirect
//
// Builds the Sandbox authorization URL and 302-redirects the browser to it.
//
// Query params:
//
//	scope (optional, default "userinfo")
func (h *OAuthLoginHandler) Redirect(c *gin.Context) {
	scope := c.DefaultQuery("scope", "userinfo")

	authorizeURL, err := url.Parse(h.cfg.ProviderBaseURL + "/api/oauth2/authorize")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid provider base URL"})
		return
	}

	q := authorizeURL.Query()
	q.Set("client_id", h.cfg.ClientID)
	q.Set("response_type", "code")
	q.Set("redirect_uri", h.cfg.RedirectURI)
	q.Set("scope", scope)
	authorizeURL.RawQuery = q.Encode()

	c.Redirect(http.StatusFound, authorizeURL.String())
}

// Callback handles GET /api/v1/auth/oauth/callback
//
// Receives the authorization code from Sandbox, exchanges it for an access token,
// fetches user info, upserts the local user record, issues a SkillHub JWT,
// and 302-redirects the browser to the frontend with the token in a query param.
//
// Note: passing the token in a URL param is acceptable for same-origin SPA flows
// as long as the frontend immediately moves it to localStorage and the token has a
// short TTL. For higher security, use an HttpOnly cookie instead.
func (h *OAuthLoginHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	errParam := c.Query("error")

	if errParam != "" {
		desc := c.DefaultQuery("error_description", errParam)
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/login?error="+url.QueryEscape(desc))
		return
	}

	if code == "" {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/login?error="+url.QueryEscape("missing authorization code"))
		return
	}

	// Step 1: Exchange code for access token at Sandbox
	accessToken, err := h.exchangeCode(code)
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/login?error="+url.QueryEscape("token exchange failed: "+err.Error()))
		return
	}

	// Step 2: Fetch user info from Sandbox
	info, err := h.fetchUserInfo(accessToken)
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/login?error="+url.QueryEscape("userinfo failed: "+err.Error()))
		return
	}

	// Step 3: Upsert local user (find by email or sandbox_user_id, create if not found)
	user, err := h.upsertUser(info)
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/login?error="+url.QueryEscape("user sync failed: "+err.Error()))
		return
	}

	// Step 4: Issue SkillHub JWT
	token, err := h.authSvc.IssueTokenForUser(user)
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.FrontendURL+"/login?error="+url.QueryEscape("token issue failed: "+err.Error()))
		return
	}

	// Step 5: Redirect to frontend with token + oauth indicator
	// Frontend reads ?token= and ?oauth=1 from the URL on the /callback page.
	q := url.Values{"token": {token}, "oauth": {"1"}}
	if user.ExternalID != "" {
		q.Set("provider", "sandbox")
	}
	frontendCallback := h.cfg.FrontendURL + "/callback?" + q.Encode()
	c.Redirect(http.StatusFound, frontendCallback)
}

// ----- private helpers -----

type sandboxTokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Error       string `json:"error"`
}

// sandboxUserInfoResponse wraps the actual userinfo payload.
// Sandbox returns {"code":200,"msg":"...","data":{...}}.
type sandboxUserInfoResponse struct {
	Code int                `json:"code"`
	Msg  string             `json:"msg"`
	Data sandboxUserInfoData `json:"data"`
}

// sandboxUserInfoData holds the user fields returned by Sandbox /api/oauth2/userinfo.
type sandboxUserInfoData struct {
	ID       string `json:"id"`        // Sandbox user ID (numeric string, e.g. "1")
	DeptID   string `json:"deptId"`    // department ID
	UserName string `json:"userName"` // login name, e.g. "admin"
	NickName string `json:"nickName"` // display name, e.g. "管理员"
	UserType int    `json:"userType"`
	Email    string `json:"email"`
	Phone    string `json:"phonenumber"`
	Sex      string `json:"sex"`
	Avatar   string `json:"avatar"` // relative path, e.g. "miqroproject/common/..."
	Status   string `json:"status"`
	Remark   string `json:"remark"`
}

func (h *OAuthLoginHandler) exchangeCode(code string) (string, error) {
	// MiQroSandbox accepts the token params as query string on a POST request.
	// ref: https://docs.miqroera.com/oauth2 — cURL example uses query params.
	q := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"client_id":     {h.cfg.ClientID},
		"client_secret": {h.cfg.ClientSecret},
	}
	// redirect_uri only required if it was sent in the authorize step;
	// Sandbox docs do not include it in the token exchange example, so we
	// include it only when configured to avoid "redirect_uri mismatch" errors.
	if h.cfg.RedirectURI != "" {
		q.Set("redirect_uri", h.cfg.RedirectURI)
	}

	tokenURL := h.cfg.ProviderBaseURL + "/api/oauth2/token?" + q.Encode()

	resp, err := http.Post(tokenURL, "application/x-www-form-urlencoded", nil)
	if err != nil {
		return "", fmt.Errorf("POST /token: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)

	var tok sandboxTokenResponse
	if err := json.Unmarshal(raw, &tok); err != nil {
		return "", fmt.Errorf("parse token response: %w", err)
	}
	if tok.Error != "" {
		return "", fmt.Errorf("provider error: %s", tok.Error)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("provider returned %d: %s", resp.StatusCode, string(raw))
	}

	return tok.AccessToken, nil
}

func (h *OAuthLoginHandler) fetchUserInfo(accessToken string) (*sandboxUserInfoData, error) {
	req, err := http.NewRequest(http.MethodGet, h.cfg.ProviderBaseURL+"/api/oauth2/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET /userinfo: %w", err)
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)

	// Log raw userinfo response for debugging
	fmt.Printf("[OAuth] sandbox userinfo response (status %d): %s\n", resp.StatusCode, string(raw))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("provider returned %d: %s", resp.StatusCode, string(raw))
	}

	var respWrap sandboxUserInfoResponse
	if err := json.Unmarshal(raw, &respWrap); err != nil {
		return nil, fmt.Errorf("parse userinfo: %w", err)
	}
	if respWrap.Code != 200 {
		return nil, fmt.Errorf("provider error: code=%d msg=%s", respWrap.Code, respWrap.Msg)
	}

	info := respWrap.Data
	fmt.Printf("[OAuth] parsed userinfo: id=%q userName=%q nickName=%q email=%q\n",
		info.ID, info.UserName, info.NickName, info.Email)

	return &info, nil
}

func (h *OAuthLoginHandler) upsertUser(info *sandboxUserInfoData) (*model.User, error) {
	var user model.User

	// Primary lookup: by Sandbox user ID stored in external_id
	if info.ID != "" {
		if err := h.db.Where("external_id = ?", info.ID).First(&user).Error; err == nil {
			now := time.Now()
			updates := map[string]interface{}{
				"last_login_at": &now,
			}
			if info.NickName != "" && user.DisplayName == "" {
				updates["display_name"] = info.NickName
			}
			if info.Avatar != "" {
				updates["avatar_url"] = info.Avatar
			}
			h.db.Model(&user).Updates(updates)
			return &user, nil
		}
	}

	// Secondary lookup: by email
	if info.Email != "" {
		if err := h.db.Where("email = ?", info.Email).First(&user).Error; err == nil {
			now := time.Now()
			updates := map[string]interface{}{
				"last_login_at": &now,
				"external_id":   info.ID,
			}
			h.db.Model(&user).Updates(updates)
			return &user, nil
		}
	}

	// Tertiary lookup: by username (handles local admin overlap with Sandbox admin)
	if info.UserName != "" {
		if err := h.db.Where("username = ? AND external_id = ''", info.UserName).First(&user).Error; err == nil {
			now := time.Now()
			updates := map[string]interface{}{
				"last_login_at": &now,
				"external_id":   info.ID,
			}
			if info.NickName != "" && user.DisplayName == "" {
				updates["display_name"] = info.NickName
			}
			if info.Avatar != "" {
				updates["avatar_url"] = info.Avatar
			}
			h.db.Model(&user).Updates(updates)
			return &user, nil
		}
	}

	// Not found — create new local user
	username := info.UserName
	if username == "" {
		username = info.Email
	}
	displayName := info.NickName
	if displayName == "" {
		displayName = username
	}

	email := info.Email
	if email == "" {
		email = "oauth_" + username + "@sandbox.local"
	}
	if email == "oauth_@sandbox.local" {
		email = "oauth_user_" + info.ID + "@sandbox.local"
	}

	// Sandbox has no role mapping — default to consumer
	localRoles := []model.UserRole{model.RoleConsumer}

	now := time.Now()
	user = model.User{
		ID:          uuid.New(),
		Email:       email,
		Username:    username,
		DisplayName: displayName,
		AvatarURL:   info.Avatar,
		Department:  info.DeptID,
		ExternalID:  info.ID,
		Roles:       localRoles,
		LastLoginAt: &now,
	}

	if err := h.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	return &user, nil
}
