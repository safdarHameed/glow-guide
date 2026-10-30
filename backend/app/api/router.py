from fastapi import APIRouter

from app.modules.auth.router import router as auth_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)

# Next modules from the build map plug in here as they are built:
# profiles (/profile), scans (/scan), environment (/environment), products (/products),
# plans (/plan, /plans), trips (/trip), saved (/saved), dashboard (/dashboard).
