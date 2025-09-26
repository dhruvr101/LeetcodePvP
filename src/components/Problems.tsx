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

  useEffect(() => {
    const fetchExistingRoom = async () => {
      if (!user || !token) {
        console.log("⏳ Skipping room fetch - user or token not ready:", { user: !!user, token: !!token });
        return;
      }

      try {
        const res = await axios.get(
          `http://127.0.0.1:8000/api/rooms/user/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data) {
          setRoom(res.data);
        } else {
          console.log("❌ No active room found");
        }
      } catch (err) {
        console.error("Error fetching existing room:", err);
      }
    };
    fetchExistingRoom();
  }, [user, token]);

  useEffect(() => {
    if (!socket) return;
    socket.on("room_update", (updatedRoom) => {
      if (!updatedRoom.active) {
        setRoom(null);
      } else {
        setRoom(updatedRoom);
        if (updatedRoom.started && updatedRoom.problemId) {
          navigate(`/problems/${encodeURIComponent(updatedRoom.problemId)}`);
        }
      }
    });
    return () => {
      socket.off("room_update");
    };
  }, [socket, navigate, room, user]);

  useEffect(() => {
    if (socket && room) {
      socket.emit("join_room", { roomCode: room.code });
    }
  }, [socket, room]);

  const handleJoinRoom = async () => {
    if (!user) {
      alert("Please log in first");
      return;
    }

    const code = prompt("Enter Room Code");
    if (!code) return;
    try {
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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
    <div className="w-full min-h-screen bg-[#0A0A0A] text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        {/* Header with Profile and Settings Icon */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold">PeetCode</h1>
          
          <div className="flex items-center gap-4">
            {/* Settings Icon */}
            <div className="relative group">
              <button
                className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-all"
                onClick={() => {}}
              >
                ⚙️
              </button>
              <div className="absolute top-0 right-0 mt-10 bg-gray-800 text-white text-sm rounded-md shadow-lg p-3 w-48 opacity-0 group-hover:opacity-100 transition-all">
                <div className="flex justify-between items-center">
                  <span>{user?.email}</span>
                </div>
                <button onClick={handleLogout} className="text-red-600 mt-2 w-full text-center">Logout</button>
              </div>
            </div>

            {/* Join Room Button */}
            {!room && (
              <button
                onClick={handleJoinRoom}
                className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white py-3 px-6 rounded-full hover:bg-gradient-to-l transition-all duration-300"
              >
                Join Room
              </button>
            )}
          </div>
        </div>

        {/* Room Status */}
        {room && (
          <div className="mb-6 p-4 bg-[#2A2A2A] border border-gray-600 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-white">
                🏠 Room: {room.code}
              </h2>
              <button
                onClick={handleLeaveRoom}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm text-white transition-colors"
              >
                Leave Room
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Players List */}
              <div>
                <p className="text-gray-300 text-sm mb-2">Players ({room.players?.length || 0}):</p>
                <ul className="space-y-1">
                  {room.players?.map((player: any) => (
                    <li key={player.id} className="flex items-center gap-2 text-sm">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      <span className="text-gray-200">
                        {player.name}
                        {room.hostId === player.id && (
                          <span className="ml-1 text-xs bg-blue-600 px-1 py-0.5 rounded">HOST</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Room Status */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {room.started ? (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-400 text-sm font-medium">Game Started</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-orange-400 text-sm font-medium">
                        {user && room.hostId === user.id
                          ? "You can start the game"
                          : "Waiting for host to start"}
                      </span>
                    </div>
                  )}
                </div>

                {room.problemId && (
                  <p className="text-gray-400 text-xs">
                    Problem: <span className="text-blue-400">{decodeURIComponent(room.problemId)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search problems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-[#333] border border-[#444] rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Problem List */}
        <div className="space-y-4">
          {filteredData.length > 0 ? (
            filteredData.map((problem, idx) => (
              <div
                key={problem._id}
                className="flex justify-between items-center bg-[#0A0A0A] p-4 rounded-lg hover:bg-[#222] border-b border-[#333] transition-all duration-200"
              >
                <Link
                  to={`/problems/${encodeURIComponent(problem.title)}`}
                  className="text-white text-md font-medium"
                >
                  {idx + 1}. {problem.title}
                </Link>
                <div
                  className={`text-sm text-center ${
                    problem.difficulty === "Easy"
                      ? "text-green-400"
                      : problem.difficulty === "Medium"
                      ? "text-orange-400"
                      : "text-red-400"
                  }`}
                >
                  {problem.difficulty}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-white">No problems found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Problems;
