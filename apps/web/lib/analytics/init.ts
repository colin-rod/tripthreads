/**
 * Analytics Initialization
 *
 * Sets up analytics callbacks for core package functions
 */

import { setSettlementCreatedTracker } from '@tripthreads/core'
import { trackSettlementCreated } from './events'

/**
 * Initialize analytics trackers
 * Call this once on app initialization
 */
export function initializeAnalytics() {
  // Set up settlement creation tracker
  setSettlementCreatedTracker(trackSettlementCreated)
}
