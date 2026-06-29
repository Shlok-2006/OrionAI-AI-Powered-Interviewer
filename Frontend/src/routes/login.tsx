import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — OrionAI" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const token = data.token ?? data.accessToken;
      const user = data.user ?? { email };
      if (!token) throw new Error("No token returned");
      login(token, user);
      toast.success("Welcome back!");
      if (user.profileComplete === false) {
        navigate({ to: "/complete-profile" });
      } else {
        navigate({ to: "/dashboard" });
      }
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong w-full max-w-md p-8 glow"
      >
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white/5 p-1 border border-white/10">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-lg font-semibold">Interview<span className="gradient-text">AI</span></span>
        </Link>
        <h1 className="text-center text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Sign in to continue practicing</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field icon={Mail} type="email" placeholder="Email" value={email} onChange={setEmail} required />
          <Field icon={Lock} type="password" placeholder="Password" value={password} onChange={setPassword} required />
          <button
            type="submit"
            disabled={loading}
            className="gradient-bg flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-white glow disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign in
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here? <Link to="/signup" className="gradient-text font-semibold">Create an account</Link>
        </p>
      </motion.div>
    </div>
  );
}

function Field({
  icon: Icon, type, placeholder, value, onChange, required,
}: {
  icon: React.ComponentType<{ className?: string }>;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <input
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}