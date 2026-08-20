import { useState } from 'react';

import type { MapperUploadPreviewResponse, ProcessGraphResponse } from './services/api';
import TopBar from './components/TopBar';
import Sidebar, { type ModuleId } from './components/Sidebar';
import DataMapperModule from './components/DataMapperModule';
import ProcessExplorerModule from './components/ProcessExplorerModule';
import AIConsultantModule from './components/AIConsultantModule';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('datamapper');
  const [mapperResult, setMapperResult] = useState<MapperUploadPreviewResponse | null>(null);
  const [graphData, setGraphData] = useState<ProcessGraphResponse | null>(null);
  const [aiConsultantDone, setAiConsultantDone] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', color: '#e5e7eb', fontFamily: 'sans-serif' }}>
      <TopBar />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          activeModule={activeModule}
          onSelect={setActiveModule}
          modules={[
            { id: 'datamapper', icon: '📁', label: 'DataMapper', done: mapperResult !== null },
            { id: 'processexplorer', icon: '🔀', label: 'ProcessExplorer', done: graphData !== null },
            { id: 'aiconsultant', icon: '🤖', label: 'AI Consultant', done: aiConsultantDone },
          ]}
        />

        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {/* All modules stay mounted so state (upload, mapping, graph, insights)
              survives switching tabs - only visibility toggles. */}
          <div style={{ display: activeModule === 'datamapper' ? 'block' : 'none' }}>
            <DataMapperModule result={mapperResult} onResult={setMapperResult} />
          </div>
          <div style={{ display: activeModule === 'processexplorer' ? 'block' : 'none' }}>
            <ProcessExplorerModule mapperResult={mapperResult} onGraphGenerated={setGraphData} />
          </div>
          <div style={{ display: activeModule === 'aiconsultant' ? 'block' : 'none' }}>
            <AIConsultantModule graphData={graphData} onProcessedChange={setAiConsultantDone} />
          </div>
        </main>
      </div>
    </div>
  );
}
