import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Log In - Digital Heroes",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel: Emotional charity message & abstract soft shapes */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
        {/* Soft abstract shapes */}
        <div
          aria-hidden
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-accent/20 blur-3xl"
        />

        <div className="relative z-10">
          <Link href="/" className="font-heading font-extrabold text-2xl tracking-tight text-primary-foreground">
            Digital Heroes
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent-foreground/90 bg-accent px-2.5 py-1 rounded-full">
            Charity-First
          </span>
          <h2 className="text-4xl font-extrabold font-heading leading-tight">
            Every round of golf can change someone&apos;s world.
          </h2>
          <p className="text-primary-foreground/80 text-sm leading-relaxed">
            Log in to manage your monthly golf scores, check your active draw standings, and track the ongoing difference your subscription creates.
          </p>
        </div>

        <div className="relative z-10 text-xs text-primary-foreground/60">
          Transparent prize draws • 100% verified causes • Fair play
        </div>
      </div>

      {/* Right panel: Login form */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="font-heading font-extrabold text-2xl tracking-tight text-foreground">
              Digital Heroes
            </Link>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
