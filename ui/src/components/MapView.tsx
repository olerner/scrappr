import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Listing } from '../data/types';
import { TWIN_CITIES_CENTER, CATEGORIES } from '../data/mockData';

interface MapViewProps {
  listings: Listing[];
  onListingClick?: (listing: Listing) => void;
  className?: string;
  interactive?: boolean;
}

export function MapView({ listings, onListingClick, className = '', interactive = true }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [TWIN_CITIES_CENTER.lat, TWIN_CITIES_CENTER.lng],
      zoom: TWIN_CITIES_CENTER.zoom,
      dragging: interactive,
      scrollWheelZoom: interactive,
      zoomControl: interactive,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const availableListings = listings.filter((l) => l.status === 'available');

    availableListings.forEach((listing) => {
      const catInfo = CATEGORIES.find((c) => c.name === listing.category);

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width: 32px; height: 32px; background: #059669; border: 3px solid white;
          border-radius: 50%; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        "><span style="color:white;font-size:14px;font-weight:bold;">${listing.category[0]}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const popupContent = `
        <div style="padding: 12px; min-width: 200px;">
          <div style="font-weight: 600; color: #065F46; margin-bottom: 4px; font-size: 14px;">${listing.category}</div>
          <div style="color: #4b5563; font-size: 13px; margin-bottom: 6px; line-height: 1.4;">${listing.description.slice(0, 80)}...</div>
          <div style="font-weight: 600; color: #059669; font-size: 13px;">${catInfo?.payoutLabel ?? listing.estimatedValue}</div>
        </div>
      `;

      const marker = L.marker([listing.lat, listing.lng], { icon })
        .bindPopup(popupContent)
        .addTo(map.current!);

      if (onListingClick) {
        marker.on('click', () => onListingClick(listing));
      }

      markersRef.current.push(marker);
    });
  }, [listings, onListingClick]);

  return <div ref={mapContainer} className={className} />;
}
