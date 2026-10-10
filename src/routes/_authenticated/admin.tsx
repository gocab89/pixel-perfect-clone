import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, LogOut, Search, Users, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listChauffeurs } from "@/lib/admin.functions";
import { COULEURS, TYPE_VEHICULES } from "@/lib/chauffeur-schema";
import { toCsv } from "@/lib/csv";

const chauffeursQuery = queryOptions({ queryKey: ["chauffeurs"], queryFn: () => listChauffeurs() });

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration – Recensement Gocab" },
      { name: "description", content: "Liste des chauffeurs Gocab recensés pour les Jeux Olympiques." },
      { property: "og:title", content: "Administration – Recensement Gocab" },
      { property: "og:description", content: "Liste des chauffeurs Gocab recensés pour les Jeux Olympiques." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(chauffeursQuery),
  component: AdminPage,
});

const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
const field = "rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-4 focus:ring-ring/15";

function AdminPage() {
  const { data } = useSuspenseQuery(chauffeursQuery);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [couleur, setCouleur] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/\s+/g, "");
    return data.rows.filter((r) => {
      if (couleur && r.couleur_vehicule !== couleur) return false;
      if (type && r.type_vehicule !== type) return false;
      const day = r.created_at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!s) return true;
      return [r.prenom, r.nom, r.telephone, r.immatriculation, `${r.prenom}${r.nom}`]
        .some((v) => v.toLowerCase().replace(/[\s-]/g, "").includes(s.replace(/-/g, "")));
    });
  }, [data.rows, q, couleur, type, from, to]);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  function exportCsv() {
    const csv = toCsv(
      ["Prénom", "Nom", "Immatriculation", "Type de véhicule", "Couleur", "Téléphone", "Date d'inscription"],
      rows.map((r) => [r.prenom, r.nom, r.immatriculation, r.type_vehicule, r.couleur_vehicule, r.telephone, fmt(r.created_at)]),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `chauffeurs-gocab-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-3 text-xl font-bold">Accès refusé</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ce compte n'a pas les droits administrateur.</p>
          <button onClick={logout} className="mt-5 rounded-lg border border-input px-4 py-2 text-sm font-semibold hover:bg-accent">Se déconnecter</button>
        </div>
      </div>
    );
  }

  const filtered = rows.length !== data.rows.length;

  return (
    <div className="min-h-screen">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">Espace administrateur</p>
            <h1 className="text-xl font-bold sm:text-2xl">Recensement des chauffeurs Gocab</h1>
          </div>
          <button onClick={logout} className="flex items-center gap-2 rounded-lg border border-primary-foreground/30 px-3 py-2 text-sm font-semibold hover:bg-primary-foreground/10">
            <LogOut size={16} /> <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="rounded-xl bg-secondary p-3 text-primary"><Users /></div>
            <div>
              <p className="text-sm text-muted-foreground">Chauffeurs recensés</p>
              <p className="font-display text-3xl font-bold">{data.rows.length}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div>
              <p className="text-sm text-muted-foreground">{filtered ? "Résultats filtrés" : "Affichés"}</p>
              <p className="font-display text-3xl font-bold">{rows.length}</p>
            </div>
            <button onClick={exportCsv} disabled={!rows.length} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <Download size={16} /> Exporter CSV
            </button>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher : prénom, nom, téléphone, immatriculation" className={`${field} w-full pl-9`} />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className={field} aria-label="Type de véhicule">
            <option value="">Tous les types</option>
            {TYPE_VEHICULES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select value={couleur} onChange={(e) => setCouleur(e.target.value)} className={field} aria-label="Couleur">
            <option value="">Toutes les couleurs</option>
            {COULEURS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">Du <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} /></label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">Au <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} /></label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {rows.length === 0 ? (
            <p className="p-10 text-center text-muted-foreground">{data.rows.length ? "Aucun chauffeur ne correspond à ces critères." : "Aucune inscription pour le moment."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>{["Prénom", "Nom", "Immatriculation", "Type", "Couleur", "Téléphone", "Inscrit le"].map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium">{r.prenom}</td>
                      <td className="px-4 py-3 font-medium">{r.nom}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">{r.immatriculation}</td>
                      <td className="px-4 py-3">{r.couleur_vehicule}</td>
                      <td className="whitespace-nowrap px-4 py-3"><a href={`tel:${r.telephone}`} className="text-primary hover:underline">{r.telephone}</a></td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{fmt(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
