import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Phone, Loader2, ShieldCheck, AlertCircle, ArrowLeft, User, CarFront, Palette, Hash, CalendarDays } from "lucide-react";
import { verifyChauffeur } from "@/lib/chauffeurs.functions";

const TITLE = "Vérification d'un chauffeur – Recensement Gocab";
const DESC = "Vérifiez l'inscription d'un chauffeur Gocab au recensement des Jeux Olympiques grâce à son numéro de téléphone.";

export const Route = createFileRoute("/verification")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Verification,
});

type Chauffeur = {
  prenom: string;
  nom: string;
  immatriculation: string;
  type_vehicule: string;
  couleur_vehicule: string;
  telephone: string;
  created_at: string;
};

function Verification() {
  const submit = useServerFn(verifyChauffeur);
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const [message, setMessage] = useState("");
  const [chauffeur, setChauffeur] = useState<Chauffeur | null>(null);
  const busy = useRef(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    const phone = String(new FormData(e.currentTarget).get("telephone") ?? "").trim();
    if (!phone) {
      setStatus("error");
      setMessage("Veuillez saisir un numéro de téléphone.");
      return;
    }
    busy.current = true;
    setStatus("loading");
    setChauffeur(null);
    try {
      const res = await submit({ data: phone });
      if (!res.ok) {
        setStatus("error");
        setMessage(res.error);
      } else if (res.chauffeur) {
        setChauffeur(res.chauffeur as Chauffeur);
        setStatus("found");
      } else {
        setStatus("notfound");
      }
    } catch {
      setStatus("error");
      setMessage("Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.");
    } finally {
      busy.current = false;
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-2xl px-5 pb-24 pt-10 sm:pt-14">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/80 hover:text-primary-foreground">
            <ArrowLeft size={16} /> Retour au formulaire
          </Link>
          <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">
            Vérification d'un chauffeur
            <span className="block text-gold">Recensement Gocab</span>
          </h1>
          <p className="mt-4 max-w-xl text-primary-foreground/85">
            Saisissez le numéro de téléphone du chauffeur pour vérifier son inscription au recensement.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-16 max-w-2xl px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="telephone" className="text-sm font-semibold text-foreground">
                Numéro de téléphone du chauffeur <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary">
                  <Phone size={18} />
                </span>
                <input
                  id="telephone"
                  name="telephone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+221 77 123 45 67"
                  className="w-full rounded-lg border border-input bg-card pl-11 pr-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
                />
              </div>
              <p className="text-xs text-muted-foreground">Avec ou sans indicatif (ex. 77 123 45 67 ou +221 77 123 45 67).</p>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {status === "loading" ? "Vérification en cours…" : "Vérifier l'inscription"}
            </button>
          </form>

          {status === "error" && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle size={18} className="mt-0.5 shrink-0" /> {message}
            </div>
          )}

          {status === "notfound" && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              Aucun chauffeur inscrit avec ce numéro de téléphone. Vérifiez le numéro saisi.
            </div>
          )}

          {status === "found" && chauffeur && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success">
                <ShieldCheck size={18} /> Chauffeur bien inscrit au recensement
              </div>
              <dl className="divide-y divide-border rounded-xl border border-border">
                <Row icon={<User size={16} />} label="Nom complet" value={`${chauffeur.prenom} ${chauffeur.nom}`} />
                <Row icon={<Hash size={16} />} label="Immatriculation" value={chauffeur.immatriculation} />
                <Row icon={<CarFront size={16} />} label="Type de véhicule" value={chauffeur.type_vehicule} />
                <Row icon={<Palette size={16} />} label="Couleur du véhicule" value={chauffeur.couleur_vehicule} />
                <Row icon={<Phone size={16} />} label="Téléphone" value={chauffeur.telephone} />
                <Row
                  icon={<CalendarDays size={16} />}
                  label="Date d'inscription"
                  value={new Date(chauffeur.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                />
              </dl>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-primary">{icon}</span>
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
