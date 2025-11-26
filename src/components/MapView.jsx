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
 * Component to fit map bounds to waypoints and route segments
 */
function FitBounds({ waypoints, segments, routePolyline }) {
  const map = useMap();

  useEffect(() => {
    const points = [];
    
    // Add waypoint coordinates
    if (waypoints && waypoints.length > 0) {
      const geocodedWaypoints = waypoints.filter(wp => wp.lat !== 0 && wp.lng !== 0);
      geocodedWaypoints.forEach(wp => {
        points.push([wp.lat, wp.lng]);
      });
    }
    
    // Add segment polyline coordinates
    if (segments && segments.length > 0) {
      segments.forEach(segment => {
        if (segment.polyline && segment.polyline.length > 0) {
          segment.polyline.forEach(coord => {
            points.push(coord);
          });
        }
      });
    } else if (routePolyline && routePolyline.length > 0) {
      // Fallback to single polyline
      routePolyline.forEach(coord => {
        points.push(coord);
      });
    }
    
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, waypoints, segments, routePolyline]);

  return null;
}

/**
 * MapView component - Displays routes on an interactive map
 * @param {Object} props
 * @param {Array} props.waypoints - Array of waypoint objects {name, lat, lng, order, id}
 * @param {Array} props.routePolyline - Array of [lat, lng] coordinates for the route (backward compatibility)
 * @param {Array} props.segments - Array of segment objects {fromWaypointId, toWaypointId, polyline, distance, duration}
 */
export default function MapView({ waypoints = [], routePolyline = [], segments = [] }) {
  // Default center: Indian Himalayas region (around Manali)
  const defaultCenter = [32.2432, 77.1892];
  const defaultZoom = 7;

  // Color palette for segments (cycling through colors)
  const segmentColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // orange
    '#8b5cf6', // purple
    '#ef4444', // red
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16'  // lime
  ];

  // Create custom numbered marker icon
  const createNumberedIcon = (number) => {
    return L.divIcon({
      className: 'custom-numbered-marker',
      html: `<div style="
        background-color: #3b82f6;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">${number}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  };

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
        
        <FitBounds waypoints={waypoints} segments={segments} routePolyline={routePolyline} />
        
        {/* Display route segments (if available) */}
        {segments && segments.length > 0 ? (
          segments.map((segment, index) => (
            <Polyline
              key={`segment-${index}`}
              positions={segment.polyline}
              color={segmentColors[index % segmentColors.length]}
              weight={4}
              opacity={0.7}
            />
          ))
        ) : (
          /* Fallback to single polyline for backward compatibility */
          routePolyline && routePolyline.length > 0 && (
            <Polyline
              positions={routePolyline}
              color="#3b82f6"
              weight={4}
              opacity={0.7}
            />
          )
        )}

        {/* Display waypoint markers with sequence numbers */}
        {waypoints
          .filter(wp => wp.lat !== 0 && wp.lng !== 0)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((waypoint, index) => {
            const sequenceNumber = index + 1;
            return (
              <Marker
                key={waypoint.id || waypoint.order || index}
                position={[waypoint.lat, waypoint.lng]}
                icon={createNumberedIcon(sequenceNumber)}
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
            );
          })}
      </MapContainer>
    </div>
  );
}

