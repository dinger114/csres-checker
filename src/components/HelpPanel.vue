<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFocusTrap } from '../composables/useFocusTrap'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t, locale } = useI18n()

// 使用当前部署域名而非硬编码,适配任意部署环境
const shareBase = computed(() => window.location.origin + window.location.pathname)

const { container } = useFocusTrap(() => props.visible)

function toggleLocale() {
  locale.value = locale.value === 'en' ? 'zh-CN' : 'en'
  localStorage.setItem('csres-locale', locale.value)
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
    <div ref="container" class="modal-box terminal-box" role="dialog" aria-modal="true" :aria-label="t('header.help')" tabindex="-1">
      <div class="terminal-header">
        <span class="dot dot-r" />
        <span class="dot dot-y" />
        <span class="dot dot-g" />
        <span class="title">HELP</span>
        <button class="locale-btn" @click="toggleLocale">
          {{ locale === 'en' ? '中文' : 'EN' }}
        </button>
        <button class="close-btn" :aria-label="t('version_history.close')" @click="emit('close')">
          ×
        </button>
      </div>
      <div class="terminal-body help-body">
        <div class="help-section">
          <h3>{{ locale === 'en' ? 'Quick Start' : '快速开始' }}</h3>
          <p v-if="locale === 'en'">
            Enter standard numbers (one per line) in the input box, click <code>[ RUN ]</code> or press <code>Ctrl+Enter</code> to query.
          </p>
          <p v-else>
            在输入框中输入标准编号（每行一个），点击 <code>[ RUN ]</code> 或按 <code>Ctrl+Enter</code> 查询。
          </p>
          <pre>GB 50222-2017
50010
GB 50311-2016</pre>
          <p v-if="locale === 'en'">
            Auto-formatting: <code>GB50222</code> → <code>GB 50222</code>
          </p>
          <p v-else>
            支持自动格式化：<code>GB50222</code> → <code>GB 50222</code>
          </p>
        </div>

        <div class="help-section">
          <h3>{{ locale === 'en' ? 'Search Modes' : '搜索模式' }}</h3>
          <table>
            <thead>
              <tr><th>{{ locale === 'en' ? 'Mode' : '模式' }}</th><th>{{ locale === 'en' ? 'Description' : '说明' }}</th></tr>
            </thead>
            <tbody>
              <tr v-if="locale === 'en'">
                <td>Number Query</td><td>Exact search by standard number, multi-source fallback, batch input supported</td>
              </tr>
              <tr v-else>
                <td>编号查询</td><td>按标准编号精确查找，多数据源 fallback，支持批量输入</td>
              </tr>
              <tr v-if="locale === 'en'">
                <td>Name Search</td><td>Search by standard name keyword, data source selectable (CSSN or Chongqing local standards), sorted by priority</td>
              </tr>
              <tr v-else>
                <td>名称检索</td><td>按标准名称关键词搜索，数据源可选 CSSN（前 3 页约 60 条，按优先级排序）或重庆地标（含 PDF 预览）</td>
              </tr>
              <tr v-if="locale === 'en'">
                <td>Standard Atlas</td><td>Search building standard atlases by number or name, supports batch input and TXT import</td>
              </tr>
              <tr v-else>
                <td>标准图集</td><td>按图集编号或名称搜索国标图集，支持批量输入和 TXT 导入</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>{{ locale === 'en' ? 'Data Sources' : '数据源' }}</h3>
          <table>
            <thead>
              <tr><th>{{ locale === 'en' ? 'Source' : '数据源' }}</th><th>{{ locale === 'en' ? 'Description' : '说明' }}</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>CSSN</td><td v-if="locale === 'en'">
                  National Standard Full Text System (primary)
                </td><td v-else>
                  国家标准全文公开系统（主数据源）
                </td>
              </tr>
              <tr>
                <td>{{ locale === 'en' ? 'Standard Search' : '标准搜' }}</td><td v-if="locale === 'en'">
                  bzsou.cn (includes full text and classification)
                </td><td v-else>
                  bzsou.cn（包含全文和分类信息）
                </td>
              </tr>
              <tr>
                <td>{{ locale === 'en' ? 'Engineering' : '工程标' }}</td><td v-if="locale === 'en'">
                  ccsn.org.cn (engineering standardization)
                </td><td v-else>
                  ccsn.org.cn（工程建设标准化）
                </td>
              </tr>
              <tr>
                <td>{{ locale === 'en' ? 'Industry' : '工标库' }}</td><td v-if="locale === 'en'">
                  gongbiaoku.com (fallback)
                </td><td v-else>
                  gongbiaoku.com（备用）
                </td>
              </tr>
              <tr>
                <td>CSRes</td><td v-if="locale === 'en'">
                  csres.com (final fallback)
                </td><td v-else>
                  csres.com（兜底）
                </td>
              </tr>
              <tr>
                <td>{{ locale === 'en' ? 'Chongqing' : '重庆地标' }}</td><td v-if="locale === 'en'">
                  cq.dingyi.de (Chongqing local standards with PDF)
                </td><td v-else>
                  cq.dingyi.de（重庆地方标准，含 PDF 预览）
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>{{ locale === 'en' ? 'Keyboard Shortcuts' : '键盘快捷键' }}</h3>
          <table>
            <thead>
              <tr><th>{{ locale === 'en' ? 'Shortcut' : '快捷键' }}</th><th>{{ locale === 'en' ? 'Function' : '功能' }}</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>Ctrl+Enter</code></td><td v-if="locale === 'en'">
                  Execute query
                </td><td v-else>
                  执行查询
                </td>
              </tr>
              <tr>
                <td><code>Esc</code></td><td v-if="locale === 'en'">
                  Clear input
                </td><td v-else>
                  清空输入框
                </td>
              </tr>
              <tr>
                <td><code>Shift+←/→</code></td><td v-if="locale === 'en'">
                  Reorder columns (when header focused)
                </td><td v-else>
                  列排序（表头聚焦时）
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>{{ locale === 'en' ? 'Result Table' : '结果表格' }}</h3>
          <ul>
            <li v-if="locale === 'en'">
              <strong>Select rows:</strong> Checkboxes to select standards, click <code>[ COPY SEL ]</code> to copy selected numbers
            </li>
            <li v-else>
              <strong>勾选引用：</strong>每行前的复选框可勾选所需标准，点击 <code>[ COPY SEL ]</code> 复制勾选的标号列表
            </li>
            <li v-if="locale === 'en'">
              <strong>Column reorder:</strong> Drag headers or use Shift+Arrow keys to reorder columns
            </li>
            <li v-else>
              <strong>列拖拽排序：</strong>拖动表头或使用 Shift+方向键调整列顺序
            </li>
            <li v-if="locale === 'en'">
              <strong>Date sort:</strong> Click PUBLISHED/IMPLEMENTED headers to sort
            </li>
            <li v-else>
              <strong>日期排序：</strong>点击 PUBLISHED / IMPLEMENTED 表头可排序
            </li>
            <li v-if="locale === 'en'">
              <strong>Status filter:</strong> Click filter buttons to filter by status
            </li>
            <li v-else>
              <strong>状态筛选：</strong>点击 ALL / 现行 / 废止 / 即将实施 按钮过滤结果
            </li>
            <li v-if="locale === 'en'">
              <strong>Click to copy:</strong> Click cell text to copy to clipboard
            </li>
            <li v-else>
              <strong>点击复制：</strong>点击单元格文本可复制到剪贴板
            </li>
            <li v-if="locale === 'en'">
              <strong>Version history:</strong> Click <code>vN</code> badge to view all versions
            </li>
            <li v-else>
              <strong>版本历史：</strong>标准号旁显示 <code>vN</code> 徽章时，点击可查看所有版本
            </li>
            <li v-if="locale === 'en'">
              <strong>External links:</strong> Quick links to 筑森档案 (jzxx.vip, file download search), 道客巴巴 (doc88.com), 搜建筑 (soujianzhu.cn) for each standard
            </li>
            <li v-else>
              <strong>外链下载：</strong>每行提供筑森档案（jzxx.vip，图集/规范文件搜索）、道客巴巴（doc88.com）、搜建筑（soujianzhu.cn）快捷链接，可快速查找标准原文
            </li>
            <li v-if="locale === 'en'">
              <strong>PDF preview:</strong> Chongqing local standard results include PDF download links
            </li>
            <li v-else>
              <strong>地标预览：</strong>重庆地标数据源的结果带 PDF 下载链接，点击可查看标准原文
            </li>
          </ul>
        </div>

        <div class="help-section">
          <h3>{{ locale === 'en' ? 'Status Meanings' : '状态说明' }}</h3>
          <table>
            <thead>
              <tr><th>{{ locale === 'en' ? 'Status' : '状态' }}</th><th>{{ locale === 'en' ? 'Color' : '颜色' }}</th><th>{{ locale === 'en' ? 'Meaning' : '含义' }}</th></tr>
            </thead>
            <tbody>
              <tr v-if="locale === 'en'">
                <td>Active</td><td>Green</td><td>Standard is valid and in effect</td>
              </tr>
              <tr v-else>
                <td>现行</td><td>绿色</td><td>标准有效，正在执行</td>
              </tr>
              <tr v-if="locale === 'en'">
                <td>Replaced</td><td>Red</td><td>Replaced by newer version (click to view)</td>
              </tr>
              <tr v-else>
                <td>被代替</td><td>红色</td><td>已被新版本替代（点击可查看替代标准号）</td>
              </tr>
              <tr v-if="locale === 'en'">
                <td>Deprecated</td><td>Red</td><td>Deprecated, no longer in effect</td>
              </tr>
              <tr v-else>
                <td>废止</td><td>红色</td><td>已废止，不再执行</td>
              </tr>
              <tr v-if="locale === 'en'">
                <td>Upcoming</td><td>Yellow</td><td>Published but not yet effective</td>
              </tr>
              <tr v-else>
                <td>即将实施</td><td>黄色</td><td>已发布，尚未到实施日期</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>{{ locale === 'en' ? 'Query History' : '查询历史' }}</h3>
          <ul>
            <li v-if="locale === 'en'">
              Click <code>HIST</code> button in TERMINAL panel to view history
            </li>
            <li v-else>
              点击 TERMINAL 面板右上角 <code>HIST</code> 按钮展开历史记录
            </li>
            <li v-if="locale === 'en'">
              Last 20 queries saved automatically
            </li>
            <li v-else>
              最近 20 条查询记录自动保存
            </li>
            <li v-if="locale === 'en'">
              Click history item to restore to input
            </li>
            <li v-else>
              点击历史记录可一键回填到输入框
            </li>
          </ul>
        </div>

        <div class="help-section">
          <h3>{{ locale === 'en' ? 'Share Link' : '分享链接' }}</h3>
          <p v-if="locale === 'en'">
            Click <code>[ SHARE ]</code> to generate URL with query parameters:
          </p>
          <p v-else>
            点击 <code>[ SHARE ]</code> 按钮生成带查询参数的 URL：
          </p>
          <pre>{{ shareBase }}?q=GB+50222,JGJ+130</pre>
          <p v-if="locale === 'en'">
            Add <code>&amp;auto=1</code> to auto-execute query:
          </p>
          <p v-else>
            添加 <code>&amp;auto=1</code> 参数可自动执行查询：
          </p>
          <pre>{{ shareBase }}?q=GB+50222&amp;auto=1</pre>
        </div>

        <div class="help-section">
          <h3>{{ locale === 'en' ? 'PWA & Offline' : 'PWA 与离线' }}</h3>
          <p v-if="locale === 'en'">
            This app supports Progressive Web App (PWA). You can install it on your device for offline access. The service worker caches static assets for faster loading.
          </p>
          <p v-else>
            本应用支持 PWA（渐进式 Web 应用），可安装到设备主屏幕，支持离线访问。Service Worker 会缓存静态资源以加快加载速度。
          </p>
        </div>

        <div class="help-section">
          <h3>{{ locale === 'en' ? 'Language' : '语言设置' }}</h3>
          <p v-if="locale === 'en'">
            Click the language button (中文/EN) in the top-right corner of this help panel to switch languages. Your preference is saved locally.
          </p>
          <p v-else>
            点击本帮助面板右上角的语言按钮（中文/EN）切换语言，偏好设置会保存在本地。
          </p>
        </div>

        <div class="help-section">
          <h3>{{ locale === 'en' ? 'Mobile' : '移动端' }}</h3>
          <p v-if="locale === 'en'">
            Mobile uses tab bar to switch panels:
          </p>
          <p v-else>
            手机端采用 Tab 栏切换面板，每次只显示一个：
          </p>
          <table>
            <thead>
              <tr><th>Tab</th><th>{{ locale === 'en' ? 'Description' : '说明' }}</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>INPUT</code></td><td v-if="locale === 'en'">
                  Input panel
                </td><td v-else>
                  输入面板
                </td>
              </tr>
              <tr>
                <td><code>OUTPUT</code></td><td v-if="locale === 'en'">
                  Results table (auto-switches on query)
                </td><td v-else>
                  结果表格（查询后自动切换）
                </td>
              </tr>
              <tr>
                <td><code>LOG</code></td><td v-if="locale === 'en'">
                  Terminal log
                </td><td v-else>
                  终端日志
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-header .title {
  font-size: 14px;
  color: var(--text);
  letter-spacing: 4px;
  font-weight: 700;
}

.locale-btn {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  font-size: 10px;
  padding: 3px 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
  font-family: var(--font-mono);
  font-weight: 600;
  margin-left: auto;
}

.locale-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-box {
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.help-body {
  overflow-y: auto;
  padding: 20px !important;
}

.help-body::-webkit-scrollbar { width: 4px; height: 4px; }
.help-body::-webkit-scrollbar-track { background: transparent; }
.help-body::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 2px; }

.help-section {
  margin-bottom: 20px;
}

.help-section:last-child {
  margin-bottom: 0;
}

h3 {
  font-size: 13px;
  color: var(--primary);
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-subtle);
  font-weight: 700;
  letter-spacing: 0.5px;
}

