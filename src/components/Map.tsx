import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Custom CSS to clean up Leaflet popups
const popupStyles = `
  .custom-map-popup .leaflet-popup-content-wrapper {
    padding: 0;
    overflow: hidden;
    border-radius: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
  .custom-map-popup .leaflet-popup-content {
    margin: 0;
    width: auto !important;
  }
  .custom-map-popup .leaflet-popup-tip-container {
    display: none;
  }
  
  /* Tooltip overrides */
  .custom-tooltip {
    background-color: white !important;
    color: #1e293b !important;
    border: none !important;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important;
    border-radius: 0.375rem !important;
    font-weight: 700 !important;
    font-size: 0.75rem !important;
    padding: 0.25rem 0.5rem !important;
    cursor: pointer !important;
  }
  
  .custom-tooltip-selected {
    background-color: #0A6C35 !important;
    color: white !important;
    border: none !important;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
    border-radius: 0.375rem !important;
    font-weight: 700 !important;
    font-size: 0.75rem !important;
    padding: 0.25rem 0.5rem !important;
    z-index: 1000 !important;
    cursor: pointer !important;
  }
  
  /* Hide the tooltip arrow/triangle */
  .custom-tooltip::before, .custom-tooltip-selected::before {
    display: none !important;
  }
`;

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createCustomIcon = (isSelected: boolean = false, label?: string, groupItems?: Array<{id: string, label: string, isSelected: boolean}>) => {
  const scale = isSelected ? 1.3 : 1;
  const pinFill = isSelected ? "#0A6C35" : "white"; // Brand green
  
  let labelHtml = '';
  
  if (groupItems && groupItems.length > 1) {
    const itemsHtml = groupItems.map(item => {
      const match = item.label.match(/\(([^)]+)\)/);
      let shortName = match ? match[1] : item.label;
      
      // Clean up common terms while preserving combinations like " + Temp"
      shortName = shortName
        .replace(/pluviometro|pluvio/gi, 'Pluviómetro')
        .replace(/viento/gi, 'Viento')
        .replace(/temperatura|temp/gi, 'Temp')
        .replace(/\s*\+\s*/g, ' + ');
      
      const isItemSel = item.isSelected;
      
      return `<button 
        class="w-full px-2 py-1.5 rounded text-[10px] whitespace-nowrap font-bold pointer-events-auto transition-colors cursor-pointer ${isItemSel ? 'bg-[#0A6C35] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} shadow-sm"
        onclick="event.stopPropagation(); this.dispatchEvent(new CustomEvent('map-marker-click', { bubbles: true, detail: '${item.id}' }))"
      >${shortName}</button>`;
    }).join('');

    labelHtml = `
      <div class="custom-tooltip-group" style="position: absolute; left: 50%; transform: translateX(-50%); top: ${44 * scale + (isSelected ? 10 : 5)}px; pointer-events: none;">
        <div class="bg-white rounded-lg shadow-md border border-slate-100 p-1.5 flex flex-col items-center gap-1.5">
          <div class="text-[10px] font-black text-slate-800 px-1 whitespace-nowrap uppercase tracking-wider">${label}</div>
          <div class="flex flex-col gap-1 w-full justify-center">
            ${itemsHtml}
          </div>
        </div>
      </div>
    `;
  } else if (label) {
    labelHtml = `
      <div class="${isSelected ? 'custom-tooltip-selected' : 'custom-tooltip'}" style="position: absolute; left: 50%; transform: translateX(-50%); top: ${44 * scale + (isSelected ? 10 : 5)}px; white-space: nowrap; text-align: center; pointer-events: auto;"
        onclick="event.stopPropagation(); this.dispatchEvent(new CustomEvent('map-marker-click', { bubbles: true, detail: '${groupItems?.[0]?.id || ''}' }))"
      >
        ${label}
      </div>
    `;
  }

  return L.divIcon({
    className: 'custom-field-icon',
    html: `
      <div style="position: relative; width: ${44 * scale}px; height: ${44 * scale}px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 ${isSelected ? 8 : 4}px ${isSelected ? 12 : 6}px rgba(${isSelected ? '10, 108, 53, 0.4' : '0,0,0,0.15'})); transition: all 0.3s ease;">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
          {/* Main Pin Shape */}
          <path d="M50 95C50 95 90 65 90 40C90 18 72 0 50 0C28 0 10 18 10 40C10 65 50 95 50 95Z" fill="${pinFill}" stroke="${isSelected ? 'white' : 'none'}" stroke-width="2" />
          
          {/* Inner Branded Circle */}
          <defs>
            <clipPath id="marker-inner-clip-${isSelected ? 'sel' : 'def'}">
              <circle cx="50" cy="40" r="32" />
            </clipPath>
          </defs>
          
          <g clip-path="url(#marker-inner-clip-${isSelected ? 'sel' : 'def'})">
            <rect x="18" y="8" width="64" height="64" fill="#0A6C35" />
            <path d="M 18 8 L 82 8 L 82 40 Q 50 20 18 36 Z" fill="#005A9C" />
            <path d="M 13 36 Q 50 20 87 36" stroke="white" stroke-width="4" fill="none" />
            <path d="M 13 54 Q 50 36 87 58" stroke="white" stroke-width="4" fill="none" />
            <path d="M 13 74 Q 50 54 87 80" stroke="white" stroke-width="4" fill="none" />
          </g>
          
          {/* Accent Border */}
          <circle cx="50" cy="40" r="34" stroke="${isSelected ? 'white' : '#0A6C35'}" stroke-width="3" fill="none" />
        </svg>
      </div>
      ${labelHtml}
    `,
    iconSize: [44 * scale, 44 * scale],
    iconAnchor: [22 * scale, 44 * scale],
    popupAnchor: [0, -40 * scale]
  });
};

