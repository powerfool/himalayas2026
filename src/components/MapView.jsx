import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistance } from '../utils/geoUtils';

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
 * @param {Array} props.segments - Array of segment objects {fromWaypointId, toWaypointId, polyline, distance}
 */
export default function MapView({ waypoints = [], routePolyline = [], segments = [] }) {
  // Default center: Indian Himalayas region (around Manali)
  const defaultCenter = [32.2432, 77.1892];
  const defaultZoom = 7;
  
  // Map view state: 'map' or 'satellite'
  const [mapView, setMapView] = useState('map');
  
  // Debug logging
  useEffect(() => {
  }, [segments, routePolyline]);

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

  // Group waypoints by position so we can show all sequence numbers at shared locations
  const positionKey = (lat, lng) => `${Number(lat).toFixed(5)}_${Number(lng).toFixed(5)}`;
  const waypointsByPosition = (() => {
    const geocoded = waypoints
      .filter(wp => wp.lat !== 0 && wp.lng !== 0)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const map = new Map();
    geocoded.forEach((wp, index) => {
      const key = positionKey(wp.lat, wp.lng);
      const seq = (wp.order !== undefined ? wp.order : index) + 1;
      if (!map.has(key)) map.set(key, { waypoints: [], numbers: [] });
      const entry = map.get(key);
      if (!entry.numbers.includes(seq)) entry.numbers.push(seq);
      entry.waypoints.push({ ...wp, sequenceNumber: seq });
    });
    return map;
  })();

  // Create custom numbered marker icon (single number or multiple numbers in a row)
  const createNumberedIcon = (numbers) => {
    const numList = Array.isArray(numbers) ? numbers : [numbers];
    const isMulti = numList.length > 1;
    const size = isMulti ? 24 : 28;
    const gap = 4;
    const totalWidth = isMulti ? numList.length * size + (numList.length - 1) * gap : size;
    const html = isMulti
      ? `<div style="display: flex; align-items: center; gap: ${gap}px; justify-content: center;">
          ${numList.map(n => `<div style="
            background-color: #3b82f6;
            color: white;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: ${size > 20 ? 12 : 14}px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">${n}</div>`).join('')}
        </div>`
      : `<div style="
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
        ">${numList[0]}</div>`;
    return L.divIcon({
      className: 'custom-numbered-marker',
      html,
      iconSize: [totalWidth, size],
      iconAnchor: [totalWidth / 2, size / 2]
    });
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Map view toggle button */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'white',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        display: 'flex',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setMapView('map')}
          style={{
            padding: '8px 12px',
            border: 'none',
            backgroundColor: mapView === 'map' ? '#3b82f6' : 'white',
            color: mapView === 'map' ? 'white' : '#374151',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: mapView === 'map' ? '600' : '400',
            transition: 'all 0.2s'
          }}
          title="Map view"
        >
          Map
        </button>
        <button
          onClick={() => setMapView('satellite')}
          style={{
            padding: '8px 12px',
            border: 'none',
            borderLeft: '1px solid #e5e7eb',
            backgroundColor: mapView === 'satellite' ? '#3b82f6' : 'white',
            color: mapView === 'satellite' ? 'white' : '#374151',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: mapView === 'satellite' ? '600' : '400',
            transition: 'all 0.2s'
          }}
          title="Satellite view"
        >
          Satellite
        </button>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {mapView === 'map' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <>
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              opacity={1}
              zIndex={1000}
            />
          </>
        )}
        
        <FitBounds waypoints={waypoints} segments={segments} routePolyline={routePolyline} />
        
        {/* Display route segments (if available) */}
        {segments && segments.length > 0 ? (
          segments.map((segment, index) => {
            // Validate segment has polyline data
            if (!segment.polyline || segment.polyline.length === 0) {
              console.warn(`Segment ${index} has no polyline data:`, segment);
              return null;
            }
            // Ensure polyline is array of [lat, lng] pairs
            const validPolyline = segment.polyline.filter(coord => 
              Array.isArray(coord) && coord.length === 2 && 
              typeof coord[0] === 'number' && typeof coord[1] === 'number'
            );
            
            if (validPolyline.length === 0) {
              console.warn(`Segment ${index} has no valid coordinates:`, segment.polyline);
              return null;
            }
            
            // Format distance for tooltip
            const distanceText = formatDistance(segment.distance);
            const tooltipContent = distanceText || (segment.distance != null ? 'Distance not available' : null);
            const segmentColor = segmentColors[index % segmentColors.length];
            
            return (
              <Polyline
                key={`segment-${index}-${segment.fromWaypointId}-${segment.toWaypointId}`}
                positions={validPolyline}
                color={segmentColor}
                weight={4}
                opacity={0.7}
                eventHandlers={{
                  mouseover: (e) => {
                    // Highlight segment on hover: increase weight and opacity
                    const polyline = e.target;
                    polyline.setStyle({
                      weight: 6,
                      opacity: 1.0
                    });
                    // Bring to front
                    polyline.bringToFront();
                  },
                  mouseout: (e) => {
                    // Restore original style
                    const polyline = e.target;
                    polyline.setStyle({
                      weight: 4,
                      opacity: 0.7
                    });
                  },
                  mousemove: (e) => {
                    // Update tooltip position to follow mouse
                    const polyline = e.target;
                    if (polyline && polyline._tooltip && e.latlng) {
                      polyline._tooltip.setLatLng(e.latlng);
                    }
                  }
                }}
              >
                {tooltipContent && (
                  <Tooltip 
                    permanent={false} 
                    direction="auto"
                    options={{ sticky: true }}
                  >
                    {tooltipContent}
                  </Tooltip>
                )}
              </Polyline>
            );
          })
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

        {/* Display waypoint markers: one per unique position, with all sequence numbers at that position */}
        {Array.from(waypointsByPosition.entries()).map(([key, { waypoints: wps, numbers }]) => {
          const first = wps[0];
          const names = [...new Set(wps.map(w => w.name))];
          return (
            <Marker
              key={key}
              position={[first.lat, first.lng]}
              icon={createNumberedIcon(numbers)}
            >
              <Popup>
                <div>
                  <strong>{names.length === 1 ? names[0] : names.join(' / ')}</strong>
                  <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                    Waypoint {numbers.length === 1 ? numbers[0] : numbers.join(' & ')}
                  </div>
                  {first.display_name && first.display_name !== first.name && (
                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                      {first.display_name}
                    </div>
                  )}
                  <div style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                    {first.lat.toFixed(4)}, {first.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

