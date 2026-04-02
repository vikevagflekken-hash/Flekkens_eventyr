import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Sted } from "@/types/sted";

interface Props {
  steder: Sted[];
  aktivtSted: Sted;
  onVelgSted: (index: number) => void;
}

type MapMode = "standard" | "satellite";

const DEFAULT_VIEW: [number, number] = [55, 10];
const DEFAULT_ZOOM = 4;
const STORAGE_KEY = "flekken-map-mode";

const standardTileConfig = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  options: {
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  },
};

const satelliteTileConfig = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  options: {
    attribution: "Tiles © Esri",
    maxZoom: 19,
  },
};

function getTargetZoom(map: L.Map, sted: Sted) {
  const requestedZoom = sted.map_zoom;
  if (requestedZoom == null) return map.getMaxZoom();
  return Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), requestedZoom));
}

export default function HoyreSide({ steder, aktivtSted, onVelgSted }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored === "satellite" ? "satellite" : "standard";
    } catch {
      return "standard";
    }
  });

  const stederMedKoord = useMemo(
    () => steder.filter((s) => s.breddegrad != null && s.lengdegrad != null),
    [steder]
  );

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      maxZoom: 19,
    });

    const initialTileLayer = L.tileLayer(standardTileConfig.url, standardTileConfig.options).addTo(map);
    tileLayerRef.current = initialTileLayer;
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    if (stederMedKoord.length > 0) {
      const bounds = L.latLngBounds(
        stederMedKoord.map((s) => [s.breddegrad!, s.lengdegrad!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    } else {
      map.setView(DEFAULT_VIEW, DEFAULT_ZOOM);
    }

    return () => {
      map.remove();
      mapInstance.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
      tileLayerRef.current = null;
    };
  }, [stederMedKoord]);



  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const refreshMap = () => {
      window.requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };

    refreshMap();
    const timeoutId = window.setTimeout(refreshMap, 150);
    window.addEventListener("resize", refreshMap);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", refreshMap);
    };
  }, [aktivtSted.id, mapMode, stederMedKoord.length]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const config = mapMode === "satellite" ? satelliteTileConfig : standardTileConfig;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(config.url, config.options).addTo(map);

    try {
      window.localStorage.setItem(STORAGE_KEY, mapMode);
    } catch {
      // ignore storage errors
    }
    map.invalidateSize();
  }, [mapMode]);

  useEffect(() => {
    const map = mapInstance.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    const defaultIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width:24px;height:24px;background:hsl(0,60%,45%);border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const activeIcon = L.divIcon({
      className: "custom-marker-active",
      html: `<div style="width:34px;height:34px;background:hsl(15,60%,50%);border:4px solid white;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,0.45);"></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const sortedWithCoords = [...stederMedKoord].sort((a, b) => {
      const aOrder = a.rekkefolge ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.rekkefolge ?? Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) return aOrder - bOrder;
      if (a.dato && b.dato && a.dato !== b.dato) return a.dato.localeCompare(b.dato);
      return a.tittel.localeCompare(b.tittel);
    });

    sortedWithCoords.forEach((s) => {
      const isActive = s.id === aktivtSted.id;

      const marker = L.marker([s.breddegrad!, s.lengdegrad!], {
        icon: isActive ? activeIcon : defaultIcon,
        zIndexOffset: isActive ? 1000 : 0,
      }).addTo(markersLayer);

      marker.bindTooltip(s.tittel, {
        permanent: false,
        direction: "top",
        offset: [0, -14],
        className: "font-body",
      });

      marker.on("click", () => {
        const idx = steder.findIndex((st) => st.id === s.id);
        if (idx >= 0) onVelgSted(idx);
      });
    });

    if (sortedWithCoords.length >= 2) {
      const routeCoords: L.LatLngExpression[] = sortedWithCoords.map((s) => [
        s.breddegrad!,
        s.lengdegrad!,
      ]);

      routeLayerRef.current = L.polyline(routeCoords, {
        color: "hsl(30, 80%, 50%)",
        weight: 3,
        dashArray: "8, 8",
        opacity: 0.8,
      }).addTo(map);
    }

    map.invalidateSize();

    if (aktivtSted.breddegrad != null && aktivtSted.lengdegrad != null) {
      map.flyTo(
        [aktivtSted.breddegrad, aktivtSted.lengdegrad],
        getTargetZoom(map, aktivtSted),
        { duration: 1.1 }
      );
    } else if (stederMedKoord.length > 0) {
      const bounds = L.latLngBounds(
        stederMedKoord.map((s) => [s.breddegrad!, s.lengdegrad!] as [number, number])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [aktivtSted, steder, stederMedKoord, onVelgSted]);

  return (
    <div className="book-page h-full p-4 md:p-5 lg:p-6 flex flex-col">
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground text-center mb-3 leading-tight shrink-0">
        Reisekart
      </h2>

      <div className="mb-3 flex items-center justify-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setMapMode("standard")}
          className={`px-3 py-1.5 rounded-full border text-sm font-body transition ${
            mapMode === "standard"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background/80 text-foreground border-border hover:bg-muted"
          }`}
        >
          Standard
        </button>
        <button
          type="button"
          onClick={() => setMapMode("satellite")}
          className={`px-3 py-1.5 rounded-full border text-sm font-body transition ${
            mapMode === "satellite"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background/80 text-foreground border-border hover:bg-muted"
          }`}
        >
          Satelita
        </button>
      </div>

      <div className="flex-1 min-h-[320px] rounded-lg overflow-hidden border-2 border-border shadow-md bg-muted/20">
        <div ref={mapRef} className="w-full h-full" />
      </div>

      <p className="mt-3 text-center text-sm text-muted-foreground font-body shrink-0">
        Klikk på en markør for å hoppe til stedet.
      </p>
    </div>
  );
}
