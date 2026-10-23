import { NavBar } from "@/components/nav-bar";
import { Footer } from "@/components/footer";

/** Shared layout for all public-facing pages: home, charities, charity detail. */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
