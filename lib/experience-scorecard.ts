/**
 * Experience Scorecard
 *
 * Provides a numeric score and missing checklist items for blueprint planning.
 * Helps enforce "no rushing" by requiring a minimum score before generation.
 */

import type { AppType } from './app-intelligence'

export interface BlueprintChecklist {
  appType?: AppType | null
  imagesPlanned: boolean
  animationsMapped: boolean
  routesPlanned: number
  dataModelDefined: boolean
  brandPillarsCaptured: boolean
  interactionMatrixReady: boolean
  accessibilityTargets: boolean
  performanceTargets: boolean
  stateCoverage: boolean
  dependenciesListed: boolean
}

export interface BlueprintScore {
  score: number
  tier: 'fail' | 'pass' | 'premium'
  missing: string[]
}

export function evaluateBlueprint(checklist: BlueprintChecklist): BlueprintScore {
  const weights: Record<keyof BlueprintChecklist, number> = {
    appType: 10,
    imagesPlanned: 10,
    animationsMapped: 10,
    routesPlanned: 10,
    dataModelDefined: 10,
    brandPillarsCaptured: 10,
    interactionMatrixReady: 10,
    accessibilityTargets: 10,
    performanceTargets: 10,
    stateCoverage: 5,
    dependenciesListed: 5,
  }

  let score = 0
  const missing: string[] = []

  if (!checklist.appType) {
    missing.push('App type not identified')
  } else {
    score += weights.appType
  }

  if (checklist.imagesPlanned) score += weights.imagesPlanned
  else missing.push('Images not planned')

  if (checklist.animationsMapped) score += weights.animationsMapped
  else missing.push('Animations not mapped')

  if (checklist.routesPlanned >= 2) score += weights.routesPlanned
  else missing.push('Insufficient routes')

  if (checklist.dataModelDefined) score += weights.dataModelDefined
  else missing.push('Data model incomplete')

  if (checklist.brandPillarsCaptured) score += weights.brandPillarsCaptured
  else missing.push('Brand pillars missing')

  if (checklist.interactionMatrixReady) score += weights.interactionMatrixReady
  else missing.push('Interaction/state matrix missing')

  if (checklist.accessibilityTargets) score += weights.accessibilityTargets
  else missing.push('Accessibility targets undefined')

  if (checklist.performanceTargets) score += weights.performanceTargets
  else missing.push('Performance targets undefined')

  if (checklist.stateCoverage) score += weights.stateCoverage
  else missing.push('State coverage incomplete')

  if (checklist.dependenciesListed) score += weights.dependenciesListed
  else missing.push('Dependencies not listed')

  let tier: BlueprintScore['tier'] = 'fail'
  if (score >= 90) tier = 'premium'
  else if (score >= 70) tier = 'pass'

  return { score, tier, missing }
}
