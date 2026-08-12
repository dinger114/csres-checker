// 标准编号匹配逻辑（cssn 与 bzsou 数据源共用）
export function matchStdNo(queryNorm: string, stdNorm: string): boolean {
  // 精确/包含匹配
  if (queryNorm === stdNorm || stdNorm.includes(queryNorm) || queryNorm.includes(stdNorm))
    return true
  // 前缀 + 编号匹配（如 GB50222 匹配 GB 50222-2017）
  const qPrefix = (queryNorm.match(/^[a-z/]+/i) || [''])[0]
  const sPrefix = (stdNorm.match(/^[a-z/]+/i) || [''])[0]
  const qNum = queryNorm.replace(/^[a-z/]+/i, '')
  const sNum = stdNorm.replace(/^[a-z/]+/i, '')
  if (qNum && sNum && qNum === sNum && qPrefix.slice(0, 2) === sPrefix.slice(0, 2))
    return true
  return false
}
