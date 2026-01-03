/**
 * LifeRPG 游戏数据统一导出
 * 
 * 本文件作为游戏数据的统一入口，从独立模块导入并重新导出所有配置
 * 这样保持了向后兼容性，其他模块无需修改导入路径
 */

// 导入所有独立的数据模块
export { SHOP_ITEMS } from './shopItems';
export { RACE_SKILL_TREES } from './skillTrees';
export { QUEST_POOL } from './quests';
export { RACES, RACE_NPCS } from './races';
export { MONSTERS } from './monsters';
export { DEFAULT_EXERCISES } from './exercises';
export { TAG_DEFS } from './foodTags';
export { RACE_DEFAULT_FOODS } from './foods';
