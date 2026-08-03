/**
 * Shared TypeScript contracts for PremSight.
 * Domain types (fixtures, standings, etc.) will be added here when specified.
 */

export type HealthStatus = 'ok' | 'degraded' | 'error';

export interface HealthResponse {
  status: HealthStatus;
  service: string;
}
