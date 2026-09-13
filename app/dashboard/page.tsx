"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MemberWithLocation } from "@/lib/types";
import { DASHBOARD_POLL_INTERVAL_MS, STALE_THRESHOLD_MS } from "@/lib/config";

// Leaflet uses window/document, so we must load the map component dynamically
// on the client side only to prevent Next.js SSR errors.
const TeamMap = dynamic(() => import("@/components/TeamMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surfaceAlt text-sm text-slate-400">
      Harita yükleniyor...
    </div>
  ),
});

function isLocationStale(updatedAt?: string) {
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > STALE_THRESHOLD_MS;
}

function formatTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const [members, setMembers] = useState<MemberWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMembers() {
    try {
      const res = await fetch("/api/location/list");
      if (!res.ok) throw new Error("Veriler alınamadı.");
      const data = await res.json();
      setMembers(data.members ?? []);
      setError(null);
    } catch (err) {
      setError("Ekip verileri güncellenemedi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
    const interval = setInterval(fetchMembers, DASHBOARD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex h-screen w-screen flex-col bg-background md:flex-row">
      {/* Sidebar: Member List */}
      <aside className="flex w-full flex-col border-b border-border bg-surface p-6 md:w-80 md:border-b-0 md:border-r">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-50">Ekip Panosu</h1>
            <p className="text-xs text-slate-400">Canlı Konum Takibi</p>
          </div>
          <Link
            href="/join"
            className="rounded-lg bg-surfaceAlt px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-border"
          >
            Konumumu Paylaş
          </Link>
        </header>

        {error && (
          <p className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
        )}

        <div className="flex-1 overflow-y-auto">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ekip Üyeleri ({members.length})
          </h2>

          {loading && members.length === 0 ? (
            <p className="text-sm text-slate-400">Yükleniyor...</p>
          ) : members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center">
              <p className="text-xs text-slate-400">Henüz kimse katılmadı.</p>
              <Link
                href="/join"
                className="mt-2 inline-block text-xs font-semibold text-accent hover:underline"
              >
                İlk katılan siz olun
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {members.map((member) => {
                const active = member.sharingEnabled;
                const stale = isLocationStale(member.location?.updatedAt);

                return (
                  <li
                    key={member.id}
                    className="flex flex-col gap-1 rounded-xl border border-border bg-surfaceAlt p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">{member.name}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          active
                            ? stale
                              ? "bg-warning/10 text-warning"
                              : "bg-success/10 text-success"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {active ? (stale ? "Çevrimdışı" : "Aktif") : "Kapalı"}
                      </span>
                    </div>

                    {active && member.location ? (
                      <div className="text-xs text-slate-400">
                        <p>
                          Son güncelleme:{" "}
                          <span className="text-slate-300">
                            {formatTime(member.location.updatedAt)}
                          </span>
                        </p>
                        {typeof member.location.accuracy === "number" && (
                          <p>Doğruluk: ~{Math.round(member.location.accuracy)} m</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Konum paylaşımı devre dışı.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="mt-6 border-t border-border pt-4 text-center text-[10px] text-slate-500">
          <p>Rıza temelli meşru ekip takip uygulaması.</p>
          <p className="mt-1">Gözetim veya istihbarat amaçlı kullanılamaz.</p>
        </footer>
      </aside>

      {/* Map Area */}
      <section className="relative flex-1 p-4 md:p-6">
        <div className="h-full w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <TeamMap members={members} />
        </div>
      </section>
    </main>
  );
}