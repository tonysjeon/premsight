from datetime import UTC, date, datetime, timedelta

from app.services.match_window import FixtureClock, plan_refresh


def _at(hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 8, 30, hour, minute, tzinfo=UTC)


def _fixture(status: str, kickoff: datetime) -> FixtureClock:
    return FixtureClock(status=status, kickoff_at=kickoff)  # type: ignore[arg-type]


def test_empty_store_requests_schedule_sync() -> None:
    plan = plan_refresh((), _at(12), last_schedule_sync=datetime(2026, 8, 29, tzinfo=UTC))
    assert plan.mode == "schedule"
    assert plan.reason == "no current-season fixtures stored"


def test_pre_kickoff_window_polls_results_without_live_interval() -> None:
    kickoff = _at(15, 0)
    plan = plan_refresh((_fixture("scheduled", kickoff),), _at(14, 50), last_schedule_sync=_at(8))
    assert plan.mode == "results"
    assert plan.reason == "match window"
    assert plan.sleep == timedelta(minutes=3)
    assert plan.date_from == date(2026, 8, 30)
    assert plan.date_to == date(2026, 8, 30)


def test_kicked_off_or_live_uses_live_poll_interval() -> None:
    kickoff = _at(15, 0)
    started = plan_refresh((_fixture("scheduled", kickoff),), _at(15, 5), last_schedule_sync=_at(8))
    live = plan_refresh((_fixture("live", kickoff),), _at(15, 20), last_schedule_sync=_at(8))
    assert started.mode == "results"
    assert started.sleep == timedelta(seconds=60)
    assert live.sleep == timedelta(seconds=60)
    assert live.reason == "live matches"


def test_completed_games_do_not_keep_result_polling() -> None:
    today = _fixture("completed", _at(14))
    next_week = _fixture("scheduled", datetime(2026, 9, 12, 14, tzinfo=UTC))
    last = _at(10)
    plan = plan_refresh((today, next_week), _at(18), last_schedule_sync=last)
    assert plan.mode == "idle"
    assert plan.date_from is None
    assert plan.sleep == timedelta(hours=16)


def test_startup_without_window_syncs_schedule() -> None:
    later = _fixture("scheduled", _at(20))
    plan = plan_refresh((later,), _at(12), last_schedule_sync=None)
    assert plan.mode == "schedule"
    assert plan.reason == "startup schedule sync"


def test_overdue_schedule_sync_when_idle() -> None:
    later = _fixture("scheduled", datetime(2026, 9, 12, 14, tzinfo=UTC))
    last = datetime(2026, 8, 29, 10, tzinfo=UTC)
    plan = plan_refresh((later,), _at(12), last_schedule_sync=last)
    assert plan.mode == "schedule"
    assert plan.reason == "periodic schedule sync"


def test_result_window_wins_over_overdue_schedule_sync() -> None:
    live = _fixture("live", _at(15))
    last = datetime(2026, 8, 29, 10, tzinfo=UTC)
    plan = plan_refresh((live,), _at(16), last_schedule_sync=last)
    assert plan.mode == "results"


def test_idle_sleep_is_capped_by_next_schedule_sync() -> None:
    later = _fixture("scheduled", datetime(2026, 9, 12, 14, tzinfo=UTC))
    last = _at(10)
    plan = plan_refresh(
        (later,),
        _at(12),
        last_schedule_sync=last,
        schedule_every=timedelta(hours=6),
    )
    assert plan.mode == "idle"
    assert plan.sleep == timedelta(hours=4)
