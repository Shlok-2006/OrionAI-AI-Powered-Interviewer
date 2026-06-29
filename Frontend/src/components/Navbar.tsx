import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, X, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleLogout = () => {
    navigate({ to: "/" }).then(() => {
      logout();
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="mx-auto mt-3 max-w-7xl px-4">
        <div className="glass-strong flex items-center justify-between gap-4 px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white/5 p-1 border border-white/10 glow">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Orion<span className="gradient-text">AI</span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {[
              { label: "Features", href: "/#features" },
              { label: "How it works", href: "/#how" },
              ...(isAuthenticated
                ? [
                  { label: "Dashboard", to: "/dashboard" },
                  { label: "Interview", to: "/interview-types" },
                  { label: "Analysis", to: "/analysis" },
                  { label: "History", to: "/history" },
                ]
                : []),
            ].map((item, idx) => {
              const LinkComponent = item.to ? Link : "a";
              const linkProps = item.to
                ? { to: item.to, activeProps: { className: "text-foreground font-medium" } }
                : { href: item.href };

              return (
                <LinkComponent
                  key={idx}
                  {...(linkProps as any)}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  className="relative py-1.5 transition-colors duration-200 hover:text-foreground"
                >
                  {item.label}
                  {hoveredIndex === idx && (
                    <motion.div
                      layoutId="navbar-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </LinkComponent>
              );
            })}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            {/* Theme Toggle Button (Desktop) */}
            <button
              onClick={toggleTheme}
              className="glass p-2.5 rounded-xl hover:bg-white/10 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Toggle theme"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  to="/complete-profile"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-xs font-semibold text-primary cursor-pointer"
                  title="View Profile"
                >
                  {getInitials(user?.fullName)}
                </Link>
                <button
                  onClick={handleLogout}
                  className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-xl px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Login
                </Link>
                <Link to="/signup" className="gradient-bg rounded-xl px-4 py-2 text-sm font-medium text-white glow">
                  Get started
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {/* Theme Toggle Button (Mobile) */}
            <button
              onClick={toggleTheme}
              className="glass p-2 rounded-lg hover:bg-white/10 transition-all text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            <button
              className="glass rounded-lg p-2"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="glass-strong mt-2 flex flex-col gap-3 p-4 md:hidden">
            <a href="/#features" onClick={() => setOpen(false)}>Features</a>
            <a href="/#how" onClick={() => setOpen(false)}>How it works</a>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
                <Link to="/interview-types" onClick={() => setOpen(false)}>Interview (New)</Link>
                <Link to="/analysis" onClick={() => setOpen(false)}>Analysis</Link>
                <Link to="/history" onClick={() => setOpen(false)}>History</Link>
                <Link to="/complete-profile" onClick={() => setOpen(false)}>Profile</Link>
                <button onClick={handleLogout} className="text-left">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)}>Login</Link>
                <Link to="/signup" onClick={() => setOpen(false)} className="gradient-text font-semibold">Get started</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;