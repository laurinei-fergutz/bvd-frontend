# 💻 BVD Frontend

Experiência do usuário (UX/UI) com **React**, **Tailwind CSS** e visualização de **grafos interativos** de alta performance.

## 📋 Características

- **React 18** - Renderização rápida e moderna
- **TypeScript** - Tipagem estrita para maior segurança
- **Tailwind CSS** - Estilização utilitária e responsiva
- **React Router** - Navegação entre módulos
- **Axios** - Cliente HTTP para comunicação com backend
- **Zustand** - Gerenciamento de estado global leve
- **React Flow** - Visualização de grafos interativos (Módulo 1)
- **D3.js** - Gráficos avançados e personalizados
- **Recharts** - Dashboards financeiros e ROI (Módulo 3)
- **Drag & Drop** - Interface intuitiva (Módulo 0)

## 🏛️ Estrutura do Projeto

```
bvd-frontend/
├── public/                       # Ativos estáticos
├── src/
│   ├── assets/                   # Estilos e fontes globais
│   ├── components/               # Componentes reutilizáveis
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   ├── Card.tsx
│   │   └── Table.tsx
│   ├── features/                 # Lógica de negócio por módulo
│   │   ├── datamapper/           # Módulo 0: Drag & Drop
│   │   ├── processexplorer/      # Módulo 1: Grafos
│   │   ├── aiconsultant/         # Módulo 2: Chat IA
│   │   ├── roistudio/            # Módulo 3: Dashboards
│   │   └── commandcenter/        # Módulo 4: Admin
│   ├── hooks/                    # Custom hooks
│   ├── services/                 # Cliente API (Axios)
│   ├── store/                    # Estado global (Zustand)
│   ├── types/                    # Tipagens TypeScript
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── Dockerfile
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## 🛠️ Setup

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Instalação

1. Clone o repositório
   ```bash
   git clone https://github.com/aiticos/bvd-frontend.git
   cd bvd-frontend
   ```

2. Instale as dependências
   ```bash
   npm install
   ```

3. Configure variáveis de ambiente
   ```bash
   cp .env.example .env.local
   ```

4. Inicie o servidor de desenvolvimento
   ```bash
   npm run dev
   ```

   Acesse em `http://localhost:5173`

## 📚 Módulos

### 📊 Módulo 0: DataMapper
Interface drag & drop para submissão de arquivos (XES, CSV) com validação visual de mapeamento de colunas.

### 🔄 Módulo 1: ProcessExplorer
Visualizador de grafos interativos usando React Flow/Vis.x com nós e arestas do processo mapeado.

### 🤖 Módulo 2: AI Consultant
Painel de chat conversacional com IA, cartões de diagnóstico e recomendações em tempo real.

### 💰 Módulo 3: ROI Studio
Dashboards financeiros com velocímetros, gráficos de payback e análise de TCO/FTE.

### 🔐 Módulo 4: Command Center
Telas de administração, gestão de usuários, consumo de licenças e auditoria.

## 🚀 Build

```bash
npm run build
```

Saída em `dist/`

## 📦 Docker

```bash
docker build -t bvd-frontend .
docker run -p 80:80 bvd-frontend
```

## 🧪 Linting & Type Check

```bash
npm run lint
npm run type-check
npm run format
```

## 📄 Licença

MIT
