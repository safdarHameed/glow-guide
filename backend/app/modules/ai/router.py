from fastapi import APIRouter, Request, status

from app.api.deps import CurrentUser, DbSession
from app.core.rate_limit import AUTH_RATE_LIMIT, limiter
from app.core.schemas import MessageOut
from app.modules.ai import service
from app.modules.ai.schemas import AiStatusOut, ConnectIn, ModelsIn, ModelsOut

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/status", response_model=AiStatusOut)
async def ai_status(db: DbSession, user: CurrentUser) -> AiStatusOut:
    """Active model (free tier or the user's own), today's free usage, and providers that can be connected."""
    return await service.status(db, user)


@router.post("/models", response_model=ModelsOut)
@limiter.limit(AUTH_RATE_LIMIT)
async def ai_models(request: Request, body: ModelsIn, user: CurrentUser) -> ModelsOut:
    """Lists the models a key can use, which also confirms the key works. The key is not stored."""
    return ModelsOut(models=await service.list_models(body.provider, body.api_key, body.base_url))


@router.put("/connection", response_model=MessageOut)
@limiter.limit(AUTH_RATE_LIMIT)
async def ai_connect(request: Request, body: ConnectIn, db: DbSession, user: CurrentUser) -> MessageOut:
    await service.connect(db, user, body)
    return MessageOut(message="Model connected.")


@router.delete("/connection", status_code=status.HTTP_204_NO_CONTENT)
async def ai_disconnect(db: DbSession, user: CurrentUser) -> None:
    await service.disconnect(db, user)
