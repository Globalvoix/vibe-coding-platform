import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getProject } from '@/lib/projects-db'
import { listEnvVars } from '@/lib/env-vars-db'
import { CONNECTOR_DEFINITIONS, getAllConnectors, type ConnectorId } from '@/lib/connector-mapping'

interface ConnectorParams {
  id: string
}

export interface ConnectorStatus {
  id: string
  name: string
  displayName: string
  description: string
  isConfigured: boolean
  envVarKey: string
  category: 'ai-model' | 'specialized-api' | 'tool'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<ConnectorParams> }
) {
  const { id: projectId } = await params
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const project = await getProject(userId, projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const envVars = await listEnvVars(projectId)
    const configuredEnvKeys = new Set(
      envVars
        .filter(v => v.value && v.value.length > 0)
        .map(v => v.key)
    )

    const allConnectors = getAllConnectors()
    const connectors: ConnectorStatus[] = allConnectors.map(connector => ({
      id: connector.id,
      name: connector.name,
      displayName: connector.displayName,
      description: connector.description,
      envVarKey: connector.envVarKey,
      isConfigured: configuredEnvKeys.has(connector.envVarKey),
      category: connector.category
    }))

    return NextResponse.json({
      projectId,
      connectors,
      configured: connectors.filter(c => c.isConfigured),
      unconfigured: connectors.filter(c => !c.isConfigured)
    })
  } catch (error) {
    console.error('Error fetching connectors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connectors' },
      { status: 500 }
    )
  }
}
