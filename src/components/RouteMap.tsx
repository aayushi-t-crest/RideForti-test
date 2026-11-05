import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Leaflet
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Coords {
  lat: number;
  lng: number;
}

interface RouteMapProps {
  pickupCoords: Coords | null;
  dropoffCoords: Coords | null;
  className?: string;
}

export default function RouteMap({ pickupCoords, dropoffCoords, className = "" }: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.CircleMarker | null>(null);
  const dropoffMarkerRef = useRef<L.CircleMarker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map centered on Miami
    const map = L.map(mapContainerRef.current, {
      center: [25.7617, -80.1918],
      zoom: 11,
      zoomControl: true,
      scrollWheelZoom: false, // Disable scroll wheel zoom to prevent double-scroll
    });

    // Add CartoDB Positron tiles (light, minimal style)
    // L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    //   attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    //   subdomains: 'abcd',
    //   maxZoom: 20,
    // }).addTo(map);
    // Add OpenStreetMap tiles (free, no API key required)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Force map to recalculate size after a short delay to ensure tiles load fully
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Also invalidate on window resize
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    // Ensure the page scrolls normally when the cursor is over the map.
    // Leaflet can capture wheel events (trackpad/mouse) even when scrollWheelZoom is disabled.
    const wheelHandler = (e: WheelEvent) => {
      e.stopPropagation();
    };
    map.getContainer().addEventListener("wheel", wheelHandler, { passive: true });

    return () => {
      map.getContainer().removeEventListener("wheel", wheelHandler);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers and route when coordinates change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.remove();
      dropoffMarkerRef.current = null;
    }
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // Add pickup marker
    if (pickupCoords) {
      pickupMarkerRef.current = L.circleMarker([pickupCoords.lat, pickupCoords.lng], {
        radius: 10,
        fillColor: "#22c55e",
        color: "#ffffff",
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
      }).addTo(map);
    }

    // Add dropoff marker
    if (dropoffCoords) {
      dropoffMarkerRef.current = L.circleMarker([dropoffCoords.lat, dropoffCoords.lng], {
        radius: 10,
        fillColor: "#ef4444",
        color: "#ffffff",
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
      }).addTo(map);
    }

    // Fit bounds when both coordinates are set
    if (pickupCoords && dropoffCoords) {
      const bounds = L.latLngBounds(
        [pickupCoords.lat, pickupCoords.lng],
        [dropoffCoords.lat, dropoffCoords.lng]
      );
      map.fitBounds(bounds.pad(0.2));
    } else if (pickupCoords) {
      map.setView([pickupCoords.lat, pickupCoords.lng], 14);
    } else if (dropoffCoords) {
      map.setView([dropoffCoords.lat, dropoffCoords.lng], 14);
    }
  }, [pickupCoords, dropoffCoords]);

  // Fetch and draw route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickupCoords || !dropoffCoords) {
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchRoute = async () => {
      setIsLoadingRoute(true);
      try {
        // OSRM expects coordinates as lng,lat
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoords.lng},${pickupCoords.lat};${dropoffCoords.lng},${dropoffCoords.lat}?overview=full&geometries=geojson`;

        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();

        if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
          // Remove existing route
          if (routeLineRef.current) {
            routeLineRef.current.remove();
          }

          // GeoJSON coordinates are [lng, lat], Leaflet needs [lat, lng]
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]]
          );

          // Draw route polyline
          routeLineRef.current = L.polyline(coords, {
            color: "#22c55e",
            weight: 5,
            opacity: 0.8,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);

          // Fit map to route bounds
          map.fitBounds(routeLineRef.current.getBounds().pad(0.1));
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error fetching route:", error);
        }
      } finally {
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();

    return () => {
      controller.abort();
    };
  }, [pickupCoords, dropoffCoords]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full rounded-2xl" />

      {/* Loading indicator */}
      {isLoadingRoute && (
        <div className="absolute top-4 right-4 z-[1000] bg-secondary/90 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2 border border-border">
          <div className="w-4 h-4 border-2 border-forti-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground">Loading route...</span>
        </div>
      )}
    </div>
  );
}
