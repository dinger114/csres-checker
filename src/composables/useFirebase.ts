declare global {
  interface Window {
    firebase?: any
  }
}

import { FIREBASE_CONFIG } from '../utils/constants'

export function useFirebase() {
  function init() {
    if (window.firebase) {
      try {
        if (!window.firebase.apps.length) {
          window.firebase.initializeApp(FIREBASE_CONFIG)
        }
      } catch {
        // ignore init errors
      }
    }
  }

  async function getQueryCount(): Promise<number> {
    if (!window.firebase) return 0
    try {
      const snapshot = await window.firebase.database().ref('queryCount').once('value')
      return snapshot.val() || 0
    } catch {
      return 0
    }
  }

  async function incQueryCount() {
    if (!window.firebase) return
    try {
      const ref = window.firebase.database().ref('queryCount')
      ref.transaction((current: number) => (current || 0) + 1)
    } catch {
      // ignore
    }
  }

  return { init, getQueryCount, incQueryCount }
}
