"""SkillHub worker - Celery application factory."""

import os
from celery import Celery

app = Celery("skillhub")

redis_host = os.getenv("REDIS_HOST", "localhost")
redis_port = os.getenv("REDIS_PORT", "6379")

app.conf.update(
    broker_url=f"redis://{redis_host}:{redis_port}/0",
    result_backend=f"redis://{redis_host}:{redis_port}/1",
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

app.autodiscover_tasks(["scanners", "llm_judge", "sandbox"])
