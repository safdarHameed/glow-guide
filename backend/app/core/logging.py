import logging

from app.core.config import get_settings


def configure_logging() -> None:
    level = logging.WARNING if get_settings().environment == "test" else logging.INFO
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s")
