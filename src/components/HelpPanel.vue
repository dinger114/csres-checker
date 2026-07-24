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
          <h3>搜索模式</h3>
          <table>
            <thead>
              <tr><th>模式</th><th>说明</th></tr>
            </thead>
            <tbody>
              <tr><td>编号查询</td><td>按标准编号精确查找，多数据源 fallback，支持批量输入</td></tr>
              <tr><td>名称检索</td><td>按标准名称关键词搜索，数据源为 cssn.net.cn，拉取前 3 页结果（约 60 条），按国标 > 行业标准 > 地方标准 > 国际标准优先级排序。输入限制为单行。</td></tr>
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
              <tr><td>工标库</td><td>gongbiaoku.com（备用）</td></tr>
              <tr><td>CSRes</td><td>csres.com（兜底）</td></tr>
            </tbody>
          </table>
          <p><strong>默认查询流程（编号查询）：</strong></p>
          <ol>
            <li>Tier 1：CSSN — 速度最快，标准化数据</li>
            <li>Tier 2：标准搜 (bzsou.cn) — Tier 1 未命中的 fallback</li>
            <li>Tier 3：工标库 (gongbiaoku.com) — 继续未命中的 fallback</li>
            <li>Tier 4：CSRes (csres.com) — 最终兜底</li>
          </ol>
          <p>名称检索仅使用 CSSN 数据源，拉取前 3 页结果，自动过滤英文版标准。</p>
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
          <p>点击 <code>[ SHARE ]</code> 按钮生成带查询参数的 URL：</p>
          <pre>https://csres.yeye.moe/?q=GB+50222,JGJ+130</pre>
          <p>添加 <code>&auto=1</code> 参数可自动执行查询：</p>
          <pre>https://csres.yeye.moe/?q=GB+50222&auto=1</pre>
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
