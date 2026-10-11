"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CITIES, DEFAULT_CITY_ID, type CityPreset } from "@/lib/config";

interface CityState {
  cityId: string;
  city: CityPreset;
  demoAir: boolean;
  setCityId: (id: string) => void;
  setDemoAir: (v: boolean) => void;
}

const Ctx = createContext<CityState | null>(null);
const LS_KEY = "citysutra.city";

interface Prefs {
  cityId: string;
  demoAir: boolean;
}

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>({
    cityId: DEFAULT_CITY_ID,
    demoAir: false,
  });

  // Restore persisted preferences after hydration (localStorage is not
  // available on the server, so this must run post-mount).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<Prefs>;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration restore from localStorage
      setPrefs((cur) => ({
        cityId:
          typeof p.cityId === "string" && CITIES.some((c) => c.id === p.cityId)
            ? p.cityId
            : cur.cityId,
        demoAir: typeof p.demoAir === "boolean" ? p.demoAir : cur.demoAir,
      }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const value = useMemo<CityState>(
    () => ({
      cityId: prefs.cityId,
      city: CITIES.find((c) => c.id === prefs.cityId) ?? CITIES[0],
      demoAir: prefs.demoAir,
      setCityId: (id: string) => setPrefs((p) => ({ ...p, cityId: id })),
      setDemoAir: (v: boolean) => setPrefs((p) => ({ ...p, demoAir: v })),
    }),
    [prefs]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCity(): CityState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCity must be used inside CityProvider");
  return v;
}
