from fastapi import APIRouter, Body
from app.schemas.common import ApiResponse
from app.schemas.assistant_schema import ChatRequest, ChatResponse
from app.services.assistant_service import assistant_service

router = APIRouter(prefix="/assistant", tags=["Grounded GenAI Assistant Co-Pilot"])

@router.post("/chat", response_model=ApiResponse[ChatResponse])
async def chat_with_copilot(req: ChatRequest = Body(...)):
    """
    Interact with the grounded AI-REMS operational co-pilot with live telemetry, forecast, and optimization context.
    """
    res = await assistant_service.answer_query(req)
    return ApiResponse(
        success=True,
        message="Assistant response generated successfully",
        data=res
    )
