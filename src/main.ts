import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './locales'
import './styles/variables.css'
import './styles/app.css'

// 动态化 SEO 链接:canonical/og:url 跟随当前部署域名,不写死
const canonicalUrl = window.location.origin + window.location.pathname
document
  .querySelector('link[rel="canonical"]')
  ?.setAttribute('href', canonicalUrl)
document
  .querySelector('meta[property="og:url"]')
  ?.setAttribute('content', canonicalUrl)

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.mount('#app')
