"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { loginUser } from "../lib/api.js";

const LoginPage = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await loginUser({ username, password });

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      router.push("/");
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f2f7ff] via-white to-[#e3edff] px-6 py-16">
      <div className="relative flex w-full max-w-5xl overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur">
        <div className="hidden w-1/2 flex-col justify-between bg-[#316fb7] p-10 text-white md:flex">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">Maintenance suite</p>
            <h1 className="mt-6 text-3xl font-semibold">Stay on schedule</h1>
            <p className="mt-4 text-sm text-white/80">
              Review dashboards, confirm updates, and keep every platform aligned without switching contexts.
            </p>
          </div>
          <div className="space-y-4 text-sm text-white/80">
            <div>
              <p className="text-white">Unified experience</p>
              <p className="text-white/70">All pages share the same modern look and theme color.</p>
            </div>
            <div>
              <p className="text-white">Secure access</p>
              <p className="text-white/70">Tokens and sessions handled automatically after each login.</p>
            </div>
          </div>
        </div>

        <div className="w-full p-10 md:w-1/2">
          <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-600">
            Enter your credentials to reach the maintenance workspace.
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-[#316fb7] focus:ring-2 focus:ring-[#316fb7]/30"
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-[#316fb7] focus:ring-2 focus:ring-[#316fb7]/30"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#316fb7] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#255593] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#316fb7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in…" : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
