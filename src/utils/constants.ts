export const COLUMNS = ['QUERY', 'STD NO', 'TITLE', 'STATUS', 'PUBLISHED', 'IMPLEMENTED', 'DOC88', 'SOUJZ'] as const

export const RESULT_KEYS = ['query', 'standard_number', 'title', 'status', 'publish_date', 'implement_date'] as const

export const BASE_URL = 'https://www.gongbiaoku.com/search/advance/result'

export const PROXY_LIST = [
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
