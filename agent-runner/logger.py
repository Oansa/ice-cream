"""Structured logging module for the agent runner."""
import logging
import sys
from datetime import datetime

# Custom formatter that includes agent context
class AgentFormatter(logging.Formatter):
    """Custom formatter that includes timestamp, level, agent_id, strategy, and message."""

    def __init__(self):
        super().__init__()
        self.default_format = "%(asctime)s | %(levelname)s | %(message)s"
        self.agent_format = "%(asctime)s | %(levelname)s | agent_id=%(agent_id)s | strategy=%(strategy)s | %(message)s"

    def format(self, record):
        # Use agent format if agent_id is present in the record
        if hasattr(record, 'agent_id') and record.agent_id:
            self._style._fmt = self.agent_format
        else:
            self._style._fmt = self.default_format

        return super().format(record)


class AgentLoggerAdapter(logging.LoggerAdapter):
    """Logger adapter that adds agent context to log records."""

    def __init__(self, logger, extra=None):
        super().__init__(logger, extra or {})

    def process(self, msg, kwargs):
        # Merge extra dict with any kwargs extra
        kwargs_extra = kwargs.get('extra', {})
        kwargs_extra.update(self.extra)
        kwargs['extra'] = kwargs_extra
        return msg, kwargs


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Set up structured logging with custom formatting."""
    logger = logging.getLogger("ice_cream_runner")
    logger.setLevel(getattr(logging, log_level.upper()))

    # Clear existing handlers
    logger.handlers.clear()

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level.upper()))

    # Use custom formatter
    formatter = AgentFormatter()
    formatter.default_time_format = "%Y-%m-%d %H:%M:%S"
    formatter.default_msec_format = "%s.%03d"
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)

    return logger


def get_agent_logger(logger: logging.Logger, agent_id: str = None, strategy: str = None) -> AgentLoggerAdapter:
    """Get a logger adapter with agent context."""
    extra = {
        'agent_id': agent_id or 'N/A',
        'strategy': strategy or 'N/A'
    }
    return AgentLoggerAdapter(logger, extra)


# Global logger instance
logger = setup_logging()
