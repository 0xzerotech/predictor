import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export const LoginPage = () => {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await login(email, password);
      navigate("/markets");
    } catch (err: any) {
      setFormError(err?.message ?? "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-white/10 bg-black/40 p-8 shadow-lg">
      <h1 className="text-2xl font-semibold text-white">Sign in</h1>
      <p className="text-sm text-white/60">Access your prediction account to trade and manage balances.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-white/70">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          />
        </label>
        <label className="block text-sm text-white/70">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          />
        </label>
        {formError || error ? <p className="text-sm text-red-400">{formError ?? error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-neon px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-white/60">
        Need an account? <Link to="/signup" className="text-neon hover:underline">Create one</Link>
      </p>
    </div>
  );
};

export default LoginPage;
