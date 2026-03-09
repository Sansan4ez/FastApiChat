from sqlalchemy import and_, exists, or_, select, update
from app.dao.base import BaseDAO
from app.chat.models import Message
from app.database import async_session_maker


class MessagesDAO(BaseDAO):
    model = Message

    @classmethod
    async def get_messages_between_users(cls, user_id_1: int, user_id_2: int):
        async with async_session_maker() as session:
            query = select(cls.model).filter(
                or_(
                    and_(cls.model.sender_id == user_id_1, cls.model.recipient_id == user_id_2),
                    and_(cls.model.sender_id == user_id_2, cls.model.recipient_id == user_id_1)
                )
            ).order_by(cls.model.id)
            result = await session.execute(query)
            return result.scalars().all()

    @classmethod
    async def mark_chat_as_read(cls, current_user_id: int, other_user_id: int):
        async with async_session_maker() as session:
            async with session.begin():
                query = (
                    update(cls.model)
                    .where(
                        cls.model.sender_id == other_user_id,
                        cls.model.recipient_id == current_user_id,
                        cls.model.is_read.is_(False),
                    )
                    .values(is_read=True)
                )
                result = await session.execute(query)
                await session.commit()
                return result.rowcount

    @classmethod
    async def has_unread_messages(cls, current_user_id: int, other_user_id: int) -> bool:
        async with async_session_maker() as session:
            query = select(
                exists().where(
                    cls.model.sender_id == other_user_id,
                    cls.model.recipient_id == current_user_id,
                    cls.model.is_read.is_(False),
                )
            )
            result = await session.execute(query)
            return bool(result.scalar())
