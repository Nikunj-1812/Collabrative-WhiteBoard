"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/utils/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail })
      });

      if (response.resetToken) {
        setResetToken(response.resetToken);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset request";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyToken = () => {
    if (resetToken) {
      navigator.clipboard.writeText(resetToken);
      alert("Token copied to clipboard!");
    }
  };

  const handleGoToReset = () => {
    if (resetToken) {
      router.push(`/reset-password?token=${resetToken}`);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-8 text-text sm:py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-bold">Forgot Password</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your email address and we'll generate a reset token for you.
        </p>

        {!resetToken ? (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-muted" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
              placeholder="you@example.com"
              autoFocus
              disabled={isSubmitting}
              autoComplete="email"
            />

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
            >
              {isSubmitting ? "Sending..." : "Send Reset Token"}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-green-500 bg-green-50 p-4 dark:bg-green-900/20">
              <h3 className="font-semibold text-green-800 dark:text-green-400">Reset Token Generated!</h3>
              <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                Copy the token below and use it to reset your password:
              </p>
              <div className="mt-3 rounded bg-white dark:bg-gray-800 p-3 font-mono text-xs break-all border border-gray-300 dark:border-gray-600">
                {resetToken}
              </div>
              <button
                onClick={handleCopyToken}
                className="mt-3 w-full rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30"
              >
                Copy Token
              </button>
            </div>

            <button
              onClick={handleGoToReset}
              className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-blue-600 hover:to-blue-700"
            >
              Continue to Reset Password
            </button>

            <p className="text-xs text-muted text-center">
              Token expires in 1 hour
            </p>
          </div>
        )}

        <p className="mt-6 text-sm text-muted text-center">
          Remember your password?{" "}
          <a className="font-semibold text-blue-600 hover:text-blue-700" href="/login">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
