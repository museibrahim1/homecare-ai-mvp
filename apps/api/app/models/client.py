import uuid
from sqlalchemy import Column, String, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class Client(Base, TimestampMixin):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    medical_notes = Column(Text, nullable=True)
    care_plan = Column(Text, nullable=True)
    
    # Relationships
    visits = relationship("Visit", back_populates="client")
    contracts = relationship("Contract", back_populates="client")
