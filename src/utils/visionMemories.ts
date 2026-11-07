/**
 * 为节点分配不重复的记忆碎片标签。
 * 优先使用最具代表性的记忆碎片，其余碎片按会话随机打乱；节点数超过碎片数时循环使用并追加编号。
 * 碎片名只用《幻视任务 Vision Quest》剧中真实存在的人 / 地 / 物（v2.0.3 起删掉全部编造名），
 * 仅作粉丝向致敬，不含官方素材。
 * 人物出处（短名 → 全名）：
 * 幻视 = Vision（保罗·贝坦尼 饰）；白幻视 = White Vision；
 * 旺达 = 旺达·马克西莫夫 / 绯红女巫——按“记忆中的人物”收录（多家报道称她本人未出演本剧）；
 * 汤米 = 汤米·马克西莫夫 / Thomas Shepherd，极速者；比利 = 比利·马克西莫夫——按“记忆中的人物”
 * 收录（是否出场说法不一，不写他出演了哪集）；
 * 贾维斯 = J.A.R.V.I.S.；星期五 = F.R.I.D.A.Y.；伊迪斯 = E.D.I.T.H.；
 * 奥创 = Ultron（被困在幻视脑海里）；乔卡斯塔 = Jocasta；
 * 霍顿 = 菲尼亚斯·霍顿；卡林顿博士 = 约瑟芬·卡林顿；神力人 = 西蒙·威廉姆斯 / Wonder Man
 * （幻视的脑电波模板来源）；海沃德 = 泰勒·海沃德。
 */
export const PRIORITY_VISION_MEMORIES = [
  '幻视', // Vision
  '白幻视', // White Vision
  '旺达', // 旺达·马克西莫夫 / 绯红女巫（记忆中的人物）
  '汤米', // 汤米·马克西莫夫 / Thomas Shepherd
  '比利', // 比利·马克西莫夫（记忆中的人物）
  '贾维斯', // J.A.R.V.I.S.
  '星期五', // F.R.I.D.A.Y.
  '伊迪斯', // E.D.I.T.H.
  '奥创', // Ultron
  '乔卡斯塔', // Jocasta
] as const

export const EXTRA_VISION_MEMORIES = [
  '西景镇', // Westview
  '心灵宝石', // Mind Stone
  '六角结界', // The Hex
  '托尼·斯塔克', // Tony Stark
  '布鲁斯·班纳', // Bruce Banner
  '天剑局', // S.W.O.R.D.
  '海沃德', // 泰勒·海沃德
  '振金', // Vibranium
  '复仇者联盟', // Avengers
  '莫妮卡', // 莫妮卡·兰博
  '吉米·吴', // Jimmy Woo
  '达茜', // 达茜·刘易斯
  '皮特罗', // 皮特罗·马克西莫夫
  '阿加莎', // 阿加莎·哈克尼斯
  '帕拉丁', // Paladin
  '霍顿', // 菲尼亚斯·霍顿
  '卡林顿博士', // 约瑟芬·卡林顿
  '幻视之家', // 幻视在西景镇的家
  '混沌魔法', // Chaos Magic
  '神力人', // 西蒙·威廉姆斯 / Wonder Man
] as const

let sessionSeed: number | null = null

function getSessionSeed(): number {
  if (sessionSeed !== null)
    return sessionSeed

  const random = new Uint32Array(1)
  globalThis.crypto?.getRandomValues?.(random)
  sessionSeed = random[0] || Date.now()
  return sessionSeed
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function assignUniqueVisionMemories(nodeIds: string[]): Map<string, string> {
  const sortedNodeIds = [...new Set(nodeIds)].sort((a, b) => a.localeCompare(b))
  const extras: string[] = [...EXTRA_VISION_MEMORIES]
  const random = createRandom(getSessionSeed())

  for (let index = extras.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1))
    const current = extras[index]!
    extras[index] = extras[target]!
    extras[target] = current
  }

  const visionMemories = [...PRIORITY_VISION_MEMORIES, ...extras]

  return new Map(sortedNodeIds.map((nodeId, index) => {
    const round = Math.floor(index / visionMemories.length)
    const name = visionMemories[index % visionMemories.length]!
    return [nodeId, round > 0 ? `${name} ${round + 1}号` : name]
  }))
}
