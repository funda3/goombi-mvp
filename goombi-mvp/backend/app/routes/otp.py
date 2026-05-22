from fastapi import APIRouter

from ..models import OtpRequest, OtpResponse, OtpVerify


router = APIRouter(prefix="/api/otp", tags=["otp"])


@router.post("/request", response_model=OtpResponse)
def request_otp(payload: OtpRequest) -> OtpResponse:
    return OtpResponse(
        status="placeholder",
        message=f"Demo OTP requested for {payload.cellphone}. Use any 4+ digit code.",
    )


@router.post("/verify", response_model=OtpResponse)
def verify_otp(payload: OtpVerify) -> OtpResponse:
    return OtpResponse(
        status="placeholder",
        message=f"Demo OTP accepted for {payload.cellphone}.",
        otp_verified=True,
    )
