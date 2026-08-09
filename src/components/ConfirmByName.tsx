import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type Props = {
  title: string;
  expected: string;
  consequences: string[];
  confirmLabel: string;
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmByName({
  title,
  expected,
  consequences,
  confirmLabel,
  isPending = false,
  error = null,
  onConfirm,
  onClose,
}: Props) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === expected.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" /> {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <ul className="space-y-1.5 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {consequences.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div>
            <label
              htmlFor="confirm-by-name"
              className="mb-1.5 block text-xs text-gray-600 dark:text-gray-400"
            >
              Przepisz{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] font-bold text-gray-900 dark:bg-gray-800 dark:text-white">
                {expected}
              </code>
              , żeby potwierdzić.
            </label>
            <input
              id="confirm-by-name"
              autoFocus
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
          </div>

          {error && (
            <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches || isPending}
            className="rounded bg-red-600 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Wykonuję..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
