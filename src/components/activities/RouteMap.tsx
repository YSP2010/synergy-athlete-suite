import { useEffect, useRef } from "react";
import type { TrackPoint } from "@/lib/import/downsample";

interface Props {
  points: TrackPoint[];
  className?: string;
}

/**
 * Karte mit dem GPS-Verlauf. MapLibre wird erst im Browser geladen,
 * damit das SSR-Rendering nicht bricht.
 */
export function RouteMap({ points, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    const coords = points
      .map((p) => [p[2], p[1]] as [number, number])
      .filter(([lng, lat]) => lng !== 0 || lat !== 0);
    if (!el || coords.length < 2) return;

    let map: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      const maplibre = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !ref.current) return;

      const bounds = coords.reduce(
        (acc, c) => [
          Math.min(acc[0], c[0]),
          Math.min(acc[1], c[1]),
          Math.max(acc[2], c[0]),
          Math.max(acc[3], c[1]),
        ],
        [coords[0][0], coords[0][1], coords[0][0], coords[0][1]],
      );

      const m = new maplibre.Map({
        container: ref.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        bounds: [bounds[0], bounds[1], bounds[2], bounds[3]],
        fitBoundsOptions: { padding: 32 },
        attributionControl: { compact: true },
      });
      map = m;

      m.on("load", () => {
        m.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: coords },
          },
        });
        m.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#22d3ee", "line-width": 4 },
        });
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  if (points.length < 2) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground ${className ?? "h-64"}`}>
        Keine GPS-Daten für diese Aktivität
      </div>
    );
  }

  return <div ref={ref} className={`overflow-hidden rounded-lg border border-border ${className ?? "h-64"}`} />;
}
