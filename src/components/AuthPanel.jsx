import { useState } from "react";
import { signUpWithProfile, signIn } from "../firebase/authHelpers";

export default function AuthPanel() {
  const [mode, setMode] = useState("signup"); // "signup" | "signin"
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (mode) => {
    setLoading(true);
    setMessage("");
    let result;
    if (mode === "signup") {
      result = await signUpWithProfile(name, surname, email, password);
    } else {
      result = await signIn(email, password);
    }
    const { user, error } = result;
    if (error) {
      setMessage(error.message || "Authentication failed");
    } else if (user) {
      if (mode === "signup") {
        setMessage(`Signed up as ${user.email}. Please sign in.`);
        setMode("signin");
        setEmail("");
        setPassword("");
        setName("");
        setSurname("");
      } else {
        setMessage(`Signed in as ${user.email}`);
      }
    }
    setLoading(false);
  };

  return (
    <div className="mt-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="text-base font-semibold text-gray-900 mb-3">
        {mode === "signup" ? "Create Account" : "Sign In"}
      </div>
      <div className="space-y-3">
        {mode === "signup" && (
          <>
            <input
              type="text"
              placeholder="Name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Surname"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
            />
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={() => handle(mode)}
            disabled={
              loading ||
              !email ||
              !password ||
              (mode === "signup" && (!name || !surname))
            }
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              loading ||
              !email ||
              !password ||
              (mode === "signup" && (!name || !surname))
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : mode === "signup"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-800 text-white hover:bg-gray-900"
            }`}
          >
            {mode === "signup" ? "Sign Up" : "Sign In"}
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("signin")}
                className="text-red-600 font-semibold hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don’t have an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="text-red-600 font-semibold hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </>
          )}
        </div>
        {message && (
          <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

