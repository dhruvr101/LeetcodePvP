import { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // Extract user info from JWT token
  const extractUserFromToken = (token: string): User | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub, // 'sub' is the standard JWT claim for user ID
        email: payload.sub // Using email as both ID and display name for now
      };
    } catch (error) {
      console.error("Error decoding token:", error);
      return null;
    }
  };

  // Load user from token on app start
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const userData = extractUserFromToken(token);
      setUser(userData);
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);