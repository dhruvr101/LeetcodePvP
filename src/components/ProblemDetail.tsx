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
      setRoom(updatedRoom);
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
    <div className="min-h-screen bg-[#1E1E1E] text-white flex">
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

        {/* Create Room button */}
        <div className="mt-8">
          {!room && (
            <button
              onClick={handleCreateRoom}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-sm font-semibold text-white shadow-md transition"
            >
              Create Room for This Problem
            </button>
          )}
        </div>
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
