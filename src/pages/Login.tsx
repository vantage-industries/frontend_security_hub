import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ShieldCheck,
  User,
  Lock,
  AlertTriangle,
  LogIn,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { api } from "../api/client";

export default function Login() {
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    totp_code: "",
  });
  const [loginError, setLoginError] = useState("");

  const loginMutation = useMutation({
    mutationFn: (payload: any) => api.post("/auth/login", payload),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const payload: any = {
      username: formData.username,
      password: formData.password,
    };
    if (step === "totp") {
      payload.totp_code = formData.totp_code;
    }

    loginMutation.mutate(payload, {
      onSuccess: (res) => {
        const data = res.data;
        const serverError = data?.error || data?.message;

        if (serverError) {
          const errStr = String(serverError).toLowerCase();
          if (errStr.includes("totp") || errStr.includes("2fa")) {
            setStep("totp");
          } else {
            setLoginError("Błędny login lub hasło.");
          }
          return;
        }

        const tokenToSave =
          data?.token || data?.access_token || "session_active";
        localStorage.setItem("csrf_token", tokenToSave);
        window.location.href = "/";
      },
      onError: () => {
        setLoginError("Błędny login lub hasło.");
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
          Zarządzanie bezpieczeństwem sieci
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-[#202428] py-8 px-4 shadow-xl border border-gray-100 dark:border-gray-800 sm:rounded-xl sm:px-10">
          {loginError && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                    {loginError}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {step === "credentials" ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Użytkownik
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
                      placeholder="Wprowadź login"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Hasło
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
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="mb-4 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Wprowadź kod z aplikacji (TOTP)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
                      setFormData({ ...formData, totp_code: "" });
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> Wróć
                  </button>
                </div>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={formData.totp_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totp_code: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a1d21] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest font-mono transition-colors"
                    placeholder="000000"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={
                loginMutation.isPending ||
                (step === "credentials"
                  ? !formData.username || !formData.password
                  : formData.totp_code.length !== 6)
              }
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loginMutation.isPending
                ? "Weryfikacja..."
                : step === "credentials"
                  ? "Zaloguj się"
                  : "Autoryzuj"}
              {!loginMutation.isPending &&
                (step === "credentials" ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                ))}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
