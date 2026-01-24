import uuid
from sqlalchemy import Column, String, ForeignKey, Text, Boolean, Date, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class Contract(Base, TimestampMixin):
    __tablename__ = "contracts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    
    # Contract details
    contract_number = Column(String(50), unique=True, nullable=True)
    title = Column(String(255), nullable=False)
    
    # Services
    services = Column(JSONB, default=list, nullable=False)
    # [{"name": "Personal Care", "rate": 25.00, "unit": "hour"}, ...]
    
    # Schedule
    schedule = Column(JSONB, default=dict, nullable=False)
    # {"days": ["monday", "wednesday", "friday"], "hours_per_week": 15}
    
    # Rates
    hourly_rate = Column(Numeric(10, 2), nullable=True)
    weekly_hours = Column(Numeric(10, 2), nullable=True)
    
    # Terms
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    cancellation_policy = Column(Text, nullable=True)
    terms_and_conditions = Column(Text, nullable=True)
    
    # Status
    status = Column(String(50), default="draft", nullable=False)
    # draft, pending_signature, active, expired, cancelled
    
    # E-signature
    client_signature_date = Column(Date, nullable=True)
    agency_signature_date = Column(Date, nullable=True)
    
    # Relationships
    client = relationship("Client", back_populates="contracts")
