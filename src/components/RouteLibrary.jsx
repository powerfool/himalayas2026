import { useState, useEffect, useRef } from 'react';
import { getAllRoutes, deleteRoute, saveRoute } from '../utils/storage';

/**
 * RouteLibrary component - Main view showing list of saved routes
 */
export default function RouteLibrary({ onSelectRoute, onNewRoute }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importMode, setImportMode] = useState('merge'); // 'merge', 'new-only', 'replace'
  const [importFile, setImportFile] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = useRef(null);

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

  const handleExport = async () => {
    try {
      const allRoutes = await getAllRoutes();
      
      if (allRoutes.length === 0) {
        alert('No routes to export');
        return;
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        routeCount: allRoutes.length,
        routes: allRoutes
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `himalayas-routes-${timestamp}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Exported ${allRoutes.length} route(s)`);
    } catch (error) {
      console.error('Error exporting routes:', error);
      alert('Failed to export routes. Please try again.');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Read and parse file to check for conflicts
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.routes || !Array.isArray(importData.routes)) {
        alert('Invalid file format: missing routes array');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const importedRoutes = importData.routes;
      const currentRoutes = await getAllRoutes();
      const existingIds = new Set(currentRoutes.map(r => r.id));
      
      // Check for conflicts
      const hasConflicts = importedRoutes.some(route => existingIds.has(route.id));
      
      if (!hasConflicts) {
        // No conflicts - import directly without showing dialog
        await importDirectly(file, importedRoutes);
      } else {
        // Conflicts exist - show mode selection dialog
        setImportFile(file);
        setImportMode('merge'); // Reset to default
        setShowImportDialog(true);
      }
    } catch (error) {
      console.error('Error reading import file:', error);
      alert(`Failed to read file: ${error.message}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const importDirectly = async (file, importedRoutes) => {
    try {
      setLoading(true);

      // Create backup if we have existing routes
      let backupFilename = null;
      const currentRoutes = await getAllRoutes();
      if (currentRoutes.length > 0) {
        backupFilename = await createBackup();
      }

      // Import all routes (no conflicts, so just add them all)
      for (const route of importedRoutes) {
        await saveRoute(route);
      }

      // Reload routes
      const allRoutes = await getAllRoutes();
      allRoutes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setRoutes(allRoutes);
      
      // Show summary
      setImportSummary({
        mode: 'Direct import (no conflicts)',
        backupFilename,
        added: importedRoutes.length,
        updated: 0,
        skipped: 0,
        total: importedRoutes.length
      });

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error importing routes:', error);
      alert(`Failed to import routes: ${error.message}`);
      setLoading(false);
    }
  };

  const handleImportCancel = () => {
    setShowImportDialog(false);
    setImportFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createBackup = async () => {
    try {
      const allRoutes = await getAllRoutes();
      const exportData = {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        routeCount: allRoutes.length,
        routes: allRoutes,
        isBackup: true
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `backup-before-import-${timestamp}.json`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return filename;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error('Failed to create backup');
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;

    try {
      setLoading(true);
      
      // Create backup before import
      let backupFilename = null;
      const currentRoutes = await getAllRoutes();
      if (currentRoutes.length > 0) {
        backupFilename = await createBackup();
      }

      // Read and parse file
      const text = await importFile.text();
      const importData = JSON.parse(text);
      
      if (!importData.routes || !Array.isArray(importData.routes)) {
        throw new Error('Invalid file format: missing routes array');
      }

      const importedRoutes = importData.routes;
      let added = 0;
      let updated = 0;
      let skipped = 0;

      if (importMode === 'replace') {
        // Replace all: delete all existing routes, import everything
        for (const existingRoute of currentRoutes) {
          await deleteRoute(existingRoute.id);
        }
        for (const route of importedRoutes) {
          await saveRoute(route);
          added++;
        }
      } else if (importMode === 'new-only') {
        // Import only new: skip routes that already exist
        const existingIds = new Set(currentRoutes.map(r => r.id));
        for (const route of importedRoutes) {
          if (!existingIds.has(route.id)) {
            await saveRoute(route);
            added++;
          } else {
            skipped++;
          }
        }
      } else {
        // Merge (keep newer): compare timestamps
        const existingRoutesMap = new Map(currentRoutes.map(r => [r.id, r]));
        
        for (const importedRoute of importedRoutes) {
          const existing = existingRoutesMap.get(importedRoute.id);
          
          if (!existing) {
            // New route
            await saveRoute(importedRoute);
            added++;
          } else {
            // Compare timestamps
            const importedTime = new Date(importedRoute.updatedAt || importedRoute.createdAt).getTime();
            const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
            
            if (importedTime > existingTime) {
              // Imported is newer
              await saveRoute(importedRoute);
              updated++;
            } else {
              // Existing is newer or same
              skipped++;
            }
          }
        }
      }

      // Reload routes
      const allRoutes = await getAllRoutes();
      allRoutes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setRoutes(allRoutes);
      
      // Show summary
      const modeLabel = importMode === 'merge' ? 'Merge' : importMode === 'new-only' ? 'Import only new' : 'Replace all';
      setImportSummary({
        mode: modeLabel,
        backupFilename,
        added,
        updated,
        skipped,
        total: importedRoutes.length
      });

      // Close dialog
      setShowImportDialog(false);
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error importing routes:', error);
      alert(`Failed to import routes: ${error.message}`);
      setShowImportDialog(false);
      setLoading(false);
    }
  };

  const closeSummary = () => {
    setImportSummary(null);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading routes...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Himalayas Route Visualizer</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExport}
            style={{
              padding: '10px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            title="Export all routes to JSON file"
          >
            Export All
          </button>
          <button
            onClick={handleImportClick}
            style={{
              padding: '10px 16px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            title="Import routes from JSON file"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelected}
            style={{ display: 'none' }}
          />
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

      {/* Import Mode Dialog */}
      {showImportDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Import Routes</h2>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
              Choose import mode:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'start',
                padding: '12px',
                border: importMode === 'merge' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: importMode === 'merge' ? '#eff6ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={(e) => setImportMode(e.target.value)}
                  style={{ marginRight: '12px', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    Merge (keep newer) <span style={{ fontSize: '12px', color: '#6b7280' }}>DEFAULT</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Updates routes with newer versions based on timestamp
                  </div>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'start',
                padding: '12px',
                border: importMode === 'new-only' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: importMode === 'new-only' ? '#eff6ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="importMode"
                  value="new-only"
                  checked={importMode === 'new-only'}
                  onChange={(e) => setImportMode(e.target.value)}
                  style={{ marginRight: '12px', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Import only new</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Only add routes that don't exist locally
                  </div>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'start',
                padding: '12px',
                border: importMode === 'replace' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: importMode === 'replace' ? '#eff6ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value)}
                  style={{ marginRight: '12px', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#ef4444' }}>Replace all</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Clear all local routes and import everything (fresh start)
                  </div>
                </div>
              </label>
            </div>

            {routes.length > 0 && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '20px'
              }}>
                <strong>📦 Backup:</strong> A backup will be created before import
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleImportCancel}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Summary Modal */}
      {importSummary && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', color: '#10b981' }}>
              ✓ Import Completed
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                <strong>Mode:</strong> {importSummary.mode}
              </div>
              
              {importSummary.backupFilename && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  marginBottom: '12px'
                }}>
                  <strong>Backup saved:</strong><br />
                  <code style={{ fontSize: '12px' }}>{importSummary.backupFilename}</code>
                </div>
              )}

              <div style={{ fontSize: '14px', color: '#374151' }}>
                {importSummary.added > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    ✓ <strong>{importSummary.added}</strong> route{importSummary.added !== 1 ? 's' : ''} added
                  </div>
                )}
                {importSummary.updated > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    ↻ <strong>{importSummary.updated}</strong> route{importSummary.updated !== 1 ? 's' : ''} updated
                  </div>
                )}
                {importSummary.skipped > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    ⊘ <strong>{importSummary.skipped}</strong> route{importSummary.skipped !== 1 ? 's' : ''} skipped
                  </div>
                )}
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                  Total in file: <strong>{importSummary.total}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeSummary}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