p {
  font-size: 12px;
  color: var(--text);
  line-height: 1.6;
  margin-bottom: 8px;
}

ul, ol {
  font-size: 12px;
  color: var(--text);
  line-height: 1.8;
  padding-left: 20px;
  margin-bottom: 8px;
}

code {
  background: var(--header-bg);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--primary);
  font-family: var(--font-mono);
  border: 1px solid var(--border-subtle);
}

pre {
  background: var(--bg);
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 11px;
  overflow-x: auto;
  margin-bottom: 8px;
  border: 1px solid var(--border-subtle);
  font-family: var(--font-mono);
  color: var(--text);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-bottom: 8px;
}

th {
  background: var(--header-bg);
  color: var(--text);
  font-weight: 600;
  text-align: left;
  padding: 7px 10px;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
}

td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--border-subtle);
  white-space: normal;
  word-break: break-word;
  color: var(--text-dim);
}

tr:hover td {
  background: var(--row-hover);
}

.close-btn {
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--text-dim);
  font-size: 16px;
  cursor: pointer;
  padding: 2px 8px;
  margin-left: 8px;
  line-height: 1;
  transition: all 0.15s;
}

.close-btn:hover {
  color: var(--danger);
  border-color: var(--badge-deprecated-border);
}

@media (max-width: 768px) {
  .modal-box {
    max-height: 90vh;
  }

  .help-body {
    padding: 12px !important;
  }
}
</style>
