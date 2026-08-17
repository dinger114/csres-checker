export const BASE_URL = 'https://www.gongbiaoku.com/search/advance/result'

export const PROXY_LIST = [
  // 本地验证用代理(需先运行: node scripts/local-proxy.mjs)。生产部署时移除首项,依赖远端 worker。
  (url: string) => `http://localhost:8787/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.dingyi.de/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api2.dingyi.de/?url=${encodeURIComponent(url)}`,
]

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'placeholder_key',
  authDomain: 'ygyg-4a6c0.firebaseapp.com',
  databaseURL: 'https://ygyg-4a6c0-default-rtdb.firebaseio.com',
  projectId: 'ygyg-4a6c0',
  storageBucket: 'ygyg-4a6c0.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000000000',
}

export const BATCH_SIZE = 2
export const BATCH_DELAY = 500
export const FETCH_RETRIES = 3
export const FETCH_TIMEOUT = 15000
