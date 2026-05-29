"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSkill, createVersion, listNamespaces, uploadArtifact } from "@/lib/api";
import type { Namespace, SkillVersion } from "@/lib/types";
import { CheckIcon } from "@/components/icons";

const steps = [
  { label: "选择方式", description: "选择创建方式" },
  { label: "基本信息", description: "填写技能详情" },
  { label: "技能内容", description: "编辑技能内容" },
  { label: "确认提交", description: "审核并提交" },
];

const skillTypes = [
  { value: "prompt_only", label: "纯指令", description: "仅包含 AI 指令，无需脚本或附件" },
  { value: "prompt_with_references", label: "指令+参考资料", description: "包含参考文档、模板等辅助材料" },
  { value: "prompt_with_scripts", label: "指令+脚本", description: "包含 Python/Shell 脚本，需要安全审核" },
];

export default function CreateSkillPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [creationMethod, setCreationMethod] = useState<"blank" | "template" | "upload">("blank");

  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [namespaceId, setNamespaceId] = useState("");
  const [skillType, setSkillType] = useState("prompt_only");
  const [visibility, setVisibility] = useState("org");
  const [tags, setTags] = useState("");
  const [skillContent, setSkillContent] = useState("");
  const [artifactUri, setArtifactUri] = useState("");
  const [artifactSha256, setArtifactSha256] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    listNamespaces().then((res) => {
      const ns = res.namespaces ?? [];
      setNamespaces(ns);
      if (ns.length > 0) setNamespaceId(ns[0].id);
    }).catch(() => {});
  }, []);

  const startCreation = (method: "blank" | "template" | "upload") => {
    setCreationMethod(method);
    if (method === "upload") {
      setStep(2);
    } else if (method === "template") {
      setSkillContent(`---
name: my-skill
description: 技能描述
---

# 技能名称

## 适用场景
描述该技能适用的工作场景...

## 输入要求
描述需要的输入信息...

## 输出格式
描述输出结果的格式...`);
      setStep(1);
    } else {
      setStep(1);
    }
  };

  const validateStep1 = (): boolean => {
    if (!name.trim()) { setError("技能名称不能为空"); return false; }
    if (!/^[a-z0-9-]+$/.test(name)) { setError("技能名称只能包含小写字母、数字和连字符"); return false; }
    if (!displayName.trim()) { setError("展示名称不能为空"); return false; }
    if (!namespaceId) { setError("请选择命名空间"); return false; }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!skillContent.trim() && !artifactUri) { setError("请填写 SKILL.md 内容或上传技能包文件"); return false; }
    return true;
  };

  const handleNext = () => {
    setError("");
    if (step === 0) {
      // Step 0 is method selection — always valid
      setStep(1);
    } else if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    }
  };

  const handleCreate = async () => {
    if (!validateStep1()) return;
    if (!validateStep2()) return;
    setSaving(true);
    setError("");
    try {
      const skill = await createSkill({
        name,
        display_name: displayName,
        description,
        namespace_id: namespaceId,
        visibility: visibility as "private" | "team" | "org",
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      if (artifactUri || skillContent) {
        try {
          const verData: Partial<SkillVersion> = {
            version: "0.1.0",
            release_note: "初始版本",
          };
          if (artifactUri) verData.artifact_uri = artifactUri;
          if (artifactSha256) verData.artifact_sha256 = artifactSha256;
          await createVersion(skill.id, verData);
        } catch {
          // version creation failed but skill was created -- still navigate
        }
      }
      router.push(`/skills/${skill.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await uploadArtifact(file);
      setSkillContent(result.skill_md_content);
      setArtifactUri(result.artifact_uri || "");
      setArtifactSha256(result.sha256 || "");
      if (!name.trim()) {
        const match = result.skill_md_content.match(/^---\s*\nname:\s*(.+)/m);
        if (match) setName(match[1].trim());
      }
      setError("上传成功！已提取 SKILL.md 内容。");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)] mb-8">
        创建技能
      </h1>

      {/* Step indicators */}
      <div className="flex items-center mb-10">
        {steps.map((s, i) => (
          <div key={s.label} className="flex-1 flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                  i < step
                    ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                    : i === step
                    ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                    : "bg-[var(--color-bg-default)] text-[var(--color-text-tertiary)] border-[var(--color-border-default)]"
                }`}
              >
                {i < step ? <CheckIcon className="w-4 h-4" /> : i + 1}
              </div>
              <div className="mt-1.5">
                <div className={`text-[11px] font-medium whitespace-nowrap ${i <= step ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>{s.label}</div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-14px] rounded-full ${i < step ? "bg-[var(--color-accent)]" : "bg-[var(--color-border-default)]"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error / success banner */}
      {error && (
        <div className={`px-3 py-2 rounded-md text-[13px] mb-6 border ${
          error.startsWith("上传成功")
            ? "bg-[var(--color-success-subtle)] text-[var(--color-success)] border-[var(--color-success)]"
            : "bg-[var(--color-danger-subtle)] text-[var(--color-danger)] border-[var(--color-danger)]"
        }`}>{error}</div>
      )}

      {/* Step 0: Method selection */}
      {step === 0 && (
        <div className="space-y-3">
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-4">
            选择 AI 技能的创建方式
          </p>
          <button
            onClick={() => startCreation("blank")}
            className="w-full text-left p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="font-semibold text-[14px] text-[var(--color-text-primary)] mb-0.5">从空白创建</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">从零开始，通过表单填写技能详情和内容</div>
          </button>
          <button
            onClick={() => startCreation("template")}
            className="w-full text-left p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="font-semibold text-[14px] text-[var(--color-text-primary)] mb-0.5">从模板创建</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">使用预设模板快速创建常见场景技能</div>
          </button>
          <button
            onClick={() => startCreation("upload")}
            className="w-full text-left p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="font-semibold text-[14px] text-[var(--color-text-primary)] mb-0.5">上传本地文件</div>
            <div className="text-[12px] text-[var(--color-text-secondary)]">上传包含 SKILL.md 的 zip/tar.gz 技能包，自动提取内容</div>
          </button>
        </div>
      )}

      {/* Step 1: Basic info form */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
              技能标识 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="reimbursement-checker"
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">仅限小写字母、数字和连字符</p>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
              展示名称 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="报销单检查工具"
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="简要描述技能的用途和适用场景..."
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
              命名空间 <span className="text-[var(--color-danger)]">*</span>
            </label>
            <select
              value={namespaceId}
              onChange={(e) => setNamespaceId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              {namespaces.length === 0 && <option value="">没有可用的命名空间，请先创建一个</option>}
              {namespaces.map((ns) => (<option key={ns.id} value={ns.id}>{ns.path} - {ns.display_name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">标签</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="finance, document-review"
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">多个标签用逗号分隔</p>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1.5">技能类型</label>
            <div className="space-y-2">
              {skillTypes.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                    skillType === t.value
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
                      : "border-[var(--color-border-default)] bg-[var(--color-bg-default)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.value}
                    checked={skillType === t.value}
                    onChange={(e) => setSkillType(e.target.value)}
                    className="mt-0.5 accent-[var(--color-accent)]"
                  />
                  <div>
                    <div className="text-[13px] font-medium text-[var(--color-text-primary)]">{t.label}</div>
                    <div className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">{t.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1">可见范围</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            >
              <option value="org">组织</option>
              <option value="team">团队</option>
              <option value="private">私有</option>
            </select>
          </div>
        </div>
      )}

      {/* Step 2: Content editor */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-1.5">
              SKILL.md 内容
            </label>
            <textarea
              value={skillContent}
              onChange={(e) => setSkillContent(e.target.value)}
              rows={14}
              placeholder={`---
name: my-skill
description: 技能描述
---

# 技能名称

## 适用场景
...

## 输入要求
...

## 输出格式
...`}
              className="w-full px-2.5 py-1.5 text-[13px] border border-[var(--color-border-default)] rounded-md bg-[var(--color-bg-default)] text-[var(--color-text-primary)] font-mono outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-none"
            />
          </div>

          <div className="p-5 rounded-md border-2 border-dashed border-[var(--color-border-default)] text-center bg-[var(--color-bg-subtle)]">
            <p className="text-[13px] text-[var(--color-text-secondary)] mb-1">
              或上传技能包文件（自动提取 SKILL.md）
            </p>
            <p className="text-[11px] text-[var(--color-text-tertiary)]">
              支持 .zip / .tar.gz，须包含 SKILL.md
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.tar.gz,.tgz,.md"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={uploading}
              className="mt-3 px-2.5 py-1.5 text-[13px] font-medium rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] transition-colors disabled:opacity-50"
            >
              {uploading ? "上传中..." : "选择文件"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation summary */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">确认详情</h3>
          <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)] space-y-2.5">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--color-text-secondary)]">技能标识</span>
              <span className="font-mono font-medium text-[var(--color-text-primary)]">{name}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--color-text-secondary)]">展示名称</span>
              <span className="font-medium text-[var(--color-text-primary)]">{displayName}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--color-text-secondary)]">命名空间</span>
              <span className="font-medium text-[var(--color-text-primary)]">{namespaces.find((n) => n.id === namespaceId)?.path || "-"}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--color-text-secondary)]">类型</span>
              <span className="font-medium text-[var(--color-text-primary)]">{skillTypes.find((t) => t.value === skillType)?.label}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--color-text-secondary)]">可见范围</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {visibility === "org" ? "组织" : visibility === "team" ? "团队" : "私有"}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--color-text-secondary)]">标签</span>
              <span className="font-medium text-[var(--color-text-primary)]">{tags || "-"}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--color-text-secondary)]">安全审核</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {skillType === "prompt_with_scripts" ? "需要安全审批" : "基础扫描"}
              </span>
            </div>
          </div>
          {description && (
            <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
              <div className="text-[11px] text-[var(--color-text-tertiary)] mb-1">描述</div>
              <div className="text-[13px] text-[var(--color-text-primary)]">{description}</div>
            </div>
          )}
          {skillContent && (
            <div className="p-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-default)]">
              <div className="text-[11px] text-[var(--color-text-tertiary)] mb-1">SKILL.md 预览</div>
              <pre className="text-[12px] font-mono text-[var(--color-text-secondary)] max-h-32 overflow-y-auto whitespace-pre-wrap">{skillContent}</pre>
            </div>
          )}
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between mt-10 pt-4 border-t border-[var(--color-border-default)]">
        <button
          onClick={() => {
            if (creationMethod === "upload" && step === 2) {
              setStep(0);
            } else {
              setStep(Math.max(0, step - 1));
            }
          }}
          disabled={step === 0}
          className="px-2.5 py-1.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-subtle)] transition-colors disabled:opacity-30"
        >
          上一步
        </button>
        {step < 3 ? (
          <button
            onClick={handleNext}
            className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] transition-colors"
          >
            下一步
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-emphasis)] disabled:opacity-50 transition-colors"
          >
            {saving ? "创建中..." : "创建技能"}
          </button>
        )}
      </div>
    </div>
  );
}
