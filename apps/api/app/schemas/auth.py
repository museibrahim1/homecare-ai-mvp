from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_mfa: bool = False
    mfa_token: Optional[str] = None


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
