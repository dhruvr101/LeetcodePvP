from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from main import db, get_current_user

from socket_server import broadcast_room_update

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

@router.post("/create")
async def create_room(problemId: str, hostUserId: str, current_user=Depends(get_current_user)):
    room = {
        "problemId": problemId,
        "hostId": hostUserId,
        "code": str(ObjectId())[:6].upper(),
        "players": [
            {"id": hostUserId, "name": current_user["email"], "score": 0}
        ],
        "started": False,
        "active": True,  # Room is open for joining
        "created_at": datetime.utcnow()
    }
    db.rooms.insert_one(room)

    room["_id"] = str(room["_id"])
    # Don't broadcast immediately - the creator hasn't joined the socket.io room yet
    # They will get the room state from the HTTP response
    return room

@router.get("/user/{userId}")
async def get_user_room(userId: str, current_user=Depends(get_current_user)):
    """Get the room that this user is currently in"""
    room = db.rooms.find_one({
        "players.id": userId,
        "active": True  # Only return active rooms
    })
    if not room:
        return None

    room["_id"] = str(room["_id"])
    if "created_at" in room:
        room["created_at"] = room["created_at"].isoformat()
    return room

@router.post("/join")
async def join_room(roomCode: str, userId: str, username: str, current_user=Depends(get_current_user)):
    room = db.rooms.find_one({"code": roomCode})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if not room.get("active", True):
        raise HTTPException(status_code=400, detail="Room is no longer active")

    # Add new player if not already present
    if not any(p["id"] == userId for p in room["players"]):
        room["players"].append({"id": userId, "name": username, "score": 0})
        db.rooms.update_one({"_id": room["_id"]}, {"$set": {"players": room["players"]}})

    room["_id"] = str(room["_id"])
    # Convert datetime to ISO string for JSON serialization
    if "created_at" in room:
        room["created_at"] = room["created_at"].isoformat()
    # Push update to all socket clients in this room
    await broadcast_room_update(room)
    return room

@router.post("/cancel")
async def cancel_room(roomCode: str, hostUserId: str, current_user=Depends(get_current_user)):
    """Host cancels/closes a room"""
    room = db.rooms.find_one({"code": roomCode})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room["hostId"] != hostUserId:
        raise HTTPException(status_code=403, detail="Only the host can cancel the room")

    # Mark room as inactive
    db.rooms.update_one({"_id": room["_id"]}, {"$set": {"active": False}})

    # Notify all players that room was canceled
    room["active"] = False
    room["_id"] = str(room["_id"])
    if "created_at" in room:
        room["created_at"] = room["created_at"].isoformat()
    await broadcast_room_update(room)
    return {"message": "Room canceled"}

@router.post("/leave")
async def leave_room(roomCode: str, userId: str, current_user=Depends(get_current_user)):
    """Player leaves a room"""
    room = db.rooms.find_one({"code": roomCode})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Remove player from room
    room["players"] = [p for p in room["players"] if p["id"] != userId]

    # If host left, cancel room
    if room["hostId"] == userId:
        db.rooms.update_one({"_id": room["_id"]}, {"$set": {"active": False, "players": room["players"]}})
        room["active"] = False
    else:
        db.rooms.update_one({"_id": room["_id"]}, {"$set": {"players": room["players"]}})

    room["_id"] = str(room["_id"])
    if "created_at" in room:
        room["created_at"] = room["created_at"].isoformat()
    await broadcast_room_update(room)
    return {"message": "Left room"}