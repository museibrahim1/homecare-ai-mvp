from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserResponse
from app.services.audit import log_action

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    log_action(db, user.id, "user_login", "user", user.id)
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information."""
    return current_user


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout current user (client should discard token)."""
    return {"message": "Successfully logged out"}
