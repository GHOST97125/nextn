'use client';

import 'leaflet/dist/leaflet.css';
import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import type { ImageData } from '@/types';
import NextImage from 'next/image';

// Fix for default icon issue with Leaflet and Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

interface MapDisplayProps {
  images: ImageData[];
}

function MapUpdater({ images }: { images: ImageData[] }) {
  const map = useMap();
  React.useEffect(() => {
    const markers = images
      .map(img => (img.lat && img.lon ? [img.lat, img.lon] : null))
      .filter((coords): coords is [number, number] => coords !== null);

    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers as LatLngExpression[]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([16.265, -61.551], 10); // Default to Guadeloupe
    }
  }, [images, map]);

  return null;
}

export default function MapDisplay({ images }: MapDisplayProps) {
  const validImages = images.filter(img => img.lat !== null && img.lon !== null);

  return (
    <MapContainer center={[16.265, -61.551]} zoom={10} style={{ height: '400px', width: '100%', borderRadius: '0.5rem', zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validImages.map(image => (
        <Marker key={image.id} position={[image.lat!, image.lon!]}>
          <Popup>
            <div className="w-40 h-auto">
              <NextImage src={image.src} alt={image.panelId} width={160} height={160} className="rounded" />
              <p className="font-bold text-center mt-1">{image.panelId}</p>
            </div>
          </Popup>
        </Marker>
      ))}
      <MapUpdater images={images} />
    </MapContainer>
  );
}
