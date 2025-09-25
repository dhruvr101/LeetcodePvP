from pydantic import BaseModel
from typing import List, Optional

class Player(BaseModel):
    id: str
    name: str
    score: int = 0

class Room(BaseModel):
    id: str
    code: str
    hostId: str
    players: List[Player] = []
    started: bool = False
    timeLeft: Optional[int] = None
