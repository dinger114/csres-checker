import { ref } from 'vue'
import { useLogStore } from '../stores/log'
import { FIREBASE_CONFIG } from '../utils/constants'
import { errMsg } from '../utils/errors'

const globalCount = ref(0)
let appPromise: Promise<import('firebase/database').Database> | null = null

// firebase (~155 kB) is loaded lazily: only when the count is first needed
function getApp(): Promise<import('firebase/database').Database> {
  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp } = await import('firebase/app')
      const { getDatabase } = await import('firebase/database')
      return getDatabase(initializeApp(FIREBASE_CONFIG))
    })()
  }
  return appPromise
}

export function useFirebase() {
  const { add } = useLogStore()

  async function init() {
    try {
      await getApp()
    }
    catch (e) {
      add(`firebase init error: ${errMsg(e)}`, 'error')
    }
  }

  async function refreshCount() {
    try {
      const { get } = await import('firebase/database')
      const snapshot = await get(await dbRef('queryCount'))
      globalCount.value = snapshot.val() || 0
    }
    catch (e) {
      add(`firebase refreshCount error: ${errMsg(e)}`, 'error')
    }
  }

  async function incQueryCount() {
    try {
      const { runTransaction } = await import('firebase/database')
      const countRef = await dbRef('queryCount')
      await runTransaction(countRef, (current: number) => (current || 0) + 1)
      globalCount.value = (globalCount.value || 0) + 1
    }
    catch (e) {
      add(`firebase incQueryCount error: ${errMsg(e)}`, 'error')
    }
  }

  return { init, refreshCount, incQueryCount, globalCount }
}

async function dbRef(path: string) {
  const { ref } = await import('firebase/database')
  return ref(await getApp(), path)
}
