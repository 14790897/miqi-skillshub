"""SkillHub worker - Celery application factory."""

from celery import Celery

app = Celery("skillhub")

app.conf.update(
    broker_url="redis://localhost:6379/0",
    result_backend="redis://localhost:6379/1",
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
