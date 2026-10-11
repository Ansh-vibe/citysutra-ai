"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

/** Compact click/drag location picker. */
export default function MapPicker({
  value,
  onChange,
}: {
  value: [number, number] | null;
  onChange: (v: [number, number]) => void;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    const center: [number, number] = value ?? [28.6315, 77.2167];
    const map = L.map(divRef.current, { center, zoom: 12, zoomControl: true });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    const place = (ll: [number, number]) => {
      if (markerRef.current) markerRef.current.setLatLng(ll);
      else {
        markerRef.current = L.marker(ll, {
          draggable: true,
          icon: L.divIcon({
            className: "",
            html: '<div class="cs-marker" style="width:18px;height:18px;background:#101d2d">+</div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(map);
        markerRef.current.on("dragend", () => {
          const p = markerRef.current!.getLatLng();
          cbRef.current([p.lat, p.lng]);
        });
      }
      cbRef.current(ll);
    };
    if (value) place(value);
    else
      markerRef.current = L.marker(center, {
        draggable: true,
        icon: L.divIcon({
          className: "",
          html: '<div class="cs-marker" style="width:18px;height:18px;background:#101d2d">+</div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      }).addTo(map);
    markerRef.current!.on("dragend", () => {
      const p = markerRef.current!.getLatLng();
      cbRef.current([p.lat, p.lng]);
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      const ll: [number, number] = [e.latlng.lat, e.latlng.lng];
      place(ll);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // external value changes (e.g. preset selection)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    const ll: L.LatLngExpression = value;
    if (markerRef.current) {
      markerRef.current.setLatLng(ll);
      map.panTo(ll);
    } else {
      map.setView(ll, map.getZoom());
    }
  }, [value]);

  return <div ref={divRef} className="h-[220px] w-full rounded-lg border border-line" />;
}
