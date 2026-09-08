// 标准状态值集中常量(M4):避免 '现行'/'被代替'/'废止'/'作废'/'即将实施' 等魔法字符串散落多组件
export const STATUS = {
  ACTIVE: '现行',
  REPLACED: '被代替',
  DEPRECATED: '废止',
  OBSOLETE: '作废',
  UPCOMING: '即将实施',
} as const

// 被判定为「已废止/失效」的状态集合(用于徽章配色)
export const ABOLISHED_STATUSES = new Set<string>([
  STATUS.REPLACED,
  STATUS.DEPRECATED,
  STATUS.OBSOLETE,
])
