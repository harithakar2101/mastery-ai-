import { seedSyntheticCohort, clearSyntheticCohort } from './syntheticCohortSeeder.ts';

export async function seedDemoCohort() {
  return seedSyntheticCohort();
}

export function clearDemoCohort() {
  return clearSyntheticCohort();
}
