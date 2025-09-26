import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useRoom } from "../context/RoomContext";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../context/UserContext";
import Editor from "@monaco-editor/react";

interface Problem {
  title: string;
  description: string;
  difficulty: string;
  test_cases: { input: any; output: any }[];
  function_template?: string;
}

const ProblemDetail = () => {
  const { title } = useParams<{ title: string }>();
  const decodedTitle = decodeURIComponent(title || "");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [runResult, setRunResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [gameEndProcessed, setGameEndProcessed] = useState(false);

  const { room, setRoom } = useRoom();
  const socket = useSocket();
  const { user } = useUser();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

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
        setCode(res.data.function_template || "");
      } catch (err) {
        console.error("Error fetching problem:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [decodedTitle]);

  useEffect(() => {
    if (!socket) return;
    socket.on("room_update", (updatedRoom) => {
      console.log("🔄 Room update received:", updatedRoom);
      console.log("🔄 Room players completion status:", updatedRoom.players?.map(p => ({ name: p.name, completed: p.completed })));

      if (!updatedRoom.active) {
        setRoom(null);
        setGameEndProcessed(false); // Reset when room becomes inactive
      } else {
        // Check if everyone has completed the game
        if (updatedRoom.started && updatedRoom.players && updatedRoom.players.length > 0) {
          const allCompleted = updatedRoom.players.every((p: any) => p.completed);
          console.log("🏁 All completed?", allCompleted, "Game end processed?", gameEndProcessed, "Show modal?", showGameEndModal);
          console.log("🏁 Room gameCompleted flag?", updatedRoom.gameCompleted);

          // Only show animation if:
          // 1. All players completed
          // 2. Game completion animation hasn't been processed yet
          // 3. Room doesn't have gameCompleted flag (meaning this is the first time everyone completed)
          if (allCompleted && !showGameEndModal && !gameEndProcessed && !updatedRoom.gameCompleted) {
            console.log("🎉 Showing game completion animation");
            // Show game end animation
            setShowGameEndModal(true);
            setCountdown(5);
            setGameEndProcessed(true); // Prevent showing again
          }
        }
        // Force a new object to trigger React re-render
        setRoom({...updatedRoom});
      }
    });
    return () => {
      socket.off("room_update");
    };
  }, [socket, showGameEndModal, gameEndProcessed, navigate]);

  useEffect(() => {
    if (socket && room) {
      socket.emit("join_room", { roomCode: room.code });
    }
  }, [socket, room]);

  // Countdown timer for game end modal
  useEffect(() => {
    if (showGameEndModal && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showGameEndModal && countdown === 0) {
      // Clear all states and navigate
      setShowGameEndModal(false);
      setGameEndProcessed(false);
      setRoom(null);
      navigate("/problems");
    }
  }, [showGameEndModal, countdown, navigate]);

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
      setRoom(res.data);
    } catch (err) {
      console.error("Error creating room:", err);
    }
  };

  const handleRunCode = async (isSubmit: boolean = false) => {
    if (!problem || !user) return;

    setIsRunning(true);
    setRunResult(null);

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/code/run",
        {
          code,
          problem_title: problem.title,
          user_id: user.id,
          room_code: room?.code,
          is_submit: isSubmit
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRunResult(res.data);

      if (isSubmit && res.data.all_passed && room) {
        setShowCompletionBanner(true);
        setTimeout(() => setShowCompletionBanner(false), 5000);
      }
    } catch (err) {
      console.error("Error running code:", err);
      setRunResult({ error: "Failed to run code" });
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-gray-300">
        <p>Loading problem...</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-red-400">
        <p>Problem not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex relative">
      {/* Completion Banner */}
      {showCompletionBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white p-4 text-center font-bold text-xl animate-pulse">
          🎉 Congratulations! You completed the problem! 🎉
        </div>
      )}

      {/* Live Leaderboard */}
      {room && room.started && (
        <div className="fixed bottom-8 right-20 w-80 max-h-80 overflow-y-auto bg-[#1A1A1A] border border-gray-600 rounded-lg p-4 shadow-xl z-40">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-600">
            <h2 className="text-lg font-semibold text-white">
              🏆 Live Leaderboard
            </h2>
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
                  navigate("/problems");
                } catch (err) {
                  console.error("Error leaving room:", err);
                }
              }}
              className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs text-white transition-colors"
            >
              Leave
            </button>
          </div>
          <div className="space-y-2 mb-4" key={`leaderboard-${JSON.stringify(room.players?.map(p => ({id: p.id, completed: p.completed})))}`}>
            {room.players?.sort((a: any, b: any) => {
              // Sort by completion status first, then by completion time
              if (a.completed && !b.completed) return -1;
              if (!a.completed && b.completed) return 1;
              if (a.completed && b.completed) {
                return new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime();
              }
              return 0;
            }).map((player: any, idx: number) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                  player.completed
                    ? "bg-green-900/20 border border-green-600"
                    : "bg-gray-800 border border-gray-600"
                } ${player.id === user?.id ? "ring-2 ring-blue-500" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono w-6 h-6 rounded-full flex items-center justify-center ${
                    player.completed ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"
                  }`}>
                    {player.completed ? (idx + 1) : "•"}
                  </span>
                  <div>
                    <span className="text-white font-medium text-sm">
                      {player.name}
                      {player.id === user?.id && <span className="ml-1 text-xs text-blue-400">(You)</span>}
                    </span>
                    {room.hostId === player.id && (
                      <span className="ml-1 text-xs bg-blue-600 px-1 py-0.5 rounded">
                        HOST
                      </span>
                    )}
                    {player.completed && player.completedAt && (
                      <div className="text-xs text-gray-400">
                        Completed {new Date(player.completedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  {player.completed ? (
                    <div className="flex items-center gap-1">
                      <span className="text-green-400 font-semibold text-lg">✓</span>
                      <span className="text-xs text-green-400">100/100</span>
                    </div>
                  ) : (
                    <span className="text-yellow-400 font-semibold text-xs">⏳</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Competition Stats */}
          <div className="pt-2 border-t border-gray-600">
            <div className="text-xs text-gray-400 mb-1">
              Completed: {room.players?.filter((p: any) => p.completed).length || 0} / {room.players?.length || 0}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${room.players?.length > 0 ? (room.players.filter((p: any) => p.completed).length / room.players.length) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Game Completion Modal */}
      {showGameEndModal && room && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-8 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 border border-purple-500/30">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4 animate-bounce">🏆</div>
              <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Game Complete!
              </h1>
              <p className="text-gray-300 text-lg">Final Rankings</p>
            </div>

            {/* Final Leaderboard */}
            <div className="space-y-4 mb-8">
              {room.players?.sort((a: any, b: any) => {
                if (a.completed && !b.completed) return -1;
                if (!a.completed && b.completed) return 1;
                if (a.completed && b.completed) {
                  return new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime();
                }
                return 0;
              }).map((player: any, idx: number) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-500 transform hover:scale-105 ${
                    idx === 0
                      ? "bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-yellow-500 shadow-lg shadow-yellow-500/20"
                      : idx === 1
                      ? "bg-gradient-to-r from-gray-500/20 to-gray-600/20 border-gray-400 shadow-lg shadow-gray-400/20"
                      : idx === 2
                      ? "bg-gradient-to-r from-amber-700/20 to-amber-800/20 border-amber-600 shadow-lg shadow-amber-600/20"
                      : "bg-gradient-to-r from-gray-800/20 to-gray-900/20 border-gray-600"
                  } ${player.id === user?.id ? "ring-2 ring-blue-500" : ""}`}
                  style={{
                    animationDelay: `${idx * 200}ms`
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold flex items-center justify-center w-12 h-12 rounded-full ${
                      idx === 0 ? "bg-yellow-500 text-black"
                      : idx === 1 ? "bg-gray-400 text-black"
                      : idx === 2 ? "bg-amber-600 text-black"
                      : "bg-gray-700 text-white"
                    }`}>
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg">
                        {player.name}
                        {player.id === user?.id && <span className="ml-2 text-sm text-blue-400">(You)</span>}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {player.completed ? (
                          <span className="text-green-400">
                            ✓ Completed at {new Date(player.completedAt).toLocaleTimeString()}
                          </span>
                        ) : (
                          <span className="text-yellow-400">Did not complete</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {player.completed && (
                    <div className="text-green-400 font-bold text-xl">100/100</div>
                  )}
                </div>
              ))}
            </div>

            {/* Confetti Animation */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    fontSize: `${12 + Math.random() * 8}px`
                  }}
                >
                  {['🎉', '🎊', '⭐', '✨', '🏆'][Math.floor(Math.random() * 5)]}
                </div>
              ))}
            </div>

            {/* Auto-redirect countdown */}
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                Redirecting to problems in <span className="text-white font-bold">{countdown}</span> seconds...
              </p>
              <button
                onClick={() => {
                  setShowGameEndModal(false);
                  setGameEndProcessed(false);
                  setRoom(null);
                  navigate("/problems");
                }}
                className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg text-white font-semibold transition-colors"
              >
                Go to Problems Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left: Problem Description */}
      <div className="w-1/2 border-r border-gray-700 p-8 overflow-y-auto bg-[#1A1A1A]">
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
          {problem.test_cases && problem.test_cases.slice(0, 3).map((tc, idx) => (
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

        {/* Room Controls */}
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
                          navigate("/problems");
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

      {/* Right: Code Editor */}
      <div className="w-1/2 p-6 bg-[#0A0A0A] flex flex-col">
        <div className="bg-[#2D2D2D] border border-gray-600 rounded-lg flex-grow flex flex-col shadow-lg">
          <div className="p-4 border-b border-gray-600 flex justify-between items-center">
            <span className="font-semibold text-white">Code Editor</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleRunCode(false)}
                disabled={isRunning}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-4 py-2 rounded text-sm font-semibold text-white shadow-md transition"
              >
                {isRunning ? "Running..." : "Run Code"}
              </button>
              <button
                onClick={() => handleRunCode(true)}
                disabled={isRunning}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-4 py-2 rounded text-sm font-semibold text-white shadow-md transition"
              >
                {isRunning ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
          <div className="flex-grow">
            <Editor
              height="60%"
              defaultLanguage="python"
              value={code}
              onChange={(value) => setCode(value || "")}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },  // Disable minimap
                scrollBeyondLastLine: false,
                automaticLayout: true,
                lineNumbers: "off",
                statusBar: false,  // Hide status bar
              }}
            />
          </div>
          {/* Results Section */}
          {runResult && (
            <div className="p-4 border-t border-gray-600 bg-[#1A1A1A] max-h-48 overflow-y-auto">
              {runResult.error ? (
                <div className="text-red-400">
                  <p className="font-semibold">Error:</p>
                  <p className="font-mono text-sm">{runResult.error}</p>
                </div>
              ) : runResult.passed === false ? (
                <div className="text-red-400">
                  <p className="font-semibold">
                    Failed at test case {runResult.failed_at} ({runResult.passed_tests}/{runResult.total_tests} passed)
                  </p>
                  <div className="mt-2 font-mono text-xs">
                    <div className="mb-2 p-2 rounded bg-red-900/20">
                      <p>Test {runResult.failed_at}: ❌ FAIL</p>
                      <p>Input: {JSON.stringify(runResult.input)}</p>
                      <p>Expected: {JSON.stringify(runResult.expected)}</p>
                      <p>Got: {JSON.stringify(runResult.output)}</p>
                      {runResult.error && <p>Error: {runResult.error}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-green-400">
                  <p className="font-semibold">
                    All tests passed! ({runResult.passed_tests}/{runResult.total_tests})
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemDetail;
