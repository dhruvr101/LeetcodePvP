import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { setUser } = useUser();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/signup", {
        email,
        password,
      });
      setSuccess("Signup successful!");
      localStorage.setItem("token", res.data.access_token);

      // Extract user info from token and set user context
      try {
        const payload = JSON.parse(atob(res.data.access_token.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.sub
        });
      } catch (error) {
        console.error("Error decoding token:", error);
      }

      // redirect to problems page
      navigate("/problems");
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      setError(err.response?.data?.detail || "An error occurred");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#000000",
        padding: "20px",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
      }}
    >
      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        <h1
          style={{
            color: "#ffffff",
            fontSize: "32px",
            fontWeight: 700,
            marginBottom: "12px",
          }}
        >
          Create your account
        </h1>
        <p style={{ color: "#888888", fontSize: "16px" }}>
          Set up your account to get started
        </p>
      </div>

      <form onSubmit={handleSignup} style={{ width: "100%", maxWidth: "400px" }}>
        {/* Email */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "#ffffff", fontSize: "14px" }}>Email</label>
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "6px",
              border: "1px solid #333333",
              background: "#0D0D0D",
              color: "#ffffff",
              fontSize: "16px",
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "#ffffff", fontSize: "14px" }}>Password</label>
          <input
            type="password"
            placeholder="Choose a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "6px",
              border: "1px solid #333333",
              background: "#0D0D0D",
              color: "#ffffff",
              fontSize: "16px",
            }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            background: "#10A37F",
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Create account
        </button>

        {error && <p style={{ color: "#FF4444" }}>{error}</p>}
        {success && <p style={{ color: "#10A37F" }}>{success}</p>}

        {/* Link to login */}
        <p style={{ color: "#888888", fontSize: "14px", textAlign: "center" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#10A37F" }}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
