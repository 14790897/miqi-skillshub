{{/*
Expand the name of the chart.
*/}}
{{- define "skillhub.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "skillhub.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart label string.
*/}}
{{- define "skillhub.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "skillhub.labels" -}}
helm.sh/chart: {{ include "skillhub.chart" . }}
{{ include "skillhub.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "skillhub.selectorLabels" -}}
app.kubernetes.io/name: {{ include "skillhub.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service account name
*/}}
{{- define "skillhub.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "skillhub.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Image tag helper — falls back to Chart.AppVersion
*/}}
{{- define "skillhub.imageTag" -}}
{{- .tag | default $.Chart.AppVersion }}
{{- end }}

{{/*
PostgreSQL host
*/}}
{{- define "skillhub.postgresHost" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" (include "skillhub.fullname" .) }}
{{- else }}
{{- .Values.postgresql.external.host }}
{{- end }}
{{- end }}

{{/*
PostgreSQL port
*/}}
{{- define "skillhub.postgresPort" -}}
{{- if .Values.postgresql.enabled }}5432{{- else }}{{- .Values.postgresql.external.port }}{{- end }}
{{- end }}

{{/*
Redis host
*/}}
{{- define "skillhub.redisHost" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis" (include "skillhub.fullname" .) }}
{{- else }}
{{- .Values.redis.external.host }}
{{- end }}
{{- end }}

{{/*
MinIO endpoint
*/}}
{{- define "skillhub.minioEndpoint" -}}
{{- if .Values.minio.enabled }}
{{- printf "%s-minio:%d" (include "skillhub.fullname" .) (.Values.minio.service.apiPort | int) }}
{{- else }}
{{- .Values.minio.external.endpoint }}
{{- end }}
{{- end }}
