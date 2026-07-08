<template>
  <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-box terminal-box">
      <div class="terminal-header">
        <span class="dot dot-r"></span>
        <span class="dot dot-y"></span>
        <span class="dot dot-g"></span>
        <span class="title">HELP</span>
        <button class="close-btn" @click="emit('close')">×</button>
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
          <h3>数据源</h3>
          <table>
            <thead>
              <tr><th>数据源</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr><td>CSSN</td><td>国家标准全文公开系统（主数据源）</td></tr>
              <tr><td>标准搜</td><td>bzsou.cn（包含全文和分类信息）</td></tr>
              <tr><td>工标库</td><td>gongbiaoku.com（备用）</td></tr>
              <tr><td>CSRes</td><td>csres.com（兜底）</td></tr>
            </tbody>
          </table>
          <p><strong>默认查询流程：</strong></p>
          <ol>
            <li>Tier 1：CSSN + 标准搜（并行查询，速度最快）</li>
            <li>Tier 2：工标库（Tier 1 未命中的 fallback）</li>
            <li>Tier 3：CSRes（最终兜底）</li>
          </ol>
          <p>勾选数据源复选框可指定只查询特定源。</p>
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
            <li><strong>列拖拽排序：</strong>拖动表头可调整列顺序，导出时保持新顺序</li>
            <li><strong>状态筛选：</strong>点击 ALL / 现行 / 废止 / 即将实施 按钮过滤结果</li>
            <li><strong>点击复制：</strong>点击单元格文本可复制到剪贴板</li>
            <li><strong>版本历史：</strong>标准号旁显示 <code>vN</code> 徽章时，点击可查看所有版本</li>
            <li><strong>外链：</strong>道客巴巴、搜建筑 快捷链接</li>
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
          <h3>缓存</h3>
          <ul>
            <li>查询结果自动缓存 24 小时（最多 1000 条）</li>
            <li>重复查询相同标准会直接返回缓存结果（显示 <code>cache hit</code>）</li>
            <li>点击底部 <code>CACHE:n</code> 按钮可禁用/启用缓存</li>
            <li>点击 <code>CLEAR</code> 按钮可清空缓存</li>
          </ul>
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
          <p>点击 <code>[ SHARE ]</code> 按钮生成带查询参数的 URL：</p>
          <pre>https://csres.yeye.moe/?q=GB+50222,JGJ+130</pre>
          <p>添加 <code>&auto=1</code> 参数可自动执行查询：</p>
          <pre>https://csres.yeye.moe/?q=GB+50222&auto=1</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<style scoped>
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
}

.help-body {
  overflow-y: auto;
  padding: 20px !important;
}

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
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
  color: var(--primary);
}

pre {
  background: var(--bg);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
  margin-bottom: 8px;
  border: 1px solid var(--border-subtle);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin-bottom: 8px;
}

th {
  background: var(--header-bg);
  color: var(--text-dim);
  font-weight: 600;
  text-align: left;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  font-size: 11px;
}

td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-subtle);
}

tr:hover td {
  background: var(--row-hover);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-dim);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  margin-left: 8px;
}

.close-btn:hover {
  color: var(--danger);
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
