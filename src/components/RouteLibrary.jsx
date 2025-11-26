import { useState, useEffect } from 'react';
import { getAllRoutes, deleteRoute } from '../utils/storage';

/**
 * RouteLibrary component - Main view showing list of saved routes
 */
export default function RouteLibrary({ onSelectRoute, onNewRoute }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load routes on mount
  useEffect(() => {
    const loadRoutesAsync = async () => {
      setLoading(true);
      const allRoutes = await getAllRoutes();
      // Sort by updated date (most recent first)
      allRoutes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setRoutes(allRoutes);
      setLoading(false);
    };
    
    loadRoutesAsync();
  }, []);

  const handleDelete = async (e, routeId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await deleteRoute(routeId);
        // Reload routes after deletion
        setLoading(true);
        const allRoutes = await getAllRoutes();
        allRoutes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setRoutes(allRoutes);
        setLoading(false);
      } catch (error) {
        console.error('Error deleting route:', error);
        alert('Failed to delete route. Please try again.');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading routes...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Himalayas Route Visualizer</h1>
        <button
          onClick={onNewRoute}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          + New Route
        </button>
      </div>

      {routes.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '8px',
          color: '#6b7280'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>No routes yet</p>
          <p>Create your first route to get started!</p>
          <button
            onClick={onNewRoute}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create First Route
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {routes.map(route => (
            <div
              key={route.id}
              onClick={() => onSelectRoute(route.id)}
              style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: 'white',
                transition: 'all 0.2s',
                ':hover': {
                  borderColor: '#3b82f6',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#111827' }}>{route.name}</h3>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                    {route.waypoints?.length || 0} waypoints
                    {route.routePolyline && route.routePolyline.length > 0 && ' • Route calculated'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    Created: {formatDate(route.createdAt)}
                    {route.updatedAt !== route.createdAt && (
                      <> • Updated: {formatDate(route.updatedAt)}</>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, route.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginLeft: '12px'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


