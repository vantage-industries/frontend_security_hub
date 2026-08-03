import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import type { definitions } from "../api/types";

type LoginRequest = definitions["LoginRequest"];
type LoginResponse = definitions["LoginResponse"];

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await api.post<LoginResponse>(
        "/auth/login",
        credentials,
      );
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("csrf_token", data.csrf_token || "");
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      alert(error.response?.data?.error?.message || "Błąd logowania");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md w-full max-w-md border border-gray-100 dark:border-gray-800"
      >
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
          Logowanie
        </h2>
        <input
          type="text"
          placeholder="Nazwa użytkownika"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2.5 border rounded-lg mb-4 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          required
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2.5 border rounded-lg mb-6 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          required
        />
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          Zaloguj
        </button>
      </form>
    </div>
  );
}
