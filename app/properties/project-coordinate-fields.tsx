"use client";

import { useState } from "react";
import { CoordinateField } from "@/app/properties/coordinate-field";

type ProjectCoordinateFieldsProps = {
  initialLatitude: string;
  initialLongitude: string;
};

export function ProjectCoordinateFields({ initialLatitude, initialLongitude }: ProjectCoordinateFieldsProps) {
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const mapUrl = latitude && longitude
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
    : null;

  return (
    <div className="property-coordinate-map">
      <div className="property-coordinate-fields">
        <CoordinateField label="Latitude" name="latitude" initialValue={initialLatitude} onDecimalValueChange={setLatitude} />
        <CoordinateField label="Longitude" name="longitude" initialValue={initialLongitude} onDecimalValueChange={setLongitude} />
      </div>
      {mapUrl ? (
        <a className="property-coordinate-map-link" href={mapUrl} target="_blank" rel="noreferrer">
          Ouvrir ces coordonnées dans Google Maps
        </a>
      ) : (
        <span className="property-coordinate-map-hint">Renseigne une latitude et une longitude valides pour ouvrir Google Maps.</span>
      )}
    </div>
  );
}