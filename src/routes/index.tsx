import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, type ReactNode } from "react";
import { User, CarFront, Palette, Phone, Loader2, CheckCircle2, AlertCircle, ShieldCheck, Hash } from "lucide-react";
import { COULEURS, INDICATIFS, chauffeurSchema } from "@/lib/chauffeur-schema";
import { registerChauffeur } from "@/lib/chauffeurs.functions";

const TITLE = "Recensement des chauffeurs Gocab – Jeux Olympiques";
const DESC = "Formulaire officiel de recensement des chauffeurs Gocab dans le cadre de la préparation des Jeux Olympiques.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Index,
});

type Errors = Partial<Record<"prenom" | "nom" | "immatriculation" | "couleur_vehicule" | "numero", string>>;

const inputCls =
  "w-full rounded-lg border border-input bg-card pl-11 pr-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15 aria-[invalid=true]:border-destructive";

function Field({ label, icon, error, children, htmlFor }: { label: string; icon: ReactNode; error?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {label} <span className="text-destructive">*</span>
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary">{icon}</span>
        {children}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Index() {
  const submit = useServerFn(registerChauffeur);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const busy = useRef(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return; // évite les doubles envois
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = chauffeurSchema.safeParse(raw);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof Errors;
        if (k && !errs[k]) errs[k] = i.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    busy.current = true;
    setStatus("loading");
    try {
      const res = await submit({ data: raw });
      if (res.ok) setStatus("success");
      else { setStatus("error"); setMessage(res.error); }
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
        <div className="mx-auto max-w-2xl px-5 pb-28 pt-10 sm:pt-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-gold" /> Campagne officielle
          </div>
          <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">
            Recensement des chauffeurs Gocab
            <span className="block text-gold">Jeux Olympiques</span>
          </h1>
          <p className="mt-4 max-w-xl text-primary-foreground/85">
            Dans le cadre de la préparation des Jeux Olympiques, nous procédons au recensement des chauffeurs Gocab. Merci de remplir soigneusement le formulaire ci-dessous.
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-20 max-w-2xl px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          {status === "success" ? (
            <div className="py-8 text-center" role="status">
              <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
              <h2 className="mt-4 text-2xl font-bold">Inscription enregistrée avec succès !</h2>
              <p className="mt-2 text-muted-foreground">
                Merci pour votre participation au recensement des chauffeurs Gocab pour les Jeux Olympiques.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Prénom" htmlFor="prenom" icon={<User size={18} />} error={errors.prenom}>
                  <input id="prenom" name="prenom" autoComplete="given-name" className={inputCls} aria-invalid={!!errors.prenom} placeholder="Ex : Moussa" />
                </Field>
                <Field label="Nom" htmlFor="nom" icon={<User size={18} />} error={errors.nom}>
                  <input id="nom" name="nom" autoComplete="family-name" className={inputCls} aria-invalid={!!errors.nom} placeholder="Ex : Diop" />
                </Field>
              </div>

              <Field label="Numéro d'immatriculation" htmlFor="immatriculation" icon={<Hash size={18} />} error={errors.immatriculation}>
                <input id="immatriculation" name="immatriculation" autoCapitalize="characters" className={`${inputCls} uppercase`} aria-invalid={!!errors.immatriculation} placeholder="Ex : DK-1234-A ou AA-123-BC" />
              </Field>

              <Field label="Couleur du véhicule" htmlFor="couleur_vehicule" icon={<Palette size={18} />} error={errors.couleur_vehicule}>
                <select id="couleur_vehicule" name="couleur_vehicule" defaultValue="" className={`${inputCls} appearance-none`} aria-invalid={!!errors.couleur_vehicule}>
                  <option value="" disabled>Sélectionnez une couleur</option>
                  {COULEURS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              <div className="space-y-1.5">
                <label htmlFor="numero" className="text-sm font-semibold">
                  Numéro de téléphone <span className="text-destructive">*</span>
                </label>
                <div className="flex gap-2">
                  <select name="indicatif" defaultValue="+221" aria-label="Indicatif" className="w-28 shrink-0 rounded-lg border border-input bg-card px-3 py-3 text-base outline-none focus:border-ring focus:ring-4 focus:ring-ring/15">
                    {INDICATIFS.map((i) => <option key={i.code} value={i.code}>{i.code} {i.pays}</option>)}
                  </select>
                  <div className="relative flex-1">
                    <Phone size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" />
                    <input id="numero" name="numero" type="tel" inputMode="tel" autoComplete="tel-national" className={inputCls} aria-invalid={!!errors.numero} placeholder="77 123 45 67" />
                  </div>
                </div>
                {errors.numero && <p className="text-sm text-destructive">{errors.numero}</p>}
              </div>

              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

              {status === "error" && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" /> {message}
                </div>
              )}

              <button type="submit" disabled={status === "loading"} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70">
                {status === "loading" ? <><Loader2 className="animate-spin" size={20} /> Enregistrement…</> : <><CarFront size={20} /> Enregistrer mon inscription</>}
              </button>

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
                Vos informations sont collectées uniquement pour le recensement des chauffeurs Gocab dans le cadre des Jeux Olympiques et ne seront pas utilisées à d'autres fins.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
