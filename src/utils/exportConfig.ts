// 列导出配置（useXlsx / useClipboard 共用，单一数据源）
export interface ColumnExportConfig {
  label: string
  field: string
  width?: number
}

export const COLUMN_MAP: Record<string, ColumnExportConfig> = {
  query: { label: '查询词', field: 'query', width: 12 },
  standard_number: { label: '标准号', field: 'standard_number', width: 18 },
  title: { label: '名称', field: 'title', width: 40 },
  status: { label: '状态', field: 'status', width: 8 },
  publish_date: { label: '发布日期', field: 'publish_date', width: 12 },
  implement_date: { label: '实施日期', field: 'implement_date', width: 12 },
  replaced_by: { label: '替代标准', field: 'replaced_by', width: 18 },
}
