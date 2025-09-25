import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUser();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/signup", {
        email,
        password,
      });
      setSuccess("Account created successfully!");
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

      // Navigate with a slight delay for smooth UX
      setTimeout(() => navigate("/problems"), 1000);
    } catch (err: any) {
      console.error(err.response?.data || err.message);
      setError(err.response?.data?.detail || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-black/80">
        <div className="w-full max-w-md animate-in slide-in-from-right duration-700">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Create account</h2>
            <p className="text-gray-400">Start your coding journey on PeetCode</p>
            <p className="text-sm text-gray-500">"Leetcode PvP" — Create a room, have your friends join, and compete to solve a problem</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300 backdrop-blur-sm"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300 backdrop-blur-sm"
              />
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm animate-in slide-in-from-top">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm animate-in slide-in-from-top">
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Creating account...</span>
                </div>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-300 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Terminal-like background with floating code */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-black to-gray-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-transparent"></div>
        </div>

        <div className="absolute inset-0 overflow-hidden">
          {[
            "$ git clone https://github.com/user/algorithm.git",
            "$ cd algorithm && npm install",
            "$ npm run test",
            "✓ All tests passed (42/42)",
            "$ git add .",
            "$ git commit -m 'implement binary search'",
            "$ git push origin main",
            "$ leetcode submit solution.js",
            "✓ Accepted - Runtime: 68ms",
            "✓ Beats 95% of submissions",
            "$ python3 dp_solution.py",
            "Test case 1: ✓ PASSED",
            "Test case 2: ✓ PASSED",
            "$ npm run benchmark",
            "Performance: O(log n)"
          ].map((command, index) => (
            <div
              key={index}
              className="absolute font-mono text-sm whitespace-nowrap animate-terminal-float"
              style={{
                left: `${Math.random() * 70}%`,
                top: `${(index * 45) % 100}%`,
                animationDelay: `${index * 0.8}s`,
                animationDuration: `${10 + Math.random() * 5}s`,
                color: command.includes('✓') ? '#10b981' : 
                       command.includes('$') ? '#f44336' : '#8bc34a',
                opacity: 0.6
              }}
            >
              {command}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30"></div>
      </div>
    </div>
  );
}
