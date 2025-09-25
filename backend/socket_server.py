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
    # Note: Room cleanup is handled by the HTTP leave endpoint
    # Socket disconnection doesn't automatically remove from rooms

@sio.on("join_room")
async def handle_join_room(sid, data):
    """Client explicitly joins a socket.io room by code"""
    room_code = data.get("roomCode")
    if room_code:
        await sio.enter_room(sid, room_code)
        print(f"✅ {sid} joined room {room_code}")

        # Only send current room state to the specific client that just joined
        # Don't broadcast to everyone unless there was an actual room change
        from main import db
        room = db.rooms.find_one({"code": room_code})
        if room:
            print(f"📡 Sending room state to new client for {room_code}: {room.get('players', [])}")
            room["_id"] = str(room["_id"])
            # Convert datetime to ISO string for JSON serialization
            if "created_at" in room:
                room["created_at"] = room["created_at"].isoformat()
            # Send only to the client that just joined, not to everyone
            await sio.emit("room_update", room, to=sid)
        else:
            print(f"❌ Room {room_code} not found in database")

@sio.on("leave_room")
async def handle_leave_room(sid, data):
    """Client explicitly leaves a socket.io room by code"""
    room_code = data.get("roomCode")
    if room_code:
        await sio.leave_room(sid, room_code)
        print(f"❌ {sid} left room {room_code}")

async def broadcast_room_update(room: dict):
    """Send the latest room state to all clients in that room"""
    await sio.emit("room_update", room, to=room["code"])
