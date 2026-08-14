import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-4 px-4">
            <h1 className="text-3xl font-bold text-gray-900">BVD Platform</h1>
            <p className="text-gray-600">Motor analítico para análise de processos</p>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8 px-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {/* Adicione outras rotas aqui */}
          </Routes>
        </main>

        <footer className="bg-gray-800 text-white mt-12">
          <div className="max-w-7xl mx-auto py-8 px-4">
            <p>&copy; 2024 AITICOS. Todos os direitos reservados.</p>
          </div>
        </footer>
      </div>
    </Router>
  )
}

function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>
        <p className="text-gray-600">
          Bem-vindo ao BVD Platform! Comece explorando os módulos disponíveis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <ModuleCard
          title="DataMapper"
          description="Importar e mapear dados"
          icon="📊"
        />
        <ModuleCard
          title="ProcessExplorer"
          description="Visualizar processos"
          icon="🔄"
        />
        <ModuleCard
          title="AI Consultant"
          description="Chat com IA"
          icon="🤖"
        />
        <ModuleCard
          title="ROI Studio"
          description="Análise financeira"
          icon="💰"
        />
        <ModuleCard
          title="Command Center"
          description="Administração"
          icon="🔐"
        />
      </div>
    </div>
  )
}

interface ModuleCardProps {
  title: string
  description: string
  icon: string
}

function ModuleCard({ title, description, icon }: ModuleCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}

export default App
