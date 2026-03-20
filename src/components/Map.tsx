import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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
  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={true}
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
        markers.map((marker, index) => (
          <Marker key={index} position={marker.position}>
            {marker.popupContent && (
              <Popup>
                {marker.popupContent}
              </Popup>
            )}
          </Marker>
        ))
      ) : (
        <Marker position={center}>
          {popupContent && (
            <Popup>
              {popupContent}
            </Popup>
          )}
        </Marker>
      )}
    </MapContainer>
  );
};

export default Map;
