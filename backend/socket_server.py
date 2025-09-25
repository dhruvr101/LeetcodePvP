import socketio

# Create Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    async_mode="asgi"
)

@sio.event
async def connect(sid, environ):
    print("🔌 Client connected:", sid)

@sio.event
async def disconnect(sid):
    print("❌ Client disconnected:", sid)

@sio.on("join_room")
async def handle_join_room(sid, data):
    """Client explicitly joins a socket.io room by code"""
    room_code = data.get("roomCode")
    if room_code:
        await sio.enter_room(sid, room_code)
        print(f"✅ {sid} joined room {room_code}")

        # Send the current room state to this client and all others in the room
        # This ensures everyone has the latest room state when someone joins
        from main import db
        room = db.rooms.find_one({"code": room_code})
        if room:
            room["_id"] = str(room["_id"])
            # Convert datetime to ISO string for JSON serialization
            if "created_at" in room:
                room["created_at"] = room["created_at"].isoformat()
            await broadcast_room_update(room)

async def broadcast_room_update(room: dict):
    """Send the latest room state to all clients in that room"""
    await sio.emit("room_update", room, to=room["code"])
