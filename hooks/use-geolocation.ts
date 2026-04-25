"use client";

import { useState, useEffect, useCallback } from "react";

type Coords = { lat: number; lng: number };
type PermissionState = "prompt" | "requesting" | "granted" | "denied" | "unsupported";

const STORAGE_KEY = "cge:geolocation:v1";

function loadCachedCoords(): Coords | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.lat === "number" &&
      typeof parsed?.lng === "number"
    ) {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(loadCachedCoords);
  const [permission, setPermission] = useState<PermissionState>(
    coords ? "granted" : "prompt",
  );

  // Sync permission state with the browser's actual state when possible.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      return;
    }
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (status.state === "denied") setPermission("denied");
        else if (status.state === "granted" && !coords) {
          setPermission("granted");
        }
      })
      .catch(() => {
        /* permissions API not available — leave as "prompt" */
      });
  }, [coords]);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      return;
    }
    setPermission("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setPermission("granted");
        try {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* private mode etc — ignore */
        }
      },
      () => setPermission("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 },
    );
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return { coords, permission, request, clear };
}
