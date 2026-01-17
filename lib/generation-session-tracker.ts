import {
  createGenerationSession,
  getGenerationSession,
  updateGenerationSessionProgress,
  completeGenerationSession,
  cancelGenerationSession,
  type GenerationSessionRecord,
} from './generation-sessions-db'

export interface GenerationProgress {
  stage: 'analyzing' | 'generating' | 'validating' | 'installing-deps' | 'done'
  message?: string
  paths?: string[]
  filesCount?: number
  error?: string
  completionPercentage?: number
}

export class GenerationSessionTracker {
  private sessionId: string
  private projectId: string
  private userId: string

  constructor(sessionId: string, projectId: string, userId: string) {
    this.sessionId = sessionId
    this.projectId = projectId
    this.userId = userId
  }

  async initialize(sandboxId: string | null = null): Promise<GenerationSessionRecord> {
    return createGenerationSession(this.sessionId, this.projectId, this.userId, sandboxId)
  }

  async updateProgress(progress: GenerationProgress): Promise<GenerationSessionRecord | null> {
    return updateGenerationSessionProgress(this.sessionId, progress)
  }

  async complete(status: 'completed' | 'error' | 'cancelled' = 'completed'): Promise<void> {
    await completeGenerationSession(this.sessionId, status)
  }

  async cancel(): Promise<void> {
    await cancelGenerationSession(this.sessionId)
  }

  static async getSession(sessionId: string): Promise<GenerationSessionRecord | null> {
    return getGenerationSession(sessionId)
  }

  static async getProgress(sessionId: string): Promise<GenerationProgress | null> {
    const session = await getGenerationSession(sessionId)
    if (!session) return null
    return (session.progress as GenerationProgress) ?? null
  }

  static async isCancelled(sessionId: string): Promise<boolean> {
    const session = await getGenerationSession(sessionId)
    return session?.status === 'cancelled'
  }
}
