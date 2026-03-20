import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
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
`;

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createCustomIcon = () => {
  return L.divIcon({
    className: 'custom-field-icon',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
          {/* Main Pin Shape */}
          <path d="M50 95C50 95 90 65 90 40C90 18 72 0 50 0C28 0 10 18 10 40C10 65 50 95 50 95Z" fill="white" />
          
          {/* Inner Branded Circle */}
          <defs>
            <clipPath id="marker-inner-clip">
              <circle cx="50" cy="40" r="32" />
            </clipPath>
          </defs>
          
          <g clip-path="url(#marker-inner-clip)">
            <rect x="18" y="8" width="64" height="64" fill="#0A6C35" />
            <path d="M 18 8 L 82 8 L 82 40 Q 50 20 18 36 Z" fill="#005A9C" />
            <path d="M 13 36 Q 50 20 87 36" stroke="white" stroke-width="4" fill="none" />
            <path d="M 13 54 Q 50 36 87 58" stroke="white" stroke-width="4" fill="none" />
            <path d="M 13 74 Q 50 54 87 80" stroke="white" stroke-width="4" fill="none" />
          </g>
          
          {/* Accent Border */}
          <circle cx="50" cy="40" r="34" stroke="#0A6C35" stroke-width="3" fill="none" />
        </svg>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -40]
  });
};

const customFieldIcon = createCustomIcon();

interface MapProps {
  center?: [number, number];
  popupContent?: React.ReactNode;
  markers?: Array<{
    position: [number, number];
    popupContent: React.ReactNode;
  }>;
}

const ZoomHandler = () => {
  const map = useMap();
  useEffect(() => {
    map.zoomControl?.remove();
  }, [map]);
  return null;
};

const FitBounds = ({ markers }: { markers: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (markers && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => m.position));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
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
  return (
    <>
      <style>{popupStyles}</style>
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={false} 
        zoomControl={false}
        style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomleft" />
        <ZoomHandler />
        {markers && <FitBounds markers={markers} />}
        {markers ? (
          markers.map((marker, index) => {
            console.log(`[MAP COMPONENT] Marker ${index}: position=${marker.position[0]},${marker.position[1]}`);
            return (
              <Marker key={index} position={marker.position} icon={customFieldIcon}>
                {marker.popupContent && (
                  <Popup className="custom-map-popup" minWidth={180} maxWidth={240}>
                    {marker.popupContent}
                  </Popup>
                )}
              </Marker>
            );
          })
        ) : (
          <Marker position={center} icon={customFieldIcon}>
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
