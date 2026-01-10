<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { Property } from 'csstype'
import { useGameStore } from '@/stores/counter'
import { useSystemStore } from '@/stores/useSystemStore'
import { RACE_NPCS } from '@/constants/gameData'
import { useRouter, useRoute } from 'vue-router'

const store = useGameStore()
const systemStore = useSystemStore()
const router = useRouter()
const route = useRoute()

const show = computed({
  get: () => store.modals.npcGuide,
  set: (val) => store.setModal('npcGuide', val),
})

const isPure = computed(() => systemStore.isPureMode)

// --- 🎨 UI 2.0: 健康配色主题系统 ---
// 根据模式动态返回 Tailwind 类名，实现完全不同的视觉感受
const theme = computed(() => {
  if (isPure.value) {
    return {
      // 纯净模式：Teal (蓝绿色/青色) - 代表专业、健康、冷静
      name: 'pure',
      primaryText: 'text-teal-700 dark:text-teal-400',
      secondaryText: 'text-teal-600/80 dark:text-teal-400/70',
      bgLight: 'bg-teal-50 dark:bg-teal-900/20',
      // 按钮去除了复杂的渐变，使用纯色加微投影
      btnPrimary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200/50 dark:shadow-none',
      btnGhost: 'text-slate-400 hover:text-teal-600 dark:hover:text-teal-400',
      border: 'border-teal-100 dark:border-teal-800',
      progress: 'bg-teal-500',
      spotlightBorder: 'rgba(20, 184, 166, 0.8)', // teal-500
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    }
  } else {
    return {
      // RPG 模式：Amber (琥珀色/暖橙色) - 代表活力、能量、游戏感
      name: 'rpg',
      primaryText: 'text-amber-700 dark:text-amber-400',
      secondaryText: 'text-amber-600/80 dark:text-amber-400/70',
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
      btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200/50 dark:shadow-none',
      btnGhost: 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400',
      border: 'border-amber-100 dark:border-amber-800',
      progress: 'bg-amber-500',
      spotlightBorder: 'rgba(245, 158, 11, 0.8)', // amber-500
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    }
  }
})

const npc = computed(() => {
  if (isPure.value) {
    return { name: '健康助手', title: 'System', icon: '🤖', greeting: '你好，我是你的健康助手。' }
  }
  const race = store.user.race || 'HUMAN'
  return (
    RACE_NPCS[race] ||
    RACE_NPCS.HUMAN || { name: '导师', title: '指引者', icon: '🧚', greeting: '你好！' }
  )
})

const isTransitioning = ref(false)

