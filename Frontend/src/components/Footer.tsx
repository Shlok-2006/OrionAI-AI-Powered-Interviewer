export function Footer() {
  return (
    <footer className="mx-auto mt-24 max-w-7xl px-4 pb-10">
      <div className="glass flex flex-col items-center justify-between gap-6 px-6 py-8 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white/5 p-1 border border-white/10">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <span className="font-semibold">
            Orion<span className="gradient-text">AI</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} OrionAI. Practice. Perform. Get hired.
        </p>
      </div>
    </footer>
  );
}

export default Footer;