<script setup lang="ts">
import { computed } from 'vue'
import { useFocusTrap } from '../composables/useFocusTrap'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

// 使用当前部署域名而非硬编码,适配任意部署环境
const shareBase = computed(() => window.location.origin + window.location.pathname)

const { container } = useFocusTrap(() => props.visible)
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
    <div ref="container" class="modal-box terminal-box" role="dialog" aria-modal="true" aria-label="使用帮助" tabindex="-1">
      <div class="terminal-header">
        <span class="dot dot-r" />
        <span class="dot dot-y" />
        <span class="dot dot-g" />
        <span class="title">HELP</span>
        <button class="close-btn" aria-label="关闭帮助" @click="emit('close')">
          ×
        </button>
      </div>
      <div class="terminal-body help-body">
        <div class="help-section">
          <h3>快速开始</h3>
          <p>在输入框中输入标准编号（每行一个），点击 <code>[ RUN ]</code> 或按 <code>Ctrl+Enter</code> 查询。</p>
          <pre>GB 50222-2017
50010
GB 50311-2016</pre>
          <p>支持自动格式化：<code>GB50222</code> → <code>GB 50222</code></p>
        </div>

        <div class="help-section">
          <h3>搜索模式</h3>
          <table>
            <thead>
              <tr><th>模式</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr><td>编号查询</td><td>按标准编号精确查找，多数据源 fallback，支持批量输入</td></tr>
              <tr><td>名称检索</td><td>按标准名称关键词搜索，数据源为 cssn.net.cn，拉取前 3 页结果（约 60 条），按国标 > 行业标准 > 地方标准 > 国际标准优先级排序。输入限制为单行。</td></tr>
              <tr><td>标准图集</td><td>按图集编号或名称搜索国标图集（ebook.chinabuilding.com.cn），返回编号/名称/状态/发布实施日期，支持批量输入和 TXT 导入。图集结果不关联地标预览列。</td></tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>数据源</h3>
          <table>
            <thead>
              <tr><th>数据源</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr><td>CSSN</td><td>国家标准全文公开系统（主数据源）</td></tr>
              <tr><td>标准搜</td><td>bzsou.cn（包含全文和分类信息）</td></tr>
              <tr><td>工程标</td><td>ccsn.org.cn（工程建设标准化，JSON 接口，代办含代替标准、批准部门）</td></tr>
              <tr><td>工标库</td><td>gongbiaoku.com（备用）</td></tr>
              <tr><td>CSRes</td><td>csres.com（兜底）</td></tr>
              <tr><td>重庆地标</td><td>cq.dingyi.de（重庆地方标准，可选数据源，含 PDF 预览）</td></tr>
            </tbody>
          </table>
          <p><strong>默认查询流程（编号查询）：</strong></p>
          <ol>
            <li>Tier 1：CSSN — 速度最快，标准化数据</li>
            <li>Tier 2：标准搜 (bzsou.cn) — Tier 1 未命中的 fallback</li>
            <li>Tier 3：工程标 (ccsn.org.cn) — 工程建设类标准，含代替关系</li>
            <li>Tier 4：工标库 (gongbiaoku.com) — 继续未命中的 fallback</li>
            <li>Tier 5：CSRes (csres.com) — 最终兜底</li>
          </ol>
          <p>重庆地标（cqdb）不在默认查询链中，需要在数据源选择中手动指定；适合查询 DBJ50 系列重庆地方标准。</p>
          <p>名称检索仅使用 CSSN 数据源，拉取前 3 页结果，自动过滤英文版标准。标准图集使用独立模式查询（ebook.chinabuilding.com.cn），不在编号查询 fallback 链中。</p>
        </div>

        <div class="help-section">
          <h3>按钮功能</h3>
          <table>
            <thead>
              <tr><th>按钮</th><th>功能</th></tr>
            </thead>
            <tbody>
              <tr><td><code>[ RUN ]</code></td><td>执行查询</td></tr>
              <tr><td><code>[ IMPORT TXT ]</code></td><td>导入 .txt 文件（也支持拖拽文件到输入框）</td></tr>
              <tr><td><code>[ COPY MD ]</code></td><td>复制 Markdown 表格到剪贴板</td></tr>
              <tr><td><code>[ EXPORT XLSX ]</code></td><td>导出 Excel 文件</td></tr>
              <tr><td><code>[ SHARE ]</code></td><td>生成分享链接（带查询参数）</td></tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>键盘快捷键</h3>
          <table>
            <thead>
              <tr><th>快捷键</th><th>功能</th></tr>
            </thead>
            <tbody>
              <tr><td><code>Ctrl+Enter</code></td><td>执行查询</td></tr>
              <tr><td><code>Esc</code></td><td>清空输入框</td></tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>结果表格</h3>
          <ul>
            <li><strong>勾选引用：</strong>每行前的复选框可勾选所需标准，点击 <code>[ COPY SEL ]</code> 复制勾选的标号列表，用于编制方案模板</li>
            <li><strong>列拖拽排序：</strong>拖动表头可调整列顺序，导出时保持新顺序</li>
            <li><strong>日期排序：</strong>点击 PUBLISHED / IMPLEMENTED 表头可排序，空白日期置底，再次点击反转顺序</li>
            <li><strong>状态筛选：</strong>点击 ALL / 现行 / 废止 / 即将实施 按钮过滤结果</li>
            <li><strong>点击复制：</strong>点击单元格文本可复制到剪贴板</li>
            <li><strong>版本历史：</strong>标准号旁显示 <code>vN</code> 徽章时，点击可查看所有版本</li>
            <li><strong>外链：</strong>道客巴巴、搜建筑 快捷链接</li>
            <li><strong>地标预览：</strong>重庆地标数据源的结果带 PDF 下载链接，点击可查看标准原文</li>
          </ul>
        </div>

        <div class="help-section">
          <h3>状态说明</h3>
          <table>
            <thead>
              <tr><th>状态</th><th>颜色</th><th>含义</th></tr>
            </thead>
            <tbody>
              <tr><td>现行</td><td>绿色</td><td>标准有效，正在执行</td></tr>
              <tr><td>被代替</td><td>红色</td><td>已被新版本替代（点击可查看替代标准号）</td></tr>
              <tr><td>废止</td><td>红色</td><td>已废止，不再执行</td></tr>
              <tr><td>即将实施</td><td>黄色</td><td>已发布，尚未到实施日期</td></tr>
            </tbody>
          </table>
        </div>

        <div class="help-section">
          <h3>查询历史</h3>
          <ul>
            <li>点击 TERMINAL 面板右上角 <code>HIST</code> 按钮展开历史记录</li>
            <li>最近 20 条查询记录自动保存</li>
            <li>点击历史记录可一键回填到输入框</li>
          </ul>
        </div>

        <div class="help-section">
          <h3>分享链接</h3>
          <p>点击 <code>[ SHARE ]</code> 按钮生成带查询参数的 URL（使用当前部署域名）：</p>
          <pre>{{ shareBase }}?q=GB+50222,JGJ+130</pre>
          <p>添加 <code>&amp;auto=1</code> 参数可自动执行查询：</p>
          <pre>{{ shareBase }}?q=GB+50222&amp;auto=1</pre>
        </div>

        <div class="help-section">
          <h3>移动端</h3>
          <p>手机端采用 Tab 栏切换面板，每次只显示一个：</p>
          <table>
            <thead>
              <tr><th>Tab</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr><td><code>$ INPUT</code></td><td>输入面板，输入标准编号或关键词</td></tr>
              <tr><td><code>> OUTPUT</code></td><td>结果表格，显示查询结果（执行查询后自动切换）</td></tr>
              <tr><td><code># LOG</code></td><td>终端日志，查看查询过程（点击 <code>← 返回</code> 退出）</td></tr>
            </tbody>
          </table>
          <p>OUTPUT 和 LOG tab 上会显示结果数量 / 日志条数的徽章。</p>
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
