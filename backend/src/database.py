import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGO_URI") 
DB_NAME   = os.getenv("MONGODB_DB", "enterprise_ai")

_client: AsyncIOMotorClient = None


async def connect_db() -> None:
    global _client
    _client = AsyncIOMotorClient(MONGO_URI)
    await _client.admin.command("ping")
    logger.info(f"✓ MongoDB connected → {DB_NAME}")


async def close_db() -> None:
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    return _client[DB_NAME]
