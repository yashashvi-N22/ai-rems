from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str
    timestamp: Optional[datetime] = None

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = Field(default_factory=list)

class ChatResponse(BaseModel):
    response: str
    grounded_context_used: Dict[str, str]
    suggested_followups: List[str]
    timestamp: datetime
