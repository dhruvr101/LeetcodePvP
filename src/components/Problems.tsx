import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useRoom } from "../context/RoomContext";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../context/UserContext";

interface Problem {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  status?: "solved" | "attempted" | "none";
}

type Sort = "" | "asc" | "des";
interface SortOptions {
  title: Sort;
  difficulty: Sort;
}

function kebabToSpacedPascal(str: string): string {
  if (!str) return "";
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const Problems = () => {
  const [data, setData] = useState<Problem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { room, setRoom } = useRoom();
  const socket = useSocket();
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/problems", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        console.error("Error fetching problems:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, []);

  // Fetch existing room on page load
  useEffect(() => {
    const fetchExistingRoom = async () => {
      if (!user || !token) {
        console.log("⏳ Skipping room fetch - user or token not ready:", { user: !!user, token: !!token });
        return;
      }

      console.log("🔍 Fetching existing room for user:", user.id);
      try {
        const res = await axios.get(
          `http://127.0.0.1:8000/api/rooms/user/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log("📦 Room fetch result:", res.data);
        if (res.data) {
          setRoom(res.data);
          console.log("✅ Room set:", res.data.code);
        } else {
          console.log("❌ No active room found");
        }
      } catch (err) {
        console.error("Error fetching existing room:", err);
      }
    };
    fetchExistingRoom();
  }, [user, token]);

  // Listen for room updates
  useEffect(() => {
    if (!socket) return;
    socket.on("room_update", (updatedRoom) => {
      console.log("📡 Room update received:", updatedRoom);
      console.log("📊 Current room state:", room);
      console.log("📊 User in updated room?", user ? updatedRoom.players?.some(p => p.id === user.id) : 'no user');

      // If room became inactive, clear it from state
      if (!updatedRoom.active) {
        console.log("🚫 Clearing room - became inactive");
        setRoom(null);
      } else if (user && !updatedRoom.players?.some(p => p.id === user.id)) {
        console.log("🚫 Clearing room - user not in player list");
        setRoom(null);
      } else {
        console.log("🔄 Updating room state");
        setRoom(updatedRoom);
        // If game started, redirect to problem detail page
        if (updatedRoom.started && updatedRoom.problemId) {
          console.log("🎮 Redirecting to problem page");
          navigate(`/problems/${encodeURIComponent(updatedRoom.problemId)}`);
        }
      }
    });
    return () => {
      socket.off("room_update");
    };
  }, [socket, navigate, room, user]);

  // Join socket room when room state changes
  useEffect(() => {
    if (socket && room) {
      console.log("➡️ Attempting to join socket.io room:", room.code);
      socket.emit("join_room", { roomCode: room.code });
      console.log("✅ Joined socket.io room:", room.code);
    }
  }, [socket, room]);

  const handleJoinRoom = async () => {
    if (!user) {
      alert("Please log in first");
      return;
    }

    try {
      const code = prompt("Enter Room Code");
      if (!code) return;
      const res = await axios.post(
        `http://127.0.0.1:8000/api/rooms/join?roomCode=${code}&userId=${user.id}&username=${user.email}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoom(res.data);
    } catch (err) {
      console.error("Error joining room:", err);
      alert("Failed to join room. Please check the room code.");
    }
  };

  const handleLeaveRoom = async () => {
    if (!user || !room) return;

    try {
      await axios.post(
        `http://127.0.0.1:8000/api/rooms/leave?roomCode=${room.code}&userId=${user.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoom(null);
    } catch (err) {
      console.error("Error leaving room:", err);
    }
  };

  const handleCancelRoom = async () => {
    if (!user || !room) return;

    try {
      await axios.post(
        `http://127.0.0.1:8000/api/rooms/cancel?roomCode=${room.code}&hostUserId=${user.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoom(null);
    } catch (err) {
      console.error("Error canceling room:", err);
    }
  };

  const handleStartRoom = async () => {
    if (!user || !room) return;

    try {
      await axios.post(
        `http://127.0.0.1:8000/api/rooms/start?roomCode=${room.code}&hostUserId=${user.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Navigation will happen via room_update socket event
    } catch (err) {
      console.error("Error starting game:", err);
      alert("Failed to start game. Please try again.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isHost = room && user && room.hostId === user.id;

  const filteredData = data.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0B0B0B] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#1E1E1E] text-gray-100 px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Header with Profile */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Problem Set</h1>

          <div className="flex items-center gap-4">
            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-gray-300">
                  Welcome, <span className="text-white font-medium">{user.email}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white text-sm transition-colors"
                >
                  Logout
                </button>
              </div>
            )}

            {/* Global Join Room Button */}
            {!room && (
              <button
                onClick={handleJoinRoom}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-medium transition-colors"
              >
                Join Room
              </button>
            )}
          </div>
        </div>

        {/* Room Status Section */}
        {room && (
          <div className="mb-6 p-4 bg-[#2A2A2A] rounded-lg border border-gray-600">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Room: {room.code}
                </h2>

                {isHost ? (
                  <div>
                    <p className="text-gray-300 mb-3">Players in room:</p>
                    <ul className="mb-4 space-y-1">
                      {room.players.map((player) => (
                        <li key={player.id} className="text-gray-200">
                          • {player.name} {player.id === room.hostId && "(Host)"}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2">
                      <button
                        onClick={handleStartRoom}
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-medium transition-colors"
                      >
                        Start Game
                      </button>
                      <button
                        onClick={handleCancelRoom}
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white font-medium transition-colors"
                      >
                        Cancel Room
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-300 mb-2">
                      Waiting for host to start... ({room.players.length} players)
                    </p>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-orange-400">Ready to play</span>
                    </div>
                    <button
                      onClick={handleLeaveRoom}
                      className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white font-medium transition-colors"
                    >
                      Leave Room
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-[#141414] border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {filteredData.length > 0 ? (
          filteredData.map((main, idx) => (
            <div
              key={main._id}
              className="h-[40px] w-full text-[14px] mb-3 rounded-md border border-transparent hover:bg-[#2A2A2A] hover:border-gray-600 transition duration-200"
            >
              <Link
                to={`/problems/${encodeURIComponent(main.title)}`}
                className="w-full h-[40px] flex flex-row whitespace-nowrap"
              >
                <div className="flex-grow ml-[20px]">
                  {idx + 1}. {kebabToSpacedPascal(main.title)}
                </div>

                <div
                  className={`w-[100px] text-center ${
                    main.difficulty === "Easy"
                      ? "text-green-500"
                      : main.difficulty === "Medium"
                      ? "text-orange-500"
                      : "text-red-500"
                  }`}
                >
                  {main.difficulty}
                </div>
              </Link>
            </div>
          ))
        ) : (
          <div className="text-[14px] ml-[30px] text-red-600 h-[40px] leading-[40px]">
            Problem not found
          </div>
        )}
      </div>
    </div>
  );
};

export default Problems;
