/**
 * 食物标签定义
 */

// 标签定义接口
export interface TagDefinition {
  label: string;
  icon: string;
  desc: string;
}

const BASE_TAGS: Record<string, TagDefinition> = {
  高糖: { label: '高糖', icon: '🍬', desc: '容易导致血糖飙升' },
  高油: { label: '高油', icon: '🛢️', desc: '脂肪含量高' },
  高盐: { label: '高盐', icon: '🧂', desc: '钠含量过高' },
  高碳: { label: '高碳', icon: '🍚', desc: '碳水化合物丰富' },
  高蛋白: { label: '高蛋白', icon: '💪', desc: '增肌首选' },
  纯净: { label: '纯净', icon: '✨', desc: '无添加健康' },
  均衡: { label: '均衡', icon: '⚖️', desc: '营养比例完美' }
};

export const TAG_DEFS: Record<string, TagDefinition> = {
  ...BASE_TAGS,
  HIGH_SUGAR: BASE_TAGS.高糖,
  HIGH_FAT: BASE_TAGS.高油,
  HIGH_SODIUM: BASE_TAGS.高盐,
  HIGH_CARB: BASE_TAGS.高碳,
  HIGH_PRO: BASE_TAGS.高蛋白,
  CLEAN: BASE_TAGS.纯净,
  BALANCED: BASE_TAGS.均衡
};
