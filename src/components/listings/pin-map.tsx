"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import type { LatLng } from "@/lib/maps";

const DUBAI: LatLng = { lat: 25.2048, lng: 55.2708 };

// Inline SVG pin (Leaflet's default icon URLs break under bundlers).
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M18 0C8 0 0 8 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8 28 0 18 0z" fill="#1D4ED8"/>
    <circle cx="18" cy="18" r="7" fill="#fff"/></svg>`,
  iconSize: [36, 48],
  iconAnchor: [18, 48],
});

function ClickToMove({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

/** Interactive map with a draggable pin. `value` null → centred on Dubai. */
export default function PinMap({
  value,
  onChange,
  interactive = true,
  height = 320,
}: {
  value: LatLng | null;
  onChange?: (p: LatLng) => void;
  interactive?: boolean;
  height?: number;
}) {
  const [pos, setPos] = useState<LatLng | null>(value);
  useEffect(() => setPos(value), [value]);
  const center = useMemo(() => value ?? DUBAI, [value]);

  const update = (p: LatLng) => {
    setPos(p);
    onChange?.(p);
  };

  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-slate-200" dir="ltr">
      <MapContainer
        key={interactive ? "i" : `${center.lat},${center.lng}`}
        center={[center.lat, center.lng]}
        zoom={value ? 16 : 11}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        style={{ height: "100%", width: "100%" }}
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {interactive && <ClickToMove onPick={update} />}
        {pos && (
          <Marker
            position={[pos.lat, pos.lng]}
            icon={pinIcon}
            draggable={interactive}
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                update({ lat: ll.lat, lng: ll.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
