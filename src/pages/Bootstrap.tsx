import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ShieldCheck,
  User,
  Lock,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Server,
  Key,
} from "lucide-react";
import { api } from "../api/client";

export default function Bootstrap() {
  const [formData, setFormData] = useState({
    setupToken: "",
    username: "",
    fullName: "",
    password: "",
    confirmPassword: "",
  });

  const [passwordReqs, setPasswordReqs] = useState({
    length: false,
    upper: false,
    special: false,
    match: false,
  });

  const [setupError, setSetupError] = useState("");

  useEffect(() => {
    setPasswordReqs({
      length: formData.password.length >= 12,
      upper: /[A-Z]/.test(formData.password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
      match:
        formData.password === formData.confirmPassword &&
        formData.password.length > 0,
    });
  }, [formData.password, formData.confirmPassword]);

  const isFormValid =
    formData.setupToken.trim().length > 0 &&
    formData.username.length >= 3 &&
    formData.fullName.length >= 3 &&
    passwordReqs.length &&
    passwordReqs.upper &&
    passwordReqs.special &&
    passwordReqs.match;

  const setupMutation = useMutation({
    mutationFn: (payload: any) => api.post("/setup/bootstrap", payload),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");
    if (!isFormValid) return;

    const payload = {
      setup_token: formData.setupToken,
      username: formData.username,
      full_name: formData.fullName,
      password: formData.password,
    };

    setupMutation.mutate(payload, {
      onSuccess: (res) => {
        const data = res.data;
        const serverError = data?.error || data?.message;

        if (serverError) {
          setSetupError(
            "Nieprawidłowy token inicjalizacyjny lub dane wpisane w formularz.",
          );
          return;
        }

        window.location.href = "/login";
      },
      onError: () => {
        setSetupError("Nieprawidłowy token inicjalizacyjny.");
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a1d21] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <ShieldCheck className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          SecurityHub
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400 font-medium">
          Kreator pierwszej konfiguracji systemu
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#202428] py-8 px-4 shadow-xl border border-gray-100 dark:border-gray-800 sm:rounded-xl sm:px-10">
          {setupError && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                    {setupError}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Token Inicjalizacyjny
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.setupToken}
                  onChange={(e) =>
                    setFormData({ ...formData, setupToken: e.target.value })
                  }
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors font-mono"
                  placeholder="Wklej token z konsoli"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Konto Administratora
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Imię i Nazwisko (Wyświetlane)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="Jan Kowalski"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Główne Hasło
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Potwierdź Hasło
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-[#1a1d21] p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Server className="w-3.5 h-3.5" /> Wymagania bezpieczeństwa
              </h4>
              <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 ${passwordReqs.length ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`}
                  />
                  Minimum 12 znaków
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 ${passwordReqs.upper ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`}
                  />
                  Wielka litera
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 ${passwordReqs.special ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`}
                  />
                  Znak specjalny
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 ${passwordReqs.match ? "text-emerald-500" : "text-gray-300 dark:text-gray-600"}`}
                  />
                  Hasła są identyczne
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={!isFormValid || setupMutation.isPending}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {setupMutation.isPending
                ? "Inicjalizacja..."
                : "Zakończ konfigurację"}
              {!setupMutation.isPending && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
