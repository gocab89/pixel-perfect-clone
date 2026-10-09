import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion administrateur – Recensement Gocab" },
      { name: "description", content: "Accès sécurisé à l'espace administrateur du recensement des chauffeurs Gocab." },
      { property: "og:title", content: "Connexion administrateur – Recensement Gocab" },
      { property: "og:description", content: "Accès sécurisé à l'espace administrateur du recensement des chauffeurs Gocab." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const input = "w-full rounded-lg border border-input bg-card px-4 py-3 text-base outline-none focus:border-ring focus:ring-4 focus:ring-ring/15";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMsg({ kind: "err", text: "E-mail ou mot de passe incorrect." });
      navigate({ to: "/admin" });
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      setLoading(false);
      if (error) return setMsg({ kind: "err", text: error.message.includes("Password") ? "Mot de passe trop faible (8 caractères minimum)." : "Création du compte impossible." });
      if (data.session) navigate({ to: "/admin" });
      else setMsg({ kind: "ok", text: "Compte créé. Vérifiez votre boîte e-mail pour confirmer votre adresse, puis connectez-vous." });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-7 shadow-card">
        <div className="flex items-center gap-2 text-primary"><Lock size={20} /><span className="text-sm font-semibold uppercase tracking-wider">Espace administrateur</span></div>
        <h1 className="text-2xl font-bold">{mode === "in" ? "Connexion" : "Créer un compte"}</h1>
        <input className={input} type="email" required autoComplete="email" placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        {msg && <p className={`text-sm ${msg.kind === "err" ? "text-destructive" : "text-success"}`}>{msg.text}</p>}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-70">
          {loading && <Loader2 size={18} className="animate-spin" />}{mode === "in" ? "Se connecter" : "Créer le compte"}
        </button>
        <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="w-full text-sm text-muted-foreground hover:text-foreground">
          {mode === "in" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
        </button>
      </form>
    </div>
  );
}
