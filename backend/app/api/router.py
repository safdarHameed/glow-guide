from fastapi import APIRouter

from app.api.application import router as application_router
from app.modules.auth.router import router as auth_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(application_router)
