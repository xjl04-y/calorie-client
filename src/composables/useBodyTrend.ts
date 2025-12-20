import { computed } from 'vue';
import { useGameStore } from '@/stores/counter';
import { useSystemStore } from '@/stores/useSystemStore';
import type { WeightRecord, RPGTrendData, PureTrendData, TrendInsight } from '@/types';

/**
 * 体态趋势数据处理组合式函数
 * 支持 RPG 模式和纯净模式的双架构设计
 */
export function useBodyTrend() {
  const store = useGameStore();
  const systemStore = useSystemStore();
  
  const isPure = computed(() => systemStore.isPureMode);
  const user = computed(() => store.user);
  
  // 基础数据
  const weightHistory = computed(() => user.value.weightHistory || []);
  
  // 共享计算逻辑 - 所有记录（不限制数量）
  const recentRecords = computed(() => {
    return [...weightHistory.value]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });
  
  // 统计数据
  const minWeight = computed(() => {
    if (recentRecords.value.length === 0) return 0;
    return Math.min(...recentRecords.value.map(r => r.weight));
  });
  
  const maxWeight = computed(() => {
    if (recentRecords.value.length === 0) return 0;
    return Math.max(...recentRecords.value.map(r => r.weight));
  });
  
  const avgWeight = computed(() => {
    if (recentRecords.value.length === 0) return 0;
    const sum = recentRecords.value.reduce((acc, r) => acc + r.weight, 0);
    return sum / recentRecords.value.length;
  });
  
  // RPG 模式数据
  const rpgTrendData = computed((): RPGTrendData[] => {
    if (isPure.value || weightHistory.value.length === 0) return [];
    return calculateRPGTrendData(weightHistory.value);
  });
  
  // 纯净模式数据
  const pureTrendData = computed((): PureTrendData[] => {
    if (!isPure.value || weightHistory.value.length === 0) return [];
    return calculatePureTrendData(weightHistory.value);
  });
  
  // ========== 辅助计算函数 ==========
  
  /**
   * 计算 BMI 指数
   */
  function calculateBMI(weight: number, heightCm: number): number {
    if (heightCm <= 0) return 0;
    return weight / Math.pow(heightCm / 100, 2);
  }
  
  /**
   * 计算健康评分 (0-100)
   * 基于 BMI 和变化率
   */
  function calculateHealthScore(bmi: number, changeRate: number): number {
    let score = 100;
    
    // BMI 评分 (占70%)
    if (bmi < 18.5) {
      score -= (18.5 - bmi) * 10; // 过轻扣分
    } else if (bmi > 24) {
      score -= (bmi - 24) * 8; // 超重扣分
    }
    
    // 变化率评分 (占30%)
    const absChangeRate = Math.abs(changeRate);
    if (absChangeRate > 1) {
      score -= (absChangeRate - 1) * 15; // 变化过快扣分
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * 检测里程碑事件
   */
  function detectMilestones(record: WeightRecord, prev: WeightRecord | null) {
    const milestones: RPGTrendData['milestones'] = [];
    
    if (!prev) return milestones;
    
    const weightChange = record.weight - prev.weight;
    const absChange = Math.abs(weightChange);
    
    // 减重里程碑
    if (weightChange < -5) {
      milestones.push({
        type: 'WEIGHT_LOSS',
        value: absChange,
        title: `减重突破 ${absChange.toFixed(1)}kg`,
        icon: '🎉'
      });
    }
    
    // 增重里程碑
    if (weightChange > 5) {
      milestones.push({
        type: 'WEIGHT_GAIN',
        value: absChange,
        title: `增重达成 ${absChange.toFixed(1)}kg`,
        icon: '💪'
      });
    }
    
    // 体重整数突破
    if (Math.floor(prev.weight) !== Math.floor(record.weight)) {
      milestones.push({
        type: 'BREAKTHROUGH',
        value: Math.floor(record.weight),
        title: `体重突破 ${Math.floor(record.weight)}kg`,
        icon: '⚡'
      });
    }
    
    return milestones;
  }
  
  /**
   * 检查体重相关成就
   */
  function checkBodyAchievements(record: WeightRecord, allRecords: WeightRecord[]): string[] {
    const achievements: string[] = [];
    const first = allRecords[0];
    
    if (!first) return achievements;
    
    const totalChange = record.weight - first.weight;
    
    // 减重成就
    if (totalChange < -10) achievements.push('减重大师');
    if (totalChange < -20) achievements.push('蜕变之路');
    
    // 坚持记录成就
    if (allRecords.length >= 30) achievements.push('坚持30天');
    if (allRecords.length >= 90) achievements.push('坚持90天');
    
    return achievements;
  }
  
  /**
   * 生成数据洞察
   */
  function generateInsights(
    record: WeightRecord, 
    allRecords: WeightRecord[], 
    index: number
  ): TrendInsight[] {
    const insights: TrendInsight[] = [];
    
    if (index === 0) return insights;
    
    const prev = allRecords[index - 1];
    if (!prev) return insights;
    
    const weightChange = record.weight - prev.weight;
    const bmi = record.bmi || calculateBMI(record.weight, user.value.height);
    
    // 体重变化洞察
    if (weightChange > 1) {
      insights.push({
        type: 'WARNING',
        message: `体重单日增加 ${weightChange.toFixed(1)}kg，变化较快`,
        suggestions: [
          '注意控制饮食摄入',
          '增加有氧运动频率',
          '确保充足的睡眠质量'
        ]
      });
    } else if (weightChange < -1) {
      insights.push({
        type: 'WARNING',
        message: `体重单日减少 ${Math.abs(weightChange).toFixed(1)}kg，变化较快`,
        suggestions: [
          '确保摄入足够的热量',
          '避免过度节食',
          '保持均衡营养'
        ]
      });
    } else if (Math.abs(weightChange) < 0.3) {
      insights.push({
        type: 'SUCCESS',
        message: '体重保持稳定，控制良好',
        suggestions: ['继续保持当前的生活习惯']
      });
    }
    
    // BMI 洞察
    if (bmi < 18.5) {
      insights.push({
        type: 'INFO',
        message: 'BMI 偏低，建议适当增重',
        suggestions: [
          '增加优质蛋白质摄入',
          '适量增加碳水化合物',
          '进行力量训练增肌'
        ]
      });
    } else if (bmi >= 24 && bmi < 28) {
      insights.push({
        type: 'INFO',
        message: 'BMI 偏高，建议适当减重',
        suggestions: [
          '控制每日热量摄入',
          '增加有氧运动',
          '减少高脂肪食物'
        ]
      });
    } else if (bmi >= 28) {
      insights.push({
        type: 'WARNING',
        message: 'BMI 超标，建议尽快调整',
        suggestions: [
          '咨询专业营养师',
          '制定科学减重计划',
          '定期监测健康指标'
        ]
      });
    }
    
    return insights;
  }
  
  /**
   * 计算专业指标
   */
  function calculateProfessionalMetrics(
    records: WeightRecord[], 
    currentIndex: number
  ): PureTrendData['professionalMetrics'] {
    const current = records[currentIndex];
    
    // 周平均（最近7条记录）
    const weekRecords = records.slice(Math.max(0, currentIndex - 6), currentIndex + 1);
    const weeklyAverage = weekRecords.reduce((sum, r) => sum + r.weight, 0) / weekRecords.length;
    
    // 月度趋势（最近30条记录）
    const monthRecords = records.slice(Math.max(0, currentIndex - 29), currentIndex + 1);
    let monthlyTrend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    
    if (monthRecords.length >= 2) {
      const first = monthRecords[0]!;
      const last = monthRecords[monthRecords.length - 1]!;
      const diff = last.weight - first.weight;
      
      if (diff > 2) monthlyTrend = 'UP';
      else if (diff < -2) monthlyTrend = 'DOWN';
    }
    
    // 与目标体重的差距（假设目标体重为理想BMI 22对应的体重）
    const heightM = user.value.height / 100;
    const idealWeight = 22 * heightM * heightM;
    const targetDiff = current.weight - idealWeight;
    
    // 波动性指数（标准差）
    const mean = weeklyAverage;
    const variance = weekRecords.reduce((sum, r) => sum + Math.pow(r.weight - mean, 2), 0) / weekRecords.length;
    const volatility = Math.sqrt(variance);
    
    return {
      weeklyAverage: parseFloat(weeklyAverage.toFixed(1)),
      monthlyTrend,
      targetDiff: parseFloat(targetDiff.toFixed(1)),
      volatility: parseFloat(volatility.toFixed(2))
    };
  }
  
  // ========== 核心计算函数 ==========
  
  /**
   * 计算 RPG 模式的体态趋势数据
   */
  function calculateRPGTrendData(records: WeightRecord[]): RPGTrendData[] {
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted.map((record, index) => {
      const prev = index > 0 ? sorted[index - 1] : null;
      const weightChange = prev ? record.weight - prev.weight : 0;
      
      // 属性变化计算（简化版）
      const attributeChanges = {
        str: Math.round(weightChange * 2),      // 增重 = 力量提升
        agi: Math.round(-weightChange * 1.5),   // 减重 = 敏捷提升
        vit: Math.round(Math.abs(weightChange) * 0.8) // 体重变化 = 体质变化
      };
      
      // 战力变化（基于属性变化）
      const combatPowerChange = attributeChanges.str + attributeChanges.agi + attributeChanges.vit;
      
      // 检测里程碑
      const milestones = detectMilestones(record, prev);
      
      // 检测成就
      const achievements = checkBodyAchievements(record, sorted.slice(0, index + 1));
      
      // 故事节点（根据体重变化幅度）
      let storyNode: string | undefined;
      if (weightChange < -3) {
        storyNode = '你的身体变得更加轻盈，敏捷属性显著提升！';
      } else if (weightChange > 3) {
        storyNode = '肌肉变得更加结实，力量属性大幅增长！';
      }
      
      return {
        ...record,
        combatPowerChange,
        attributeChanges,
        achievements: achievements.length > 0 ? achievements : undefined,
        milestones: milestones.length > 0 ? milestones : undefined,
        storyNode
      };
    });
  }
  
  /**
   * 计算纯净模式的体态趋势数据
   */
  function calculatePureTrendData(records: WeightRecord[]): PureTrendData[] {
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted.map((record, index) => {
      const height = user.value.height;
      const bmi = record.bmi || calculateBMI(record.weight, height);
      
      // 计算变化率（kg/周）
      const weekAgo = index >= 7 ? sorted[index - 7] : null;
      const changeRate = weekAgo 
        ? (record.weight - weekAgo.weight) / 7
        : 0;
      
      // 计算健康评分
      const healthScore = calculateHealthScore(bmi, changeRate);
      
      // 生成数据洞察
      const insights = generateInsights(record, sorted, index);
      
      // 专业指标
      const professionalMetrics = calculateProfessionalMetrics(sorted, index);
      
      return {
        ...record,
        bmi: parseFloat(bmi.toFixed(1)),
        changeRate: parseFloat(changeRate.toFixed(3)),
        healthScore,
        insights: insights.length > 0 ? insights : undefined,
        professionalMetrics
      };
    });
  }
  
  return {
    // 状态
    isPure,
    weightHistory,
    recentRecords,
    
    // 统计
    minWeight,
    maxWeight,
    avgWeight,
    
    // 模式数据
    rpgTrendData,
    pureTrendData,
    
    // 工具函数
    calculateBMI,
    calculateHealthScore
  };
}
