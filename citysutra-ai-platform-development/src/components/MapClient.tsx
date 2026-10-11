"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { STATUS_META } from "@/lib/config";
import type { Incident } from "@/lib/types";

export interface MapContextInfo {
  label: string;
  lines: string[];
}

export default function MapClient({
  incidents,
  center,
  zoom = 12,
  pickMode = false,
  onPick,
  selectedId,
  onSelect,
  picked = null,
  context,
  showContext = true,
}: {
  incidents: Incident[];
  center: [number, number];
  zoom?: number;
  pickMode?: boolean;
  onPick?: (lat: number, lon: number) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  picked?: [number, number] | null;
  context?: MapContextInfo | null;
  showContext?: boolean;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const ctxRef = useRef<L.LayerGroup | null>(null);
  const pickedRef = useRef<L.Marker | null>(null);
  const cbRef = useRef({ onPick, onSelect, pickMode });
  cbRef.current = { onPick, onSelect, pickMode };

  const cLat = center[0];
  const cLon = center[1];

  // init once
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const map = L.map(divRef.current, { center, zoom });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    ctxRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (cbRef.current.pickMode && cbRef.current.onPick) {
        cbRef.current.onPick(e.latlng.lat, e.latlng.lng);
      }
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      ctxRef.current = null;
      pickedRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recenter on city change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([cLat, cLon], Math.max(map.getZoom(), 11));
  }, [cLat, cLon]);

  // incident markers
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    incidents.forEach((i) => {
      const color = STATUS_META[i.status].color;
      const size = 15 + i.severity * 3;
      const selected = i.incidentId === selectedId;
      const icon = L.divIcon({
        className: "",
        html: `<div class="cs-marker" style="width:${size}px;height:${size}px;background:${color};${
          selected ? "outline:3px solid #101d2d;outline-offset:2px;" : ""
        }">${i.severity}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const m = L.marker([i.latitude, i.longitude], { icon, title: i.title });
      m.bindTooltip(`${i.title} — ${STATUS_META[i.status].label}${i.isDemo ? " (DEMO)" : ""}`, {
        direction: "top",
        offset: [0, -size / 2],
      });
      m.on("click", () => cbRef.current.onSelect?.(i.incidentId));
      layer.addLayer(m);
    });
  }, [incidents, selectedId]);

  // picked-location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pickedRef.current) {
      map.removeLayer(pickedRef.current);
      pickedRef.current = null;
    }
    if (picked) {
      pickedRef.current = L.marker(picked, {
        icon: L.divIcon({
          className: "",
          html: '<div class="cs-marker" style="width:18px;height:18px;background:#101d2d">+</div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);
    }
  }, [picked]);

  // grid-context proxy circle
  useEffect(() => {
    const g = ctxRef.current;
    const map = mapRef.current;
    if (!g || !map) return;
    g.clearLayers();
    if (!showContext || !context) return;
    L.circle([cLat, cLon], {
      radius: 2000,
      color: "#4356c6",
      weight: 1.5,
      fillColor: "#4356c6",
      fillOpacity: 0.08,
      dashArray: "4 4",
    }).addTo(g);
    L.marker([cLat, cLon], {
      icon: L.divIcon({
        className: "",
        html: `<div style="background:#101d2d;color:#fff;font:600 10px 'JetBrains Mono',monospace;padding:3px 7px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">${context.label}</div>`,
        iconAnchor: [0, -40],
      }),
      interactive: false,
    })
      .addTo(g)
      .bindTooltip(
        `${context.label} — grid cell proxy (≈15–25 km resolution, not street level)\n${context.lines.join("\n")}`,
        { direction: "bottom", offset: [0, -36] }
      );
  }, [cLat, cLon, context, showContext]);

  return (
    <div
      ref={divRef}
      className="h-full w-full"
      style={{ cursor: pickMode ? "crosshair" : undefined }}
      role="application"
      aria-label="Incident map"
    />
  );
}
