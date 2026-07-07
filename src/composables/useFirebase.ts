import { ref } from 'vue'
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getDatabase, ref as dbRef, runTransaction, get } from 'firebase/database'
import { FIREBASE_CONFIG } from '../utils/constants'

const globalCount = ref(0)
let app: FirebaseApp | null = null
let db: ReturnType<typeof getDatabase> | null = null

function getApp() {
  if (!app) {
    app = initializeApp(FIREBASE_CONFIG)
    db = getDatabase(app)
  }
  return db!
}

export function useFirebase() {
  function init() {
    try {
      getApp()
    } catch {
      // ignore init errors
    }
  }

  async function refreshCount() {
    try {
      const database = getApp()
      const snapshot = await get(dbRef(database, 'queryCount'))
      globalCount.value = snapshot.val() || 0
    } catch {
      // ignore
    }
  }

  async function incQueryCount() {
    try {
      const database = getApp()
      const countRef = dbRef(database, 'queryCount')
      await runTransaction(countRef, (current: number) => (current || 0) + 1)
      globalCount.value = (globalCount.value || 0) + 1
    } catch {
      // ignore
    }
  }

  return { init, refreshCount, incQueryCount, globalCount }
}
