"use client";

import { useState, useEffect, useCallback } from "react";
import { getLLMConfig, updateLLMConfig } from "@/lib/api";

export default function LLMSettingsPage() {
  const [providerUrl, setProviderUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gpt-4o");
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLLMConfig();
      if (res.llm_config) {
        setProviderUrl(res.llm_config.provider_url || "");
        setApiKey(res.llm_config.api_key || "");
        setModelName(res.llm_config.model_name || "gpt-4o");
        setIsEnabled(res.llm_config.is_enabled);
      }
    } catch {
      // no config yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    if (!providerUrl.trim() || !apiKey.trim()) {
      setError("Provider URL 和 API Key 不能为空");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateLLMConfig({
        provider_url: providerUrl,
        api_key: apiKey,
        model_name: modelName,
        is_enabled: isEnabled,
      });
      setSuccess("配置已保存");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="h-64 rounded-xl bg-[var(--color-bg-default)] shadow-[var(--shadow-card)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">LLM 安全扫描配置</h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
          配置 LLM API 后，技能提交时将使用 AI 进行深度安全审查（提示注入、恶意指令等）
        </p>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-[13px] mb-4 bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border border-[var(--color-danger)]">
          {error}
        </div>
      )}
      {success && (
        <div className="px-3 py-2 rounded-lg text-[13px] mb-4 bg-[var(--color-success-subtle)] text-[var(--color-success)] border border-[var(--color-success)]">
          {success}
        </div>
      )}

      <div className="bg-[var(--color-bg-default)] rounded-xl shadow-[var(--shadow-card)] p-6 space-y-4">
        <div>
          <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
            Provider URL <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            type="text"
            value={providerUrl}
            onChange={(e) => setProviderUrl(e.target.value)}
            placeholder="https://api.openai.com/v1/chat/completions"
            className="w-full px-3 py-2 text-[13px] border border-[var(--color-border-default)] rounded-lg bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 font-mono"
          />
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">支持 OpenAI 兼容的 API 端点</p>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
            API Key <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 text-[13px] border border-[var(--color-border-default)] rounded-lg bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 font-mono"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
            Model Name
          </label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="gpt-4o"
            className="w-full px-3 py-2 text-[13px] border border-[var(--color-border-default)] rounded-lg bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-default)]"}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${isEnabled ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
          <span className="text-[13px] text-[var(--color-text-primary)]">
            {isEnabled ? "已启用 LLM 扫描" : "未启用（将使用正则检测作为降级方案）"}
          </span>
        </div>

        {!isEnabled && (
          <div className="px-3 py-2 rounded-lg bg-[var(--color-warning-subtle)] text-[var(--color-warning)] text-[12px] border border-[var(--color-warning)]">
            未启用 LLM 时，安全扫描仅使用正则表达式检测已知模式。建议配置 LLM 以获得更全面的安全审查。
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium rounded-lg bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50 transition-colors"
          >
            {saving ? "保存中..." : "保存配置"}
          </button>
        </div>
      </div>
    </div>
  );
}