// --- 📝 完整引导文案 (已恢复所有步骤) ---
const guideSteps = computed(() => {
  if (isPure.value) {
    // === 纯净模式引导 (全页面覆盖) ===
    return [
      // 1. 首页概览
      {
        title: '纯净模式',
        text: `你好，${store.user.nickname}。欢迎进入「纯净数据模式」。

在这个模式下：
✅ 隐藏所有 RPG 元素（战斗、装备、技能等）
✅ 专注于高效的数据记录和分析
✅ 界面更简洁，操作更直观
✅ 适合只想记录饮食的用户

让我们快速了解一下核心功能吧！`,
        focusId: null,
        route: '/',
      },
      {
        title: '添加记录',
        text: '这是最核心的功能。点击右下角的悬浮按钮，可以随时记录饮食。\n\n我们支持三种方式：\n\n📸 AI 拍照识别（推荐）\n• 拍下食物照片，AI 自动识别\n• 自动填充营养数据，省时省力\n• 准确率高，覆盖常见食物\n\n🔍 搜索食物库\n• 手动搜索食物名称\n• 从数据库中选择匹配项\n• 适合常吃的食物快速录入\n\n✍️ 手动输入\n• 自己填写热量和营养数据\n• 适合自制食物或特殊食材\n• 完全自定义，灵活度最高',
        focusId: 'guide-global-supply',
        route: '/',
      },
      {
        title: '热量看板',
        text: '首页顶部展示了今日的核心数据：摄入热量与 BMR (基础代谢) 的对比。\n\n📊 热量进度条说明：\n🟢 90%-110% 范围 = 健康理想\n  ▫️ 摄入与消耗平衡，维持体重\n🟡 低于 90% = 可能节食过度\n  ▫️ 长期低热量可能影响代谢\n🔴 高于 110% = 热量超标\n  ▫️ 注意控制摄入，避免增重\n\n📈 营养素分布：\n下方显示了三大营养素（蛋白质/碳水化合物/脂肪）的克数和占比。\n均衡的营养配比是健康饮食的关键！',
        focusId: 'guide-monster',
        route: '/',
      },
      {
        title: '每日打卡',
        text: '这里是你的健康习惯清单。养成良好的生活习惯，比单纯控制饮食更重要！\n\n打卡项目说明：\n\n💧 饮水打卡\n• 目标：每日喝足 8 杯水（约 2000ml）\n• 作用：促进代谢，帮助排毒\n• 建议：每小时喝一杯，不要一次喝太多\n\n🥗 蔬菜打卡\n• 目标：每天吃够 500g 蔬菜\n• 作用：补充维生素，增加饱腹感\n• 建议：深色蔬菜占一半以上\n\n🏋️ 运动打卡\n• 目标：每天至少 30 分钟运动\n• 作用：消耗热量，提升代谢\n• 建议：有氧+力量结合效果更好\n\n坚持打卡 21 天，养成终身受益的健康习惯！',
        focusId: 'guide-quest-pure',
        route: '/',
      },
      {
        title: '日期导航',
        text: '点击顶部日期，可以补录过去的数据，或者查看之前的记录。\n\n🗓️ 如何使用：\n• 点击左右箭头 ← → 切换日期\n• 点击中间的日期文字打开日历\n• 选择任意日期快速跳转\n\n💡 实用技巧：\n• 漏记了昨天的早餐？随时可以补录！\n• 想查看上周的饮食情况？一键跳转\n• 支持查看和编辑历史数据\n\n数据不会因为漏记而丢失，随时补充完整即可。',
        focusId: 'guide-date',
        route: '/',
      },

      // 2. 统计页引导
      {
        title: '数据统计',
        text: '接下来，我们去看看统计报表。',
        focusId: 'tour-tab-analysis',
        route: '/',
      },
      {
        title: '多维分析',
        text: '在这里，你可以切换查看三个视图，全方位了解你的健康数据：\n\n📊 今日热量详情\n• 查看今天的摄入总量和营养分布\n• 实时跟踪热量进度\n• 了解每餐的营养构成\n\n📅 历史周报\n• 查看过去 7 天的饮食记录\n• 发现饮食规律和问题\n• 对比每日热量差异\n\n⚖️ 体重趋势\n• 跟踪体重变化曲线\n• 观察长期趋势\n• 评估饮食管理效果\n\n💡 专业建议：\n持续记录体重，能让你更直观地看到身体的变化。建议每周至少更新 2-3 次体重数据，固定时间测量更准确！',
        focusId: 'guide-analysis-header',
        route: '/analysis',
        action: () => (systemStore.analysisActiveTab = 'today'),
      },
      {
        title: '热量仪表盘',
        text: '中间的大数字显示了你今日的总热量摄入，下方的进度条显示了与 BMR（基础代谢）的对比。\n\n健康提示：\n• 进度条在 90%-110% = 完美！\n• 低于 90% = 可能需要适当增加摄入\n• 高于 110% = 注意控制热量\n\nBMR 会根据你的身高、体重、年龄自动计算。',
        focusId: 'guide-analysis-circle',
        route: '/analysis',
        action: () => (systemStore.analysisActiveTab = 'today'),
      },
      {
        title: '营养配比',
        text: '三大营养素的配比决定了你的饮食质量。下方的柱状图展示了今日三大营养素的摄入情况：\n\n🔵 蛋白质 (Protein)\n• 建议占比：20-30%\n• 主要作用：\n  ▫️ 修复和增长肌肉组织\n  ▫️ 增强饱腹感，减少饥饿\n  ▫️ 提升基础代谢率\n• 优质来源：鸡胸肉、鱼虾、豆制品、蛋类\n\n🟡 碳水化合物 (Carbs)\n• 建议占比：45-60%\n• 主要作用：\n  ▫️ 提供身体所需能量\n  ▫️ 支持大脑和神经系统运作\n• 注意事项：过多会影响血糖，选择粗粮更健康\n• 优质来源：糙米、燕麦、红薯、全麦面包\n\n🌹 脂肪 (Fat)\n• 建议占比：20-30%\n• 主要作用：\n  ▫️ 提供必需脂肪酸\n  ▫️ 帮助维生素吸收\n  ▫️ 提供饱腹感\n• 注意事项：需要控制量，选择健康脂肪\n• 优质来源：橄榄油、坚果、深海鱼、牛油果\n\n保持均衡的配比，比单纯控制热量更重要！',
        focusId: 'guide-analysis-bars',
        route: '/analysis',
        action: () => (systemStore.analysisActiveTab = 'today'),
      },
      {
        title: '历史记录',
        text: '切换到历史视图。这里记录了你过去一周的饮食情况，帮助你发现饮食规律：\n\n📊 数据状态说明：\n🟩 热量达标\n  ▫️ 热量控制在健康范围内\n  ▫️ 营养配比良好，继续保持\n\n🟧 热量超标\n  ▫️ 摄入超过目标值\n  ▫️ 需要调整饮食结构\n\n🟦 记录中\n  ▫️ 当天还在记录中\n  ▫️ 数据可能不完整\n\n💡 如何使用：\n• 点击任意一天可以查看详细记录\n• 查看当天所有吃过的食物\n• 分析超标或不足的原因\n• 对比不同日期的饮食差异\n\n长期跟踪数据，才能发现自己的饮食规律，找到最适合自己的饮食方案！',
        focusId: 'guide-weekly-stats',
        route: '/analysis',
        action: () => (systemStore.analysisActiveTab = 'week'),
      },
      {
        title: '体重趋势',
        text: '切换到体重视图。这里记录了你的体重变化曲线，是评估饮食管理效果的重要指标。\n\n📊 如何使用：\n• 点击右上角【更新体重】按钮记录新数据\n• 建议每周 2-3 次，不要每天都称重\n• 固定时间测量，数据更有参考价值\n\n⏰ 最佳测量时间：\n• 早上起床后\n• 如厕后\n• 空腹状态\n• 穿着较少的衣物\n\n💡 专业建议：\n• 体重会因为水分、食物等因素波动\n• 关注长期趋势，不要在意单次波动\n• 配合体脂率等指标更全面\n• 体重只是参考，健康才是目标\n\n定期更新体重数据，可以帮助你了解饮食管理的效果，及时调整饮食方案。',
        focusId: 'guide-weight-chart',
        route: '/analysis',
        action: () => (systemStore.analysisActiveTab = 'body'),
      },

      // 3. 个人页引导
      {
        title: '个人中心',
        text: '最后是个人设置页面。',
        focusId: 'tour-tab-profile',
        route: '/analysis',
      },
      {
        title: '身体档案',
        text: '这里管理着你的身高、体重等基础数据。\n\n📊 BMI 指数：\n• 根据身高体重自动计算\n• 18.5-24 为健康范围\n• 低于 18.5 偏瘦，高于 24 超重\n\n🔥 BMR （基础代谢）：\n• 你每天需要的基础热量\n• 根据性别、年龄、身高、体重计算\n\n点击【更新身体数据】可以修改身高、体重、年龄等信息。',
        focusId: null,
        route: '/profile',
      },
      {
        title: '设置入口',
        text: '点击右上角的【设置】图标，可以进入设置页面。\n\n你可以在设置中：\n🌙 切换深色/浅色主题\n⚖️ 调整目标热量（BMR）\n🎮 切换 RPG / 纯净模式\n☁️ 开启/关闭天气动效\n👤 修改个人资料\n\n如果你想体验 RPG 模式的游戏化功能，可以随时切换！',
        focusId: null,
        route: '/profile',
      },
      {
        title: '引导完成',
        text: '🎉 恭喜！你已经了解了纯净模式的核心功能。\n\n📋 接下来的行动计划：\n\n✅ 开始记录\n• 点击右下角悬浮按钮\n• 选择合适的记录方式\n• 每餐都及时记录\n\n✅ 养成习惯\n• 每天坚持记录饮食\n• 完成每日打卡任务\n• 保持良好的生活习惯\n\n✅ 定期跟踪\n• 每周 2-3 次更新体重\n• 查看统计报表分析数据\n• 根据数据调整饮食方案\n\n✅ 长期坚持\n• 健康管理是长期工程\n• 关注趋势而非单次数据\n• 享受健康生活带来的改变\n\n💡 温馨提示：\n如果需要重新查看引导，可以在首页右上角找到【使用帮助】按钮。\n\n祝你在健康管理的道路上一路顺风，收获理想的身体状态！🌟',
        focusId: null,
        route: '/profile',
      },
    ]
  } else {
    // === RPG 模式引导 (完整版) ===
    return [
      // === 首页篇 ===
      {
        title: '欢迎来到战场',
        text: `你好，${store.user.nickname}！我是${npc.value.name}。\n这里是你的主战场。准备好用「饮食」作为武器来征服怪物了吗？`,
        focusId: null,
        route: '/',
      },
      {
        title: '时空罗盘',
        text: '顶部是时间控制器。\n漏记了昨天的饮食？点击这里可以「穿越」回过去补录，或者查看历史战绩。\n\n左右箭头可以切换日期，点击中间的日期可以快速跳转到指定日期。',
        focusId: 'guide-date',
        route: '/',
      },
      {
        title: '战地情报',
        text: '日期下方显示了重要的战场信息：\n\n🔥 连续讨伐天数：记录你的连续登录天数\n☁️ 今日环境：每日随机的战场环境，会影响战斗效果\n\n不同的环境会带来不同的增益或减益效果。',
        focusId: 'guide-env',
        route: '/',
      },
      {
        title: '公会大厅',
        text: '每天记得来公会接取委托！\n完成「控糖」、「增肌」等悬赏任务，能获得大量经验值，这是升级最快的方式。\n\n系统每天会自动刷新任务，完成任务可获得金币和经验奖励。',
        focusId: 'guide-quest',
        route: '/',
      },
      {
        title: '天赋技能',
        text: '这里是技能树系统。\n\n每升一级，你会获得 1 点技能点（SP）。\n消耗技能点可以解锁各种被动技能，比如：\n• 提升伤害倍率\n• 增加暴击率\n• 提高金币收益等',
        focusId: 'guide-skill',
        route: '/',
      },
      {
        title: 'Boss 状态 (BMR)',
        text: '看见这个怪物了吗？它的血量 = 你的基础代谢 (BMR)。\n你需要吃够热量来击败它，但要注意——吃得太油太甜会给它回血（甚至狂暴）！\n\n底部的进度条显示了今日的战斗进度。\n完成每日目标就能击败 Boss，获得奖励！',
        focusId: 'guide-monster',
        route: '/',
      },
      {
        title: '战术提示',
        text: '注意 Boss 卡片下方的战术顾问提示。\n\n系统会根据你当前的营养摄入情况，给出实时的战术建议，比如：\n⚠️ 碳水摄入过高，注意控糖\n✅ 营养配比均衡，继续保持\n💪 蛋白质充足，肌肉恢复良好',
        focusId: null,
        route: '/',
      },
      {
        title: '饮食入口',
        text: '下方的四个卡片是你的主要补给入口：\n\n🌅 晨间补给（早餐）\n🔥 营火烹饪（午餐）\n🌙 庆功晚宴（晚餐）\n🧪 炼金药剂（零食）\n\n点击对应卡片即可记录该餐次的食物。',
        focusId: 'guide-meals',
        route: '/',
      },
      {
        title: '战斗记录',
        text: '页面底部展示了今日所有的战斗记录。\n\n每一条记录都包含：\n• 食物名称和图标\n• 热量和营养数据\n• 造成的伤害值\n• 是否触发连击/暴击等特效\n\n左滑可以删除记录，点击可以查看详情。',
        focusId: 'guide-logs',
        route: '/',
      },

      // === 战报篇 ===
      {
        title: '前往战报室',
        text: '跟我来，我们去详细分析一下你的战斗数据。\n知己知彼，百战不殆。',
        focusId: 'tour-tab-analysis',
        route: '/',
      },
      {
        title: '战术控制台',
        text: '这里是战报总览。\n点击顶部的标签卡，可以切换【今日战况】、【历史战绩】和【体态趋势】三个视图。\n\n这是分析你战斗数据的中枢系统。',
        focusId: 'guide-analysis-header',
        route: '/analysis',
        action: () => (systemStore.analysisActiveTab = 'today'),
      },
      {
        title: '今日战况 - 仪表盘',
        text: '中间的数字不是简单的卡路里，而是你对 Boss 造成的【真实伤害】。\n下方的进度条显示了 Boss 的剩余血量（距离 BMR 达标还有多远）。',
        focusId: 'guide-analysis-circle',
        route: '/analysis',
        action: () => (systemStore.analysisActiveTab = 'today'),
      },
      {
        title: '今日战况 - 营养配比',
        text: '注意下方的三色能量条，它们决定了你的攻击效果：\n🔴 蛋白质：修复护甲，提升格挡\n🟡 碳水：行动能量，过低会无力\n🟢 脂肪：储备能源，过高会滋养怪物\n\n只有三者均衡，才能打出「暴击」伤害！',
        focusId: 'guide-analysis-bars',
        route: '/analysis',
        action: () => (systemStore.analysisActiveTab = 'today'),
      },
      {
        title: '冒险编年史 (History)',
        text: '切换到周视图。这里记录了你过去 7 天的战果：\n🟩 VICTORY (大捷)：热量控制完美\n🟥 DEFEAT (失守)：暴饮暴食或节食过度\n\n点击任意一天的条目，可以查看那天的详细战斗回放。',
        focusId: 'guide-weekly-stats',
        route: '/analysis',
        action: () => (systemStore.analysisActiveTab = 'week'),
      },
      {
        title: '体态趋势 (Trend)',
        text: '切换到体态视图。这是你的「肉体塑造」曲线。\n\n记住：体重直接影响你的基础属性！\n📉 减重 = 提升【敏捷】(闪避率)\n📈 增肌 = 提升【力量】(格挡值)',
        focusId: 'guide-weight-chart',
        route: '/analysis',
        action: () => (systemStore.analysisActiveTab = 'body'),
      },

      // === 英雄篇 ===
      {
        title: '英雄档案',
        text: '最后，来看看你的个人状态面板。',
        focusId: 'tour-tab-profile',
        route: '/analysis',
      },
      {
        title: '属性与战力',
        text: '这里显示了你的核心三维：力量、敏捷、体质。\n系统会根据你的体重变化，自动重新计算这些战斗数值。\n\n💪 力量 (STR)：影响伤害输出\n🏃 敏捷 (AGI)：影响闪避和暴击\n❤️ 体质 (VIT)：影响生命值和防御',
        focusId: 'guide-profile-stats',
        route: '/profile',
      },
      {
        title: '装备系统',
        text: '达成成就会解锁稀有装备。\n在这里穿戴它们，可以获得特殊被动效果。\n\n装备槽位包括：\n• 头部、身体、腿部、背部\n• 主手武器、副手盾牌\n• 饰品\n\n点击空槽位可以装备已解锁的装备。',
        focusId: 'guide-equipment',
        route: '/profile',
      },
      {
        title: '战斗阶位',
        text: '你的综合战力（Combat Power）决定了你的战斗阶位。\n\n阶位从【无名之辈】到【神话】共9个等级。\n每个阶位都有独特的特权加成。\n\n点击阶位卡片可以查看完整的阶位系统。',
        focusId: null,
        route: '/profile',
      },

      // === 模式切换提示 ===
      {
        title: '模式切换',
        text: '如果你觉得 RPG 元素太复杂，只想安安静静记个账，\n点击左上角的【设置】，可以切换到极简的「纯净模式」。\n\n两种模式的数据完全互通，可以随时切换。',
        focusId: 'guide-settings',
        route: '/profile',
      },

      // === 补给篇 ===
      {
        title: '准备出征',
        text: '好了，特训结束。现在让我们回到战场，开始你的第一次补给吧！',
        focusId: 'tour-tab-home',
        route: '/profile',
      },
      {
        title: '悬浮补给舱',
        text: '这个悬浮按钮是你的「战术背包」。\n无论你在哪个页面，点击它即可呼叫空投补给（记录饮食）。\n\n我们支持三种方式记录饮食：\n📸 AI 拍照识别（推荐）\n🔍 搜索食物数据库\n✍️ 手动输入营养数据\n\n现在，点击它，开始你的冒险吧！',
        focusId: 'guide-global-supply',
        route: '/',
      },
      {
        title: '引导完成',
        text: '恭喜，勇士！你已经掌握了所有核心功能。\n\n记住：\n• 每日坚持记录饮食\n• 保持营养均衡\n• 完成公会任务\n• 持续提升战力\n\n祝你在健康管理的道路上一路顺风！\n如需重新查看引导，可在首页右上角找到【导师通讯】。',
        focusId: null,
        route: '/',
      },
    ]
  }
})

