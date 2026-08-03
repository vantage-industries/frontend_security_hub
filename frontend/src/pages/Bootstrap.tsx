import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import type { definitions } from "../api/types";

type BootstrapRequest = definitions["BootstrapRequest"];

export default function Bootstrap() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const bootstrapMutation = useMutation({
    mutationFn: async (data: BootstrapRequest) => {
      const response = await api.post("/setup/bootstrap", data);
      return response.data;
    },
    onSuccess: () => {
      window.location.href = "/login";
    },
    onError: (error: any) => {
      alert(error.response?.data?.error?.message || "Błąd rejestracji");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (password.length < 12) {
      setPasswordError("Hasło musi mieć co najmniej 12 znaków.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError("Hasło musi zawierać co najmniej jedną wielką literę.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError("Hasło musi zawierać co najmniej jedną cyfrę.");
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      setPasswordError("Hasło musi zawierać co najmniej jeden znak specjalny.");
      return;
    }

    bootstrapMutation.mutate({
      username,
      password,
      setup_token: setupToken,
      full_name: fullName,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md w-full max-w-md border border-gray-100 dark:border-gray-800"
      >
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
          Pierwsza konfiguracja
        </h2>
        <input
          type="text"
          placeholder="Setup Token (z wyświetlacza/konsoli)"
          value={setupToken}
          onChange={(e) => setSetupToken(e.target.value)}
          className="w-full p-2.5 border rounded-lg mb-4 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          required
        />
        <input
          type="text"
          placeholder="Nazwa użytkownika"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2.5 border rounded-lg mb-4 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          required
        />
        <input
          type="text"
          placeholder="Pełne imię i nazwisko (opcjonalnie)"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full p-2.5 border rounded-lg mb-4 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
        <div className="mb-6">
          <input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            className={`w-full p-2.5 border rounded-lg dark:bg-gray-800 dark:text-white transition-colors ${
              passwordError
                ? "border-red-500 dark:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                : "dark:border-gray-700"
            }`}
            required
          />
          {passwordError && (
            <p className="text-red-500 text-sm mt-1.5">{passwordError}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={bootstrapMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          Utwórz konto
        </button>
      </form>
    </div>
  );
}
