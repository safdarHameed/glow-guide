import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError, service_unavailable
from app.modules.profiles.service import get_profile
from app.modules.scans.models import Scan, ScanMask
from app.modules.users.models import User
from app.services import youcam
from app.services.remote import download


def aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


async def purge_expired(db: AsyncSession, user: User) -> None:
    await db.execute(delete(Scan).where(Scan.user_id == user.id, Scan.expires_at < datetime.now(UTC)))


async def find_scan(db: AsyncSession, user: User, scan_id: str) -> Scan:
    await purge_expired(db, user)
    stmt = select(Scan).where(Scan.user_id == user.id)
    if scan_id == "latest":
        stmt = stmt.where(Scan.status == "success").order_by(Scan.created_at.desc()).limit(1)
    else:
        try:
            stmt = stmt.where(Scan.id == uuid.UUID(scan_id))
        except ValueError as exc:
            raise AppError(404, "SCAN_NOT_FOUND", "This scan was not found.") from exc
    scan = await db.scalar(stmt)
    if scan is None:
        raise AppError(404, "SCAN_NOT_FOUND", "This scan was not found.")
    return scan


def serialize(scan: Scan) -> dict:
    return {
        "id": str(scan.id),
        "status": scan.status,
        "error": scan.error,
        "createdAt": scan.created_at.isoformat(),
        "city": (scan.city or {}).get("name", "No city"),
        **(scan.report or {}),
    }


async def create(db: AsyncSession, user: User, photo: str) -> Scan:
    profile = await get_profile(db, user)
    if not profile.data.get("scanConsent"):
        raise AppError(400, "CONSENT_REQUIRED", "Please agree to photo analysis before scanning.")
    task = await youcam.create_task(photo)
    scan = Scan(user_id=user.id, task_id=task, city=profile.data.get("city"))
    db.add(scan)
    await db.flush()
    return scan


async def poll(db: AsyncSession, user: User, scan: Scan) -> Scan:
    if scan.status != "running":
        return scan
    if (datetime.now(UTC) - aware(scan.created_at)).total_seconds() > get_settings().scan_timeout_seconds:
        scan.status, scan.error = "timeout", "Analysis is taking longer than usual. Retry with the same photo."
        return scan
    response = (await youcam.poll_task(scan.task_id)).get("data", {})
    status = response.get("task_status")
    if status == "error":
        scan.status, scan.error = (
            "error",
            "We couldn't analyze this face. Face the camera in brighter light and try again.",
        )
        detail = str(response).lower()
        if "below_min_image_size" in detail:
            scan.error = "HD analysis needs at least 1080 pixels on the shorter side. Upload a higher-resolution photo."
        elif "face_too_small" in detail:
            scan.error = "Move closer so your face fills most of the frame, then try again."
        elif "lighting_dark" in detail:
            scan.error = "The photo is too dark. Face a window or soft light and try again."
    elif status == "success":
        try:
            report, masks = youcam.normalize_result(response.get("results", {}))
        except (ValueError, TypeError, AttributeError) as exc:
            raise service_unavailable(
                "INVALID_SCAN_RESULT", "The analysis returned incomplete measurements. Please retry."
            ) from exc

        # Save only isolated masks, never source URLs, selfies or blended output images.
        async def mask(key: str, url: str):
            try:
                content, mime = await download(url)
                if mime not in ("image/png", "image/jpeg"):
                    return None
                return ScanMask(scan_id=scan.id, feature=key, content=content, media_type=mime)
            except (ValueError, OSError, httpx.HTTPError):
                # Mask failure must not discard valid measurements.
                return None

        result_masks = await asyncio.gather(*(mask(k, v) for k, v in masks.items()))
        report["masks"] = {}
        for row in result_masks:
            if row:
                await db.merge(row)
                report["masks"][row.feature] = f"/api/scan/{scan.id}/masks/{row.feature}"
        previous = await db.scalar(
            select(Scan)
            .where(Scan.user_id == user.id, Scan.status == "success", Scan.id != scan.id)
            .order_by(Scan.created_at.desc())
            .limit(1)
        )
        report["change"] = report["overall"] - previous.report["overall"] if previous and previous.report else 0
        report["previousDate"] = previous.created_at.isoformat() if previous else None
        report["date"] = scan.created_at.strftime("%b %d")
        report["time"] = scan.created_at.strftime("%H:%M")
        scan.report, scan.status = report, "success"
        profile = await get_profile(db, user)
        profile.data = {**profile.data, "skinTypeOverride": None, "planOutdated": True}
        if not profile.data.get("keepScanHistory", True):
            scan.expires_at = datetime.now(UTC) + timedelta(minutes=15)
    return scan
