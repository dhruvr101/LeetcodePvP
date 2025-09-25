import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Problems from "./components/Problems";
import ProblemDetail from "./components/ProblemDetail";
import { RoomProvider } from "./context/RoomContext";
import { UserProvider } from "./context/UserContext";

function App() {
  return (
    <UserProvider>
      <RoomProvider>
        <Router>
          <div
            style={{
              minHeight: "100vh",
              background: "#000000",
              margin: 0,
              padding: 0,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              color: "#00ff88",
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/problems" element={<Problems />} />
              <Route path="/problems/:title" element={<ProblemDetail />} />
            </Routes>
          </div>
        </Router>
      </RoomProvider>
    </UserProvider>
  );
}

export default App;
