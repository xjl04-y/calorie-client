import { computed, toRaw } from 'vue';
import { useSystemStore } from '@/stores/useSystemStore';
import { useGameStore } from '@/stores/counter'; // 引入 GameStore 获取 user.race
import { useBattleStore } from '@/stores/useBattleStore';
import { showToast, showNotify } from 'vant';
import type { FoodItem } from '@/types';
import { formatRpgFoodName } from '@/utils/gameUtils'; // 引入命名工具

/**
 * 烹饪逻辑 Composable
 * 负责处理：篮子管理、套娃拦截、套餐生成
 */
export function useCooking(closeModal: () => void) {
  const systemStore = useSystemStore();
  const battleStore = useBattleStore();
  const gameStore = useGameStore(); // 获取 store 实例

  const isBuilding = computed(() => systemStore.temp.isBuilding);
  const basket = computed(() => systemStore.temp.basket);

  // 清空篮子
  const resetBasket = () => {
    systemStore.temp.basket = [];
    systemStore.temp.isBuilding = false;
    systemStore.temp.pendingItem = undefined;
  };

  // 添加食材到篮子
  const addToBasket = (item: FoodItem, quantityLog?: FoodItem) => {
    // 允许传入已调整份量的 Log，或者直接用原始 Item
    const finalItem = quantityLog || item;
    systemStore.temp.basket.push({ ...finalItem, isComposite: false });
  };

  // 移除食材
  const removeFromBasket = (idx: number) => {
    systemStore.temp.basket.splice(idx, 1);
    if (systemStore.temp.basket.length === 0) {
      systemStore.temp.isBuilding = false;
    }
  };

  // 核心：提交套餐
  const commitBasket = () => {
    if (basket.value.length === 0) return;

    // 1. 计算总数值
    const total = basket.value.reduce((acc, item) => ({
      calories: acc.calories + (Number(item.calories) || 0),
      p: acc.p + (Number(item.p) || 0),
      c: acc.c + (Number(item.c) || 0),
      f: acc.f + (Number(item.f) || 0),
      grams: acc.grams + (Number(item.grams) || 0)
    }), { calories: 0, p: 0, c: 0, f: 0, grams: 0 });

    // 2. 生成 RPG 命名或纯净命名
    const baseItem = basket.value[0];
    let mealName = `冒险者便当`;

    if (systemStore.isPureMode) {
      // 纯净模式命名逻辑
      const origin = baseItem?.originalName || baseItem?.name || '食物';
      mealName = `${origin} 等 ${basket.value.length} 样`;
    } else {
      // RPG 模式命名逻辑：基于种族动态生成
      if (baseItem) {
        // 提取核心词（去除前缀后缀）
        const originName = baseItem.originalName || baseItem.name.split('·').pop()?.split(' ')[0] || '食物';

        // 使用工具函数生成种族特色名称，作为前缀的一部分
        // 这里我们稍微自定义一下套餐的格式，让它听起来更像一道菜
        const currentRace = gameStore.user.race || 'HUMAN';
        const rpgPrefix = formatRpgFoodName('定食', currentRace, '定食').split('·')[0]; // 获取种族前缀 (如 "皇家", "蛮荒")

        mealName = `${rpgPrefix}·${originName}定食`;

        if (basket.value.length > 3) {
          mealName += ` (豪华版)`;
        } else if (basket.value.length > 1) {
          mealName += ` (双拼)`;
        }
      }
    }

    // 3. 聚合标签 & 生成配料表
    const aggregatedTags = new Set<string>();
    const ingredientsNames: string[] = [];

    basket.value.forEach(i => {
      if (i.tags) i.tags.forEach(t => aggregatedTags.add(t));
      const cleanName = i.originalName || i.name.split('·').pop()?.split(' ')[0] || i.name;
      ingredientsNames.push(cleanName);
    });

    const descTips = `包含: ${ingredientsNames.slice(0, 4).join(' + ')}${ingredientsNames.length > 4 ? ' 等' : ''}`;

    // 4. 构造最终对象
    const compositeLog: FoodItem = {
      id: Date.now(),
      name: mealName,
      originalName: mealName,
      icon: '🍱',
      ...total,
      unit: '份',
      category: 'DISH',
      isComposite: true,
      isPreset: true,
      tips: descTips,
      ingredients: JSON.parse(JSON.stringify(toRaw(basket.value))),
      tags: Array.from(aggregatedTags)
    };

    // 5. 提交
    battleStore.battleCommit(compositeLog); // 此时会触发 useBattleStore -> useLogStore

    // 6. 清理
    resetBasket();
    closeModal();
    // 纯净模式下通知文案也简化
    const successMsg = systemStore.isPureMode ? '🍱 套餐已记录' : '🍱 套餐制作完成！已存入食谱。';
    showNotify({ type: 'success', message: successMsg });
  };

  return {
    isBuilding,
    basket,
    resetBasket,
    addToBasket,
    removeFromBasket,
    commitBasket
  };
}
