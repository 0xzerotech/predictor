import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export const SignupPage = () => {
  const { signup, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await signup(email, password);
      navigate("/markets");
    } catch (err: any) {
      setFormError(err?.message ?? "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-white/10 bg-black/40 p-8 shadow-lg">
      <h1 className="text-2xl font-semibold text-white">Create account</h1>
      <p className="text-sm text-white/60">Register to access the Web2 prediction market dashboard.</p>
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
        <label className="block text-sm text-white/70">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
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
          {submitting ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-white/60">
        Already have an account? <Link to="/login" className="text-neon hover:underline">Sign in</Link>
      </p>
    </div>
  );
};

export default SignupPage;
