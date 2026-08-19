import { useState } from 'react';

import type { MapperUploadPreviewResponse } from './services/api';
import TopBar from './components/TopBar';
import Sidebar, { type ModuleId } from './components/Sidebar';
import DataMapperModule from './components/DataMapperModule';
import ProcessExplorerModule from './components/ProcessExplorerModule';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('datamapper');
  const [mapperResult, setMapperResult] = useState<MapperUploadPreviewResponse | null>(null);
  const [processExplorerDone, setProcessExplorerDone] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', color: '#e5e7eb', fontFamily: 'sans-serif' }}>
      <TopBar />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          activeModule={activeModule}
          onSelect={setActiveModule}
          modules={[
            { id: 'datamapper', icon: '📁', label: 'DataMapper', done: mapperResult !== null },
            { id: 'processexplorer', icon: '🔀', label: 'ProcessExplorer', done: processExplorerDone },
          ]}
        />

        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {/* Both modules stay mounted so state (upload, column picks, graph)
              survives switching tabs - only visibility toggles. */}
          <div style={{ display: activeModule === 'datamapper' ? 'block' : 'none' }}>
            <DataMapperModule result={mapperResult} onResult={setMapperResult} />
          </div>
          <div style={{ display: activeModule === 'processexplorer' ? 'block' : 'none' }}>
            <ProcessExplorerModule mapperResult={mapperResult} onProcessedChange={setProcessExplorerDone} />
          </div>
        </main>
      </div>
    </div>
  );
}
