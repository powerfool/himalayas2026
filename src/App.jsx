import { useState } from 'react';
import RouteLibrary from './components/RouteLibrary';
import RouteEditor from './components/RouteEditor';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('library'); // 'library' or 'editor'
  const [editingRouteId, setEditingRouteId] = useState(null);

  const handleNewRoute = () => {
    setEditingRouteId(null);
    setCurrentView('editor');
  };

  const handleSelectRoute = (routeId) => {
    setEditingRouteId(routeId);
    setCurrentView('editor');
  };

  const handleSaveRoute = () => {
    // Return to library view after saving
    setCurrentView('library');
    setEditingRouteId(null);
  };

  const handleCancel = () => {
    setCurrentView('library');
    setEditingRouteId(null);
  };

  return (
    <div className="App">
      {currentView === 'library' ? (
        <RouteLibrary
          onSelectRoute={handleSelectRoute}
          onNewRoute={handleNewRoute}
        />
      ) : (
        <RouteEditor
          routeId={editingRouteId}
          onSave={handleSaveRoute}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default App;
