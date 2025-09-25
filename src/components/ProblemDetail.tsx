import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { useRoom } from "../context/RoomContext";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../context/UserContext";

interface Problem {
  title: string;
  description: string;
  difficulty: string;
  test_cases: { input: any; output: any }[];
}

const ProblemDetail = () => {
  const { title } = useParams<{ title: string }>();
  const decodedTitle = decodeURIComponent(title || "");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);

  const { room, setRoom } = useRoom();
  const socket = useSocket();
  const { user } = useUser();
  const token = localStorage.getItem("token");

  // Fetch problem from backend
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await axios.get(
          `http://127.0.0.1:8000/api/problems/title/${encodeURIComponent(
            decodedTitle
          )}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setProblem(res.data);
      } catch (err) {
        console.error("Error fetching problem:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [decodedTitle]);

  // Listen for live room updates
  useEffect(() => {
    if (!socket) return;
    socket.on("room_update", (updatedRoom) => {
      console.log("📡 Got room update:", updatedRoom);
      // If room became inactive, clear it from state
      if (!updatedRoom.active) {
        setRoom(null);
      } else {
        setRoom(updatedRoom);
      }
    });
    return () => {
      socket.off("room_update");
    };
  }, [socket]);

    // Join the socket.io room after creating or joining
  useEffect(() => {
    if (socket && room) {
      socket.emit("join_room", { roomCode: room.code });
      console.log("➡️ Joined socket.io room:", room.code);
    }
  }, [socket, room]);


  const handleCreateRoom = async () => {
    if (!user) {
      alert("Please log in first");
      return;
    }

    try {
      const res = await axios.post(
        `http://127.0.0.1:8000/api/rooms/create?problemId=${encodeURIComponent(decodedTitle)}&hostUserId=${user.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Only set initial room, updates will come via socket
      setRoom(res.data);
    } catch (err) {
      console.error("Error creating room:", err);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0B0B] text-gray-300">
        <p>Loading problem...</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0B0B] text-red-400">
        <p>Problem not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white flex relative">
      {/* Leaderboard - Fixed position corner overlay when game is active */}
      {room && room.started && (
        <div className="fixed top-4 right-4 w-64 bg-[#1A1A1A] border border-gray-600 rounded-lg p-4 shadow-xl z-50">
          <h2 className="text-lg font-semibold mb-3 text-white border-b border-gray-600 pb-2">
            🏆 Leaderboard
          </h2>
          <div className="space-y-2 mb-4">
            {room.players?.map((player: any, idx) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  player.completed
                    ? "bg-green-900/20 border border-green-600"
                    : "bg-gray-800 border border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono text-xs">#{idx + 1}</span>
                  <span className="text-white font-medium text-sm">
                    {player.name}
                    {room.hostId === player.id && (
                      <span className="ml-1 text-xs bg-blue-600 px-1 py-0.5 rounded">
                        HOST
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  {player.completed ? (
                    <span className="text-green-400 font-semibold text-xs">✓</span>
                  ) : (
                    <span className="text-yellow-400 font-semibold text-xs">⏳</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={async () => {
              if (!user || !room) return;
              try {
                await axios.post(
                  `http://127.0.0.1:8000/api/rooms/leave?roomCode=${room.code}&userId=${user.id}`,
                  {},
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                // Leave the socket room as well
                if (socket) {
                  socket.emit("leave_room", { roomCode: room.code });
                }
                setRoom(null);
              } catch (err) {
                console.error("Error leaving room:", err);
              }
            }}
            className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded text-white text-sm font-medium transition-colors"
          >
            Leave Room
          </button>
        </div>
      )}

      {/* Left: Problem description */}
      <div className="w-1/2 border-r border-gray-700 p-8 overflow-y-auto bg-[#252525]">
        <Link
          to="/problems"
          className="text-blue-400 hover:text-blue-300 mb-6 inline-block font-medium"
        >
          ← Back to Problems
        </Link>

        <h1 className="text-4xl font-extrabold mb-4 text-white">
          {problem.title}
        </h1>

        <span
          className={`px-3 py-1 rounded-md text-sm font-semibold tracking-wide ${
            problem.difficulty === "Easy"
              ? "bg-green-100/10 text-green-400 ring-1 ring-green-400"
              : problem.difficulty === "Medium"
              ? "bg-yellow-100/10 text-yellow-400 ring-1 ring-yellow-400"
              : "bg-red-100/10 text-red-400 ring-1 ring-red-400"
          }`}
        >
          {problem.difficulty}
        </span>

        <p className="text-gray-200 mt-6 text-base leading-relaxed whitespace-pre-line">
          {problem.description}
        </p>

        <h2 className="text-2xl font-semibold mt-10 mb-5 border-b border-gray-600 pb-2 text-white">
          Test Cases
        </h2>
        <ul className="space-y-4">
          {problem.test_cases.map((tc, idx) => (
            <li
              key={idx}
              className="p-4 bg-[#2D2D2D] rounded-lg border border-gray-600 shadow-md hover:border-blue-500 transition"
            >
              <p className="text-sm text-gray-200">
                <strong className="text-white">Input:</strong>{" "}
                <code className="bg-[#363636] px-2 py-0.5 rounded text-blue-400">
                  {JSON.stringify(tc.input)}
                </code>
              </p>
              <p className="text-sm text-gray-200 mt-2">
                <strong className="text-white">Output:</strong>{" "}
                <code className="bg-[#363636] px-2 py-0.5 rounded text-green-400">
                  {JSON.stringify(tc.output)}
                </code>
              </p>
            </li>
          ))}
        </ul>

        {/* Room Section - Only show if room exists and game hasn't started */}
        {!room?.started && (
          <div className="mt-8">
            {!room ? (
              <button
                onClick={handleCreateRoom}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-sm font-semibold text-white shadow-md transition"
              >
                Create Room for This Problem
              </button>
            ) : (
              <div className="p-4 bg-[#2A2A2A] rounded-lg border border-gray-600">
                <h3 className="text-xl font-semibold text-white mb-3">
                  Room: {room.code}
                </h3>

                {user && room.hostId === user.id ? (
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
                        onClick={async () => {
                          if (!user || !room) return;
                          try {
                            await axios.post(
                              `http://127.0.0.1:8000/api/rooms/start?roomCode=${room.code}&hostUserId=${user.id}`,
                              {},
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                          } catch (err) {
                            console.error("Error starting game:", err);
                            alert("Failed to start game. Please try again.");
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-medium transition-colors"
                      >
                        Start Game
                      </button>
                      <button
                        onClick={async () => {
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
                        }}
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
                      onClick={async () => {
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
                      }}
                      className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white font-medium transition-colors"
                    >
                      Leave Room
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Editor */}
      <div className="w-1/2 p-6 bg-[#1E1E1E]">
        <div className="bg-[#2D2D2D] border border-gray-600 rounded-lg h-full flex flex-col shadow-lg">
          <div className="p-4 border-b border-gray-600 flex justify-between items-center">
            <span className="font-semibold text-white">Code Editor</span>
            <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold text-white shadow-md transition">
              Run Code
            </button>
          </div>
          <textarea
            className="flex-grow bg-[#2D2D2D] text-gray-100 p-4 font-mono text-sm resize-none outline-none leading-relaxed"
            placeholder={`// Write your solution here...\nfunction solve() {\n  // your code\n}`}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetail;
