import { useState } from 'react';

import type { EventLogRow, MapperUploadPreviewResponse, ProcessGraphResponse } from './services/api';
import TopBar from './components/TopBar';
import Sidebar, { type ModuleId } from './components/Sidebar';
import DataMapperModule from './components/DataMapperModule';
import ProcessExplorerModule from './components/ProcessExplorerModule';
import AIConsultantModule from './components/AIConsultantModule';
import { IconBot, IconFolder, IconWorkflow } from './components/Icons';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('datamapper');
  const [mapperResult, setMapperResult] = useState<MapperUploadPreviewResponse | null>(null);
  const [graphData, setGraphData] = useState<ProcessGraphResponse | null>(null);
  const [eventLogRows, setEventLogRows] = useState<EventLogRow[]>([]);
  const [checkedVariantIndices, setCheckedVariantIndices] = useState<Set<number>>(new Set());
  const [aiConsultantDone, setAiConsultantDone] = useState(false);

  const handleGraphGenerated = (
    graph: ProcessGraphResponse | null,
    rows: EventLogRow[],
    checkedVariants: Set<number>,
  ) => {
    setGraphData(graph);
    setEventLogRows(rows);
    setCheckedVariantIndices(checkedVariants);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', color: '#e5e7eb', fontFamily: 'sans-serif' }}>
      <TopBar />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          activeModule={activeModule}
          onSelect={setActiveModule}
          modules={[
            { id: 'datamapper', icon: <IconFolder size={16} />, label: 'DataMapper', done: mapperResult !== null },
            {
              id: 'processexplorer',
              icon: <IconWorkflow size={16} />,
              label: 'ProcessExplorer',
              done: graphData !== null,
            },
            { id: 'aiconsultant', icon: <IconBot size={16} />, label: 'AI Consultant', done: aiConsultantDone },
          ]}
        />

        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {/* All modules stay mounted so state (upload, mapping, graph, insights)
              survives switching tabs - only visibility toggles. */}
          <div style={{ display: activeModule === 'datamapper' ? 'block' : 'none' }}>
            <DataMapperModule result={mapperResult} onResult={setMapperResult} />
          </div>
          <div style={{ display: activeModule === 'processexplorer' ? 'block' : 'none' }}>
            <ProcessExplorerModule mapperResult={mapperResult} onGraphGenerated={handleGraphGenerated} />
          </div>
          <div style={{ display: activeModule === 'aiconsultant' ? 'block' : 'none' }}>
            <AIConsultantModule
              graphData={graphData}
              eventLogRows={eventLogRows}
              checkedVariantIndices={checkedVariantIndices}
              onProcessedChange={setAiConsultantDone}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
