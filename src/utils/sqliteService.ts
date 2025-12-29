/**
 * LifeRPG SQLite Service
 * 核心数据库服务统一导出
 * 
 * [重构说明]
 * 为了更好的职责分离,已将数据库服务拆分为:
 * 1. sqliteLogService - 日志服务 (食物、运动、水摄入记录)
 * 2. sqliteFoodService - 食物资料库服务 (海量食物数据)
 * 
 * 此文件保留作为向后兼容的统一导出接口
 */

export { sqliteLogService, LogEntry } from './sqliteLogService';
export { sqliteFoodService, FoodLibraryItem } from './sqliteFoodService';

// 保留旧的导出以确保向后兼容
export { sqliteLogService as sqliteService } from './sqliteLogService';
