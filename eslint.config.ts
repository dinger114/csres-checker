import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  format: true,
  ignores: ['dist', 'node_modules', 'public', '.playwright-cli'],
  rules: {
    // 项目内自定义事件统一使用 kebab-case（Vue 3 合法且模板监听一致）
    'vue/custom-event-name-casing': 'off',
  },
})
