/**
 * User related types
 */
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'admin' | 'analyst' | 'viewer'

/**
 * Process related types
 */
export interface Process {
  id: string
  name: string
  description?: string
  version: string
  nodes: ProcessNode[]
  edges: ProcessEdge[]
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface ProcessNode {
  id: string
  label: string
  type: 'activity' | 'gateway' | 'event'
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface ProcessEdge {
  id: string
  source: string
  target: string
  label?: string
  data: Record<string, unknown>
}

/**
 * Analysis related types
 */
export interface AnalysisResult {
  id: string
  processId: string
  type: 'performance' | 'bottleneck' | 'roi' | 'prediction'
  result: Record<string, unknown>
  createdAt: Date
}

/**
 * ROI related types
 */
export interface ROIMetrics {
  fte: number
  tco: number
  payback: number
  roi: number
  savings: number
}

/**
 * Chat message types
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

/**
 * API response types
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}