const currentStepIndex = computed({
  get: () => systemStore.guideCurrentStep,
  set: (v) => (systemStore.guideCurrentStep = v),
})

const currentStep = computed(() => guideSteps.value[currentStepIndex.value])

interface DialogStyle {
  bottom?: string
  top?: string
  left?: string
  right?: string
  position?: Property.Position
  transform?: string
  width?: string
  maxWidth?: string
  margin?: string
  borderRadius?: string
}

const spotlightStyle = ref({})
const dialogStyle = ref<DialogStyle>({})

// 查找元素逻辑 (增强版 - 确保移动端渲染完成)
const findElementWithRetry = async (id: string, maxRetries = 10): Promise<HTMLElement | null> => {
  let el = document.getElementById(id)
  let retries = 0
  while (!el && retries < maxRetries) {
    await new Promise((r) => setTimeout(r, 300))
    el = document.getElementById(id)
    retries++
  }
  return el
}

const updateSpotlight = async () => {
  if (!show.value) return
  isTransitioning.value = true

  // 默认底部样式 (Bottom Sheet) - 移到 try 外面确保 catch 也能访问
  const defaultBottomStyle: DialogStyle = {
    bottom: '0',
    left: '0',
    right: '0',
    position: 'fixed' as const,
    transform: 'none',
    width: '100%',
    maxWidth: '600px', // 限制最大宽度，适配 iPad/Desktop
    margin: '0 auto', // 居中
    borderRadius: '24px 24px 0 0', // 只有上面有圆角
  }

  try {
    const step = currentStep.value

    // 路由跳转
    if (step?.route && route.path !== step.route) {
      await router.push(step.route)
      await new Promise((r) => setTimeout(r, 600))
    }
    // 动作执行
    if (step?.action) {
      step.action()
      await nextTick()
      await new Promise((r) => setTimeout(r, 800))
    }

    await nextTick()

    if (!step?.focusId) {
      spotlightStyle.value = { display: 'none' }
      dialogStyle.value = defaultBottomStyle
      return
    }

    const el = await findElementWithRetry(step.focusId)

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      await new Promise((r) => setTimeout(r, 500))

      const rect = el.getBoundingClientRect()
      // 光圈稍微大一点，更宽松
      const padding = 6

      spotlightStyle.value = {
        display: 'block',
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + padding * 2}px`,
        height: `${rect.height + padding * 2}px`,
        borderRadius: '12px', // 统一圆角
      }

      // 智能判断位置：
      // 如果元素在屏幕上半部分 -> 对话框放底部
      // 如果元素在屏幕下半部分 -> 对话框放顶部
      const vh = window.innerHeight
      const isTopHalf = rect.top < vh / 2

      if (isTopHalf) {
        // 元素在上面，对话框沉底 (Bottom Sheet 风格)
        dialogStyle.value = defaultBottomStyle
      } else {
        // 元素在下面，对话框放上面 (浮窗风格)
        dialogStyle.value = {
          top: '60px', // 留出 Header 空间
          left: '16px',
          right: '16px',
          position: 'fixed',
          width: 'auto',
          maxWidth: '600px',
          margin: '0 auto',
          borderRadius: '24px', // 全圆角
        }
      }
    } else {
      spotlightStyle.value = { display: 'none' }
      dialogStyle.value = defaultBottomStyle
    }
  } catch (error) {
    console.error('Guide error:', error)
    spotlightStyle.value = { display: 'none' }
    dialogStyle.value = defaultBottomStyle // 确保出错时 dialog 也有样式
  } finally {
    isTransitioning.value = false
  }
}

const nextStep = async () => {
  if (isTransitioning.value) return
  if (currentStepIndex.value < guideSteps.value.length - 1) {
    isTransitioning.value = true
    await new Promise((r) => setTimeout(r, 200)) // 缩短等待时间，提升跟手感
    currentStepIndex.value++
  } else {
    finish()
  }
}

const prevStep = async () => {
  if (isTransitioning.value) return
  if (currentStepIndex.value > 0) {
    isTransitioning.value = true
    await new Promise((r) => setTimeout(r, 200))
    currentStepIndex.value--
  }
}

const finish = () => {
  show.value = false
  currentStepIndex.value = 0
  // [Fix] 标记引导已完成，便于签到弹窗延迟触发
  systemStore.hasCompletedGuide = true
  console.log('[🎯 NpcGuide] 引导完成，设置 hasCompletedGuide = true')
}

watch(currentStepIndex, () => updateSpotlight())
watch(show, (val) => {
  if (val) {
    currentStepIndex.value = 0
    updateSpotlight()
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => window.addEventListener('resize', updateSpotlight))
onUnmounted(() => window.removeEventListener('resize', updateSpotlight))
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[9990] font-sans">
    <!-- 1. 核心 Spotlight 光圈 -->
    <!-- 动态绑定 border-color 实现换肤 -->
    <div
      class="guide-spotlight transition-all duration-300 ease-out"
      :class="isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'"
      :style="{ ...spotlightStyle, borderColor: theme.spotlightBorder }"
    ></div>

    <!-- 2. 全屏遮罩 -->
    <!-- 降低不透明度，让应用看起来更通透 -->
    <div
      v-if="!currentStep?.focusId"
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] transition-all duration-500"
    ></div>

    <!-- 3. 交互层容器 -->
    <div
      class="fixed inset-0 pointer-events-none z-[9995] flex flex-col justify-end sm:justify-center"
    >
      <!-- Dialog Card -->
      <!-- pointer-events-auto: 恢复交互 -->
      <!-- safe-area-bottom: 适配 iPhone X -->
      <div
        class="pointer-events-auto relative w-full sm:w-[90%] sm:rounded-3xl bg-white dark:bg-slate-800 shadow-2xl transition-all duration-500 ease-out overflow-hidden flex flex-col"
        :class="[
          isTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100',
          // 移动端默认底部圆角处理，桌面端全圆角
          'rounded-t-[32px] sm:rounded-[32px]',
        ]"
        :style="dialogStyle"
      >
        <!-- 装饰背景：顶部的微弱渐变光晕，增加质感 -->
        <div
          class="absolute top-0 inset-x-0 h-32 opacity-30 pointer-events-none"
          :class="`bg-gradient-to-b from-${isPure ? 'teal' : 'amber'}-100/50 to-transparent dark:from-${isPure ? 'teal' : 'amber'}-900/20`"
        ></div>

        <!-- Header: NPC Info -->
        <div class="px-6 pt-6 flex items-center justify-between relative z-10">
          <div class="flex items-center gap-3">
            <!-- NPC Avatar Box -->
            <div
              class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-100 dark:border-slate-700"
              :class="theme.bgLight"
            >
              {{ npc.icon }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-800 dark:text-slate-100 text-lg">{{
                  npc.name
                }}</span>
                <!-- Badge -->
                <span
                  class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  :class="theme.badge"
                >
                  {{ npc.title }}
                </span>
              </div>
              <p class="text-xs text-slate-400 font-medium">
                Step {{ currentStepIndex + 1 }} / {{ guideSteps.length }}
              </p>
            </div>
          </div>

          <!-- Skip Button (Top Right) -->
          <button
            @click="finish"
            class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Content Body -->
        <div class="px-6 py-4 relative z-10 min-h-[100px]">
          <h3 class="text-xl font-bold mb-3 tracking-tight" :class="theme.primaryText">
            {{ currentStep?.title }}
          </h3>
          <p
            class="text-base leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300"
          >
            {{ currentStep?.text }}
          </p>
        </div>

        <!-- Action Footer -->
        <!-- pb-safe: 关键！适配 iPhone X 底部黑条 -->
        <!-- safe-area-bottom 样式在下方定义 -->
        <div class="px-6 pb-6 pt-2 mt-auto safe-area-bottom relative z-10">
          <div class="flex items-center gap-4">
            <!-- Prev Button -->
            <button
              v-if="currentStepIndex > 0"
              @click="prevStep"
              class="px-4 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 flex items-center"
              :class="theme.btnGhost"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              上一步
            </button>
            <div v-else class="w-20"></div>
            <!-- Spacer -->

            <!-- Next Button (Big & Clickable) -->
            <button
              @click="nextStep"
              class="flex-1 py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
              :class="theme.btnPrimary"
            >
              {{ currentStepIndex < guideSteps.length - 1 ? '下一步' : '开始体验' }}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2.5"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Slim Progress Bar -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-700">
          <div
            class="h-full transition-all duration-500 ease-out"
            :class="theme.progress"
            :style="{ width: ((currentStepIndex + 1) / guideSteps.length) * 100 + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Spotlight 核心样式
  使用 box-shadow 遮罩技术 (Ring Overlay)
*/
.guide-spotlight {
  position: absolute;
  /* 巨大的阴影作为遮罩 */
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.75);
  /* 边框在 Style 绑定中动态控制颜色，这里只定宽 */
  border-width: 4px;
  border-style: solid;
  pointer-events: none;
  z-index: 9991;
  /* 呼吸动画 */
  animation: spotlight-breathe 3s infinite ease-in-out;
}

@keyframes spotlight-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

/* iOS 底部安全区适配
  padding-bottom: env(safe-area-inset-bottom)
  为了确保在非全面屏手机上也有间距，我们使用 max()
*/
.safe-area-bottom {
  padding-bottom: max(24px, env(safe-area-inset-bottom));
}

/* 如果是极小屏幕，调整字体 */
@media (max-height: 667px) {
  .dialog-body {
    max-height: 150px;
    overflow-y: auto;
  }
}
</style>
