"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCATION_UPDATE_INTERVAL_MS } from "@/lib/config";

type Step = "form" | "consent" | "sharing";

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const savedId = window.localStorage.getItem("memberId");
    const savedName = window.localStorage.getItem("memberName");
    if (savedId && savedName) {
      setMemberId(savedId);
      setName(savedName);
      setStep("consent");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Lütfen adınızı girin.");
      return;
    }
    if (!inviteCode.trim()) {
      setError("Lütfen davet kodunu girin.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), inviteCode: inviteCode.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Katılım sırasında bir hata oluştu.");
        return;
      }

      setMemberId(data.memberId);
      setSharingEnabled(data.sharingEnabled);
      window.localStorage.setItem("memberId", data.memberId);
      window.localStorage.setItem("memberName", data.name);
      setStep("consent");
    } catch (err) {
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  async function sendLocation(position: GeolocationPosition, enabled: boolean) {
    if (!memberId) return;
    try {
      const res = await fetch("/api/location/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          sharingEnabled: enabled,
        }),
      });
      if (res.ok) {
        setLastSentAt(new Date().toLocaleTimeString("tr-TR"));
      }
    } catch {
      // Network hiccup: the next periodic tick will retry on its own.
    }
  }

  function startSharing() {
    setGeoError(null);

    if (!("geolocation" in navigator)) {
      setGeoError("Bu tarayıcı konum servislerini desteklemiyor.");
      return;
    }

    // The browser's own native permission prompt appears here. The user
    // sees exactly what is being requested (their location) and why
    // (this screen explains it above), and can deny it at any time.
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setSharingEnabled(true);
        setStep("sharing");
        await sendLocation(position, true);

        intervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => sendLocation(pos, true),
            () => setGeoError("Konum alınamadı, tekrar denenecek."),
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
          );
        }, LOCATION_UPDATE_INTERVAL_MS);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            "Konum izni reddedildi. Paylaşımı açmak için tarayıcı ayarlarından bu site için konum iznini etkinleştirin."
          );
        } else {
          setGeoError("Konum alınamadı. Lütfen tekrar deneyin.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function stopSharing() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSharingEnabled(false);
    setStep("consent");

    if (memberId) {
      try {
        await fetch("/api/location/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberId, sharingEnabled: false }),
        });
      } catch {
        // Best-effort: the server also stops trusting stale data over time.
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-slate-50">Ekip Konum Takibi</h1>
        <p className="mt-2 text-sm text-slate-400">
          Yalnızca açıkça izin verdiğiniz sürece konumunuz ekibinizle paylaşılır.
        </p>
      </header>

      {step === "form" && (
        <form
          onSubmit={handleJoinSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">
              Adınız
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Piyami Polat"
              className="rounded-xl border border-border bg-surfaceAlt px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-accent"
              autoComplete="name"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="inviteCode" className="text-sm font-medium text-slate-300">
              Davet Kodu
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Ekibinizden aldığınız kod"
              className="rounded-xl border border-border bg-surfaceAlt px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-accent"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-accentAlt disabled:opacity-60"
          >
            {loading ? "Katılınıyor..." : "Ekibe Katıl"}
          </button>
        </form>
      )}

      {step === "consent" && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
          <p className="text-sm text-slate-300">
            Merhaba <span className="font-semibold text-slate-100">{name}</span>. Konum
            paylaşımınız şu anda{" "}
            <span className={sharingEnabled ? "text-success" : "text-muted"}>
              {sharingEnabled ? "açık" : "kapalı"}
            </span>
            .
          </p>

          <div className="rounded-xl border border-border bg-surfaceAlt p-4 text-sm text-slate-400">
            <p className="mb-2 font-medium text-slate-200">Konumumu paylaşırsam ne olur?</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Tarayıcınız konum izni ister; yalnızca izin verirseniz devam eder.</li>
              <li>Bu sayfa açıkken konumunuz düzenli aralıklarla ekip panosuna gönderilir.</li>
              <li>Yalnızca ekip üyeleriniz son konumunuzu panoda görebilir.</li>
              <li>Paylaşımı istediğiniz an kapatabilirsiniz; kapattığınızda konumunuz hemen silinir.</li>
            </ul>
          </div>

          {geoError && (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{geoError}</p>
          )}

          <button
            onClick={startSharing}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-accentAlt"
          >
            Konum Paylaşımını Aç
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-surfaceAlt"
          >
            Panoyu Görüntüle
          </button>
        </div>
      )}

      {step === "sharing" && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-success"></span>
            </span>
            <p className="text-sm font-medium text-success">Konum paylaşımı aktif</p>
          </div>

          <p className="text-sm text-slate-400">
            Bu sekme açık kaldığı sürece konumunuz düzenli olarak gönderiliyor.
            {lastSentAt && (
              <>
                {" "}
                Son gönderim: <span className="text-slate-200">{lastSentAt}</span>
              </>
            )}
          </p>

          {geoError && (
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">{geoError}</p>
          )}

          <button
            onClick={stopSharing}
            className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/20"
          >
            Konum Paylaşımını Kapat
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-surfaceAlt"
          >
            Panoyu Görüntüle
          </button>
        </div>
      )}
    </main>
  );
}