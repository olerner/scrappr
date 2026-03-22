import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Listing } from '../data/types';
import { TWIN_CITIES_CENTER, MAPBOX_TOKEN, CATEGORIES } from '../data/mockData';

interface MapViewProps {
  listings: Listing[];
  onListingClick?: (listing: Listing) => void;
  className?: string;
  interactive?: boolean;
}

export function MapView({ listings, onListingClick, className = '', interactive = true }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [TWIN_CITIES_CENTER.lng, TWIN_CITIES_CENTER.lat],
        zoom: TWIN_CITIES_CENTER.zoom,
        interactive,
      });

      if (interactive) {
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      }

      map.current.on('error', () => {
        setMapError(true);
      });
    } catch {
      setMapError(true);
    }

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

      const el = document.createElement('div');
      el.className = 'map-marker';
      el.style.cssText = `
        width: 32px; height: 32px; background: #059669; border: 3px solid white;
        border-radius: 50%; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.2s;
      `;
      el.innerHTML = `<span style="color:white;font-size:14px;font-weight:bold;">${listing.category[0]}</span>`;
      el.onmouseenter = () => { el.style.transform = 'scale(1.2)'; };
      el.onmouseleave = () => { el.style.transform = 'scale(1)'; };

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: true }).setHTML(`
        <div style="padding: 12px; min-width: 200px;">
          <div style="font-weight: 600; color: #065F46; margin-bottom: 4px; font-size: 14px;">${listing.category}</div>
          <div style="color: #4b5563; font-size: 13px; margin-bottom: 6px; line-height: 1.4;">${listing.description.slice(0, 80)}...</div>
          <div style="font-weight: 600; color: #059669; font-size: 13px;">${catInfo?.payoutLabel ?? listing.estimatedValue}</div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([listing.lng, listing.lat])
        .setPopup(popup)
        .addTo(map.current!);

      if (onListingClick) {
        el.addEventListener('click', () => onListingClick(listing));
      }

      markersRef.current.push(marker);
    });
  }, [listings, onListingClick]);

  if (mapError) {
    return (
      <div className={`bg-emerald-50 flex flex-col items-center justify-center ${className}`}>
        <div className="text-center p-8">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-emerald-900 mb-2">Map Preview</h3>
          <p className="text-sm text-emerald-700 max-w-xs mx-auto">
            Twin Cities area with {listings.filter(l => l.status === 'available').length} active scrap listings.
            Add a valid Mapbox token to enable the interactive map.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 max-w-xs mx-auto">
            {listings.filter(l => l.status === 'available').slice(0, 4).map(l => (
              <div key={l.id} className="bg-white rounded-lg p-2 text-left text-xs shadow-sm">
                <div className="font-medium text-emerald-800">{l.category}</div>
                <div className="text-gray-500 truncate">{l.address}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
}
