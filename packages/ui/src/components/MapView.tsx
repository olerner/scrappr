import L from "leaflet";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { CLAIM_EXPIRY_HOURS } from "@scrappr/shared/src/constants";
import { CATEGORIES, getCategoryDisplayName, TWIN_CITIES_CENTER } from "../data/mockData";
import type { Listing } from "../data/types";

interface MapViewProps {
  listings: Listing[];
  onClaimClick?: (listingId: string) => Promise<void>;
  className?: string;
  interactive?: boolean;
  visible?: boolean;
}

export function MapView({
  listings,
  onClaimClick,
  className = "",
  interactive = true,
  visible = true,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const onClaimClickRef = useRef(onClaimClick);
  onClaimClickRef.current = onClaimClick;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [TWIN_CITIES_CENTER.lat, TWIN_CITIES_CENTER.lng],
      zoom: TWIN_CITIES_CENTER.zoom,
      dragging: interactive,
      scrollWheelZoom: interactive,
      zoomControl: interactive,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    if (visible && map.current) {
      map.current.invalidateSize();
    }
  }, [visible]);

  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => {
      m.remove();
    });
    markersRef.current = [];

    const availableListings = listings.filter((l) => l.status === "available");

    availableListings.forEach((listing) => {
      const catInfo = CATEGORIES.find((c) => c.name === listing.category);

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width: 32px; height: 32px; background: #059669; border: 3px solid white;
          border-radius: 50%; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        "><span style="color:white;font-size:14px;font-weight:bold;">${listing.category[0]}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const claimButton = onClaimClick
        ? `<button
            data-claim-id="${listing.listingId}"
            style="width: 100%; margin-top: 8px; padding: 10px 12px; min-height: 44px; background: #059669; color: white;
              border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;"
          >Claim Pickup</button>`
        : "";

      const popupContent = `
        <div style="padding: 12px; min-width: 200px;">
          <div style="font-weight: 600; color: #065F46; margin-bottom: 4px; font-size: 14px;">${getCategoryDisplayName(listing.category)}</div>
          <div style="color: #4b5563; font-size: 13px; margin-bottom: 4px; line-height: 1.4;">${listing.description.slice(0, 80)}${listing.description.length > 80 ? "..." : ""}</div>
          <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${listing.address || "Twin Cities area"}</div>
          <div style="font-weight: 600; color: #059669; font-size: 13px;">${catInfo?.payoutLabel ?? listing.estimatedValue}</div>
          ${claimButton}
        </div>
      `;

      const marker = L.marker([listing.lat, listing.lng], { icon })
        .bindPopup(popupContent)
        .addTo(map.current!);

      if (onClaimClick) {
        marker.on("popupopen", () => {
          const btn = document.querySelector(
            `[data-claim-id="${listing.listingId}"]`,
          ) as HTMLButtonElement | null;
          if (btn) {
            let confirming = false;
            btn.addEventListener("click", async () => {
              if (!confirming) {
                confirming = true;
                btn.textContent = `Confirm? You have ${CLAIM_EXPIRY_HOURS} hours to pick up`;
                btn.style.background = "#f59e0b";
                setTimeout(() => {
                  if (confirming && !btn.disabled) {
                    confirming = false;
                    btn.textContent = "Claim Pickup";
                    btn.style.background = "#059669";
                  }
                }, 3000);
                return;
              }
              btn.disabled = true;
              btn.textContent = "Claiming...";
              btn.style.opacity = "0.7";
              try {
                await onClaimClickRef.current?.(listing.listingId);
                btn.textContent = "Claimed!";
                btn.style.background = "#059669";
                btn.style.opacity = "1";
                setTimeout(() => marker.closePopup(), 800);
              } catch {
                confirming = false;
                btn.textContent = "Failed — try again";
                btn.style.background = "#dc2626";
                btn.style.opacity = "1";
                btn.disabled = false;
              }
            });
          }
        });
      }

      markersRef.current.push(marker);
    });
  }, [listings, onClaimClick]);

  return <div ref={mapContainer} className={className} />;
}
