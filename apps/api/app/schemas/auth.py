from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_mfa: bool = False
    mfa_token: Optional[str] = None
    refresh_token: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class MFALoginRequest(BaseModel):
    email: EmailStr
    password: str
    mfa_code: str


class MFASetupResponse(BaseModel):
    secret: str
    otpauth_uri: str


class MFAVerifyRequest(BaseModel):
    code: str


class MFAEnableRequest(BaseModel):
    code: str


class TokenPayload(BaseModel):
    sub: str
    exp: int
    iss: str
    iat: int


class SocialLoginRequest(BaseModel):
    provider: Literal["apple", "google"]
    id_token: str = Field(..., min_length=20)
    full_name: Optional[str] = None
    nonce: Optional[str] = None


class SocialLoginResponse(Token):
    needs_onboarding: bool
    user: UserResponse


class CompleteOnboardingRequest(BaseModel):
    agency_name: Optional[str] = None
    consent: bool = False


class MFACompleteRequest(BaseModel):
    """Finish MFA after password or social login that returned requires_mfa."""
    mfa_token: str
    mfa_code: str
