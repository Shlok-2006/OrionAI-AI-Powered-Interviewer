import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function PageShell({ children, hideFooter }: { children: ReactNode; hideFooter?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}

export default PageShell;