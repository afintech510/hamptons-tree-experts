"""Photo handling service (spec §7.3/§7.4, R-11/R-20).

Upload: magic-byte validation, Pillow re-encode (EXIF strip),
decompression-bomb guard, UUID filenames under /var/hte/uploads.
Serve: stream from disk through auth'd endpoint only.
Purge: daily job deletes rows + files past purge_after (90d).
"""

from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path

from PIL import Image

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("/var/hte/uploads")

ALLOWED_TYPES = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG\r\n\x1a\n": "png",
    b"RIFF": "webp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_IMAGE_PIXELS = 25_000_000  # decompression-bomb guard
PURGE_DAYS = 90

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


class PhotoValidationError(Exception):
    pass


def _detect_type(header: bytes) -> str | None:
    for magic, fmt in ALLOWED_TYPES.items():
        if header[: len(magic)] == magic:
            if fmt == "webp":
                if len(header) >= 12 and header[8:12] == b"WEBP":
                    return "webp"
                continue
            return fmt
    return None


def validate_and_save(file_data: bytes, original_filename: str) -> tuple[str, str]:
    """Validate a photo upload and save to disk with a UUID filename.

    Returns (file_path, generated_filename).
    Raises PhotoValidationError on bad input.
    """
    if len(file_data) > MAX_FILE_SIZE:
        raise PhotoValidationError(f"File exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit")

    if len(file_data) < 12:
        raise PhotoValidationError("File too small to be a valid image")

    detected = _detect_type(file_data[:12])
    if detected is None:
        raise PhotoValidationError("Unsupported image type — only JPEG, PNG, and WebP are accepted")

    try:
        from io import BytesIO
        img = Image.open(BytesIO(file_data))
        img.load()
    except Image.DecompressionBombError:
        raise PhotoValidationError("Image dimensions exceed safety limits")
    except Exception:
        raise PhotoValidationError("Could not read image — file may be corrupt")

    generated_name = f"{uuid.uuid4().hex}.jpg"
    out_path = UPLOAD_DIR / generated_name

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    rgb = img.convert("RGB")
    rgb.save(str(out_path), "JPEG", quality=85, exif=b"")

    return str(out_path), generated_name


def read_photo(file_path: str) -> bytes | None:
    """Read a photo from disk. Returns None if the file doesn't exist."""
    p = Path(file_path)
    if not p.exists() or not p.is_file():
        return None
    if not str(p.resolve()).startswith(str(UPLOAD_DIR.resolve())):
        return None
    return p.read_bytes()


def delete_photo(file_path: str) -> bool:
    """Delete a photo file from disk."""
    p = Path(file_path)
    if p.exists() and str(p.resolve()).startswith(str(UPLOAD_DIR.resolve())):
        try:
            p.unlink()
            return True
        except OSError:
            logger.warning("Failed to delete photo: %s", file_path)
    return False
