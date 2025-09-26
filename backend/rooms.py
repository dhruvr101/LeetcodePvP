from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
import random
import string
from database import db
from auth import get_current_user
from socket_server import broadcast_room_update

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

@router.post("/create")
async def create_room(problemId: str, hostUserId: str, current_user=Depends(get_current_user)):
    # Check if user is already in an active room and force them to leave
    existing_room = db.rooms.find_one({
        "players.id": hostUserId,
        "active": True
    })

    if existing_room:
        # Remove user from existing room
        existing_room["players"] = [p for p in existing_room["players"] if p["id"] != hostUserId]

        # If they were the host, cancel the room
        if existing_room["hostId"] == hostUserId:
            db.rooms.update_one({"_id": existing_room["_id"]}, {"$set": {"active": False, "players": existing_room["players"]}})
            existing_room["active"] = False
        else:
            db.rooms.update_one({"_id": existing_room["_id"]}, {"$set": {"players": existing_room["players"]}})

        # Broadcast the update to the old room
        existing_room["_id"] = str(existing_room["_id"])
        if "created_at" in existing_room:
            existing_room["created_at"] = existing_room["created_at"].isoformat()
        await broadcast_room_update(existing_room)

    # Generate truly random room code
    def generate_room_code():
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    # Ensure unique room code
    room_code = generate_room_code()
    while db.rooms.find_one({"code": room_code, "active": True}):
        room_code = generate_room_code()

    # Create new room
    room = {
        "problemId": problemId,
        "hostId": hostUserId,
        "code": room_code,
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
    print(f"🔍 Join room attempt: {roomCode} by {userId}")

    room = db.rooms.find_one({"code": roomCode})
    if not room:
        print(f"❌ Room {roomCode} not found")
        raise HTTPException(status_code=404, detail="Room not found")

    print(f"📊 Room found: active={room.get('active')}, started={room.get('started')}, players={len(room.get('players', []))}")

    if not room.get("active", True):
        print(f"❌ Room {roomCode} is not active")
        raise HTTPException(status_code=400, detail="Room is no longer active")

    if room.get("started", False):
        print(f"❌ Room {roomCode} already started")
        raise HTTPException(status_code=400, detail="Cannot join a room that has already started")

    # Check if user is already in a different active room and force them to leave
    existing_room = db.rooms.find_one({
        "players.id": userId,
        "active": True,
        "code": {"$ne": roomCode}  # Different room than the one they're trying to join
    })

    if existing_room:
        print(f"🔄 User {userId} leaving existing room {existing_room['code']} to join {roomCode}")
        # Remove user from existing room
        existing_room["players"] = [p for p in existing_room["players"] if p["id"] != userId]

        # Check if room is now empty and should be deactivated
        if len(existing_room["players"]) == 0:
            # No players left, deactivate room
            db.rooms.update_one({"_id": existing_room["_id"]}, {"$set": {"active": False, "players": existing_room["players"]}})
            existing_room["active"] = False
        elif existing_room["hostId"] == userId:
            # Host left but there are still players - transfer host to first remaining player
            new_host = existing_room["players"][0]
            db.rooms.update_one(
                {"_id": existing_room["_id"]},
                {"$set": {"hostId": new_host["id"], "players": existing_room["players"]}}
            )
            existing_room["hostId"] = new_host["id"]
        else:
            # Non-host leaving, just update players list
            db.rooms.update_one({"_id": existing_room["_id"]}, {"$set": {"players": existing_room["players"]}})

        # Broadcast the update to the old room
        existing_room["_id"] = str(existing_room["_id"])
        if "created_at" in existing_room:
            existing_room["created_at"] = existing_room["created_at"].isoformat()
        await broadcast_room_update(existing_room)

    # Add new player if not already present
    if not any(p["id"] == userId for p in room["players"]):
        print(f"✅ Adding {userId} to room {roomCode}")
        room["players"].append({"id": userId, "name": username, "score": 0})
        db.rooms.update_one({"_id": room["_id"]}, {"$set": {"players": room["players"]}})
    else:
        print(f"ℹ️ User {userId} already in room {roomCode}")

    room["_id"] = str(room["_id"])
    # Convert datetime to ISO string for JSON serialization
    if "created_at" in room:
        room["created_at"] = room["created_at"].isoformat()
    # Push update to all socket clients in this room
    await broadcast_room_update(room)
    print(f"✅ Successfully joined room {roomCode}")
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
    """Player leaves a room (works for both started and non-started rooms)"""
    room = db.rooms.find_one({"code": roomCode})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Remove player from room
    room["players"] = [p for p in room["players"] if p["id"] != userId]

    # Check if room is now empty and should be deactivated
    if len(room["players"]) == 0:
        # No players left, deactivate room
        db.rooms.update_one({"_id": room["_id"]}, {"$set": {"active": False, "players": room["players"]}})
        room["active"] = False
    elif room["hostId"] == userId:
        # Host left but there are still players - transfer host to first remaining player
        new_host = room["players"][0]
        db.rooms.update_one(
            {"_id": room["_id"]},
            {"$set": {"hostId": new_host["id"], "players": room["players"]}}
        )
        room["hostId"] = new_host["id"]
    else:
        # Non-host leaving, just update players list
        db.rooms.update_one({"_id": room["_id"]}, {"$set": {"players": room["players"]}})

    room["_id"] = str(room["_id"])
    if "created_at" in room:
        room["created_at"] = room["created_at"].isoformat()
    await broadcast_room_update(room)
    return {"message": "Left room"}

@router.post("/start")
async def start_game(roomCode: str, hostUserId: str, current_user=Depends(get_current_user)):
    """Host starts the game - redirects all players to problem screen"""
    room = db.rooms.find_one({"code": roomCode})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if room["hostId"] != hostUserId:
        raise HTTPException(status_code=403, detail="Only the host can start the game")

    # Mark room as started and add player completion status
    players_with_status = []
    for player in room["players"]:
        players_with_status.append({
            **player,
            "completed": False,
            "completedAt": None
        })

    db.rooms.update_one(
        {"_id": room["_id"]},
        {"$set": {"started": True, "players": players_with_status}}
    )

    # Get updated room
    room = db.rooms.find_one({"_id": room["_id"]})
    room["_id"] = str(room["_id"])
    if "created_at" in room:
        room["created_at"] = room["created_at"].isoformat()

    # Broadcast game start to all players
    await broadcast_room_update(room)
    return {"message": "Game started", "room": room}