interface MapProps {
  center?: [number, number];
  popupContent?: React.ReactNode;
  markers?: Array<{
    id?: string;
    position: [number, number];
    popupContent?: React.ReactNode;
    label?: string;
    isSelected?: boolean;
    isGroup?: boolean;
    groupItems?: Array<{ id: string; label: string; isSelected: boolean }>;
    onClick?: (childId?: string) => void;
  }>;
}

const ZoomHandler = () => {
  const map = useMap();
  useEffect(() => {
    map.zoomControl?.remove();
  }, [map]);
  return null;
};

const MapController = ({ markers }: { markers: any[] }) => {
  const map = useMap();
  const prevMarkersIds = React.useRef<string>('');
  const prevSelectedId = React.useRef<string | null>(null);

  useEffect(() => {
    if (!markers || markers.length === 0) return;

    // Detect if the actual set of devices changed
    const currentIds = markers.map(m => m.id).sort().join(',');
    
    if (prevMarkersIds.current !== currentIds) {
      const bounds = L.latLngBounds(markers.map(m => m.position));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      prevMarkersIds.current = currentIds;
    }

    const selectedMarker = markers.find(m => m.isSelected);
    if (selectedMarker) {
      if (prevSelectedId.current !== null && prevSelectedId.current !== selectedMarker.id) {
        const currentZoom = map.getZoom();
        map.flyTo(selectedMarker.position, currentZoom, {
          animate: true,
          duration: 1.0
        });
      }
      prevSelectedId.current = selectedMarker.id;
    }
  }, [markers, map]);
  return null;
};

const Map = ({ center = [-31.4201, -64.1888], popupContent, markers }: MapProps) => {
  useEffect(() => {
    if (markers && markers.length > 0) {
      console.log(`[MAP COMPONENT] Rendering ${markers.length} markers:`, markers.map(m => m.position));
    }
  }, [markers]);

  useEffect(() => {
    const handleMarkerClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      const id = customEvent.detail;
      const marker = markers?.find(m => m.id === id || m.groupItems?.some(g => g.id === id));
      if (marker && marker.onClick) {
        marker.onClick(id);
      }
    };
    document.addEventListener('map-marker-click', handleMarkerClick);
    return () => document.removeEventListener('map-marker-click', handleMarkerClick);
  }, [markers]);

  return (
    <>
      <style>{popupStyles}</style>
      <MapContainer 
        center={center} 
        zoom={8} 
        scrollWheelZoom={false} 
        zoomControl={false}
        keyboard={false}
        style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri'
          maxZoom={18}
          opacity={0.6}
        />
        <ZoomControl position="bottomleft" />
        <ZoomHandler />
        {markers && <MapController markers={markers} />}
        {markers ? (
          markers.map((marker, index) => {
            console.log(`[MAP COMPONENT] Marker ${index}: position=${marker.position[0]},${marker.position[1]}`);
            return (
              <Marker 
                key={`${marker.id || index}-${marker.isSelected ? 'sel' : 'unsel'}`} 
                position={marker.position} 
                icon={createCustomIcon(marker.isSelected, marker.label, marker.groupItems)}
                zIndexOffset={marker.isSelected ? 1000 : 0}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e as any);
                    if (marker.onClick) marker.onClick();
                  }
                }}
              >
                {marker.popupContent && (
                  <Popup className="custom-map-popup" minWidth={180} maxWidth={240}>
                    {marker.popupContent}
                  </Popup>
                )}
              </Marker>
            );
          })
        ) : (
          <Marker position={center} icon={createCustomIcon(false)}>
            {popupContent && (
              <Popup className="custom-map-popup" minWidth={180} maxWidth={240}>
                {popupContent}
              </Popup>
            )}
          </Marker>
        )}
      </MapContainer>
    </>
  );
};

export default Map;
