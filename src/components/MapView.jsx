import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * Component to fit map bounds to waypoints
 */
function FitBounds({ waypoints }) {
  const map = useMap();

  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      const geocodedWaypoints = waypoints.filter(wp => wp.lat !== 0 && wp.lng !== 0);
      if (geocodedWaypoints.length > 0) {
        const bounds = L.latLngBounds(geocodedWaypoints.map(wp => [wp.lat, wp.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [map, waypoints]);

  return null;
}

/**
 * MapView component - Displays routes on an interactive map
 * @param {Object} props
 * @param {Array} props.waypoints - Array of waypoint objects {name, lat, lng, order}
 * @param {Array} props.routePolyline - Array of [lat, lng] coordinates for the route
 * @param {string} props.routeName - Name of the route to display
 */
export default function MapView({ waypoints = [], routePolyline = [] }) {
  // Default center: Indian Himalayas region (around Manali)
  const defaultCenter = [32.2432, 77.1892];
  const defaultZoom = 7;

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds waypoints={waypoints} />
        
        {/* Display route polyline */}
        {routePolyline && routePolyline.length > 0 && (
          <Polyline
            positions={routePolyline}
            color="#3b82f6"
            weight={4}
            opacity={0.7}
          />
        )}

        {/* Display waypoint markers */}
        {waypoints
          .filter(wp => wp.lat !== 0 && wp.lng !== 0)
          .map((waypoint, index) => (
            <Marker
              key={waypoint.order || index}
              position={[waypoint.lat, waypoint.lng]}
            >
              <Popup>
                <div>
                  <strong>{waypoint.name}</strong>
                  {waypoint.display_name && waypoint.display_name !== waypoint.name && (
                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                      {waypoint.display_name}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}

