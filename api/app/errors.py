"""Shared error envelope (spec §3.1): { "error": { "code", "message", "details" } }.

FastAPI's default HTTPException handler nests `detail` under a top-level
"detail" key, which doesn't match the spec's error format. Routes raise
HTTPException with a dict detail already shaped as {"error": {...}} (see
app/auth/admin.py); this handler emits that dict as the response body as-is
instead of re-wrapping it.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.requests import Request
from fastapi.responses import JSONResponse


def _envelope(detail) -> dict:
    if isinstance(detail, dict) and "error" in detail:
        return detail
    return {"error": {"code": "HTTP_ERROR", "message": str(detail), "details": {}}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def _http_exception_handler(_request: Request, exc: HTTPException):
        return JSONResponse(status_code=exc.status_code, content=_envelope(exc.detail))
