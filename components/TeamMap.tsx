"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { MemberWithLocation } from "@/lib/types";
import { STALE_THRESHOLD_MS } from "@/lib/config";

const DEFAULT_CENTER: [number, number] = [41.0082, 28.9784]; // Istanbul fallback

function buildIcon(isStale: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="member-marker${isStale ? " offline" : ""}"><span class="pulse"></span><span class="dot"></span></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, points]);

  return null;
}

function isLocationStale(updatedAt: string) {
  return Date.now() - new Date(updatedAt).getTime() > STALE_THRESHOLD_MS;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export default function TeamMap({ members }: { members: MemberWithLocation[] }) {
  const located = useMemo(
    () => members.filter((m) => m.sharingEnabled && m.location),
    [members]
  );

  const points = useMemo<[number, number][]>(
    () => located.map((m) => [m.location!.latitude, m.location!.longitude]),
    [located]
  );

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanları'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {points.length > 0 && <FitBounds points={points} />}

      {located.map((member) => {
        const stale = isLocationStale(member.location!.updatedAt);
        return (
          <Marker
            key={member.id}
            position={[member.location!.latitude, member.location!.longitude]}
            icon={buildIcon(stale)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{member.name}</p>
                <p className="text-xs text-slate-400">
                  Son güncelleme: {formatTime(member.location!.updatedAt)}
                  {stale && " (bayat veri)"}
                </p>
                {typeof member.location!.accuracy === "number" && (
                  <p className="text-xs text-slate-400">
                    Doğruluk: ~{Math.round(member.location!.accuracy)} m
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}