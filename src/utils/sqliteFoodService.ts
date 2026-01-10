/**
 * LifeRPG SQLite 食物资料库服务
 * 负责海量食物数据的存储与搜索
 */

import { Capacitor } from '@capacitor/core'
import { getInitialFoods } from '@/utils/foodDataMapper'
import type { FoodItem } from '@/types'

// 资料库条目接口
export interface FoodLibraryItem {
  id: string
  type: string // 'food'
  category: string // 'HUMAN', 'ORC', 'ELF', 'DWARF'
  name: string // 食物名称,用于搜索
  json_data: Record<string, unknown> // 完整食物数据
}

class SqliteFoodService {
  private dbConnection: unknown = null
  private isNative: boolean = false
  private dbName: string = 'liferpg_db' // 使用统一的数据库名称
  private isOpen: boolean = false
  private webFallbackDB: IDBDatabase | null = null
  private isInitialized: boolean = false // 标记是否已初始化食物数据

  constructor() {
    this.isNative = Capacitor.isNativePlatform()
  }

  async init(): Promise<void> {
    if (this.isOpen) return

    if (this.isNative) {
      await this.initNativeConnection()
    } else {
      console.log('[FoodService] Running in Web Mode. Using IndexedDB as fallback.')
      await this.initWebFallback()
    }
    this.isOpen = true
  }

  // --- Native SQLite Implementation ---

  private async initNativeConnection() {
    try {
      console.log('[FoodService] Initializing Native SQLite Connection...')
      // 真实环境下的初始化代码 (需要安装插件后取消注释)
      /*
      const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
      const sqlite = new SQLiteConnection(CapacitorSQLite);
      this.dbConnection = await sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
      await this.dbConnection.open();
      await this.createTablesNative();
      */
    } catch (e) {
      console.error('[FoodService] SQLite Native Init Failed:', e)
      throw e
    }
  }

  private async createTablesNative() {
    // schemaLibrary will be used when native plugin is enabled
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const schemaLibrary = `
      CREATE TABLE IF NOT EXISTS library (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        category TEXT,
        name TEXT NOT NULL,
        json_data TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_lib_type ON library(type);
      CREATE INDEX IF NOT EXISTS idx_lib_category ON library(category);
      CREATE INDEX IF NOT EXISTS idx_lib_name ON library(name);
    `

    // 执行建表 (真实环境取消注释)
    // if (this.dbConnection) {
    //   await this.dbConnection.execute(schemaLibrary);
    // }
  }

  // --- Web Fallback Implementation (IndexedDB) ---

  private async initWebFallback() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2) // 版本2，包含两个表

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Logs Store (日志表)
        if (!db.objectStoreNames.contains('logs')) {
          const store = db.createObjectStore('logs', { keyPath: 'id' })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('date', 'date', { unique: false })
        }

        // Library Store (食物表)
        if (!db.objectStoreNames.contains('library')) {
          const store = db.createObjectStore('library', { keyPath: 'id' })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('category', 'category', { unique: false })
          store.createIndex('name', 'name', { unique: false }) // 用于搜索
        }
      }

      request.onsuccess = (event) => {
        this.webFallbackDB = (event.target as IDBOpenDBRequest).result
        resolve()
      }

      request.onerror = (event) => reject(event)
    })
  }

  // --- 食物库初始化方法 ---

  /**
   * 初始化食物数据库
   * @param force 是否强制重新初始化
   */
  async initializeFoodData(force = false): Promise<void> {
    await this.init()

    // 如果已经初始化过，且不强制重新初始化，则跳过
    if (this.isInitialized && !force) {
      console.log('[FoodService] 食物数据已初始化，跳过')
      return
    }

    console.log('[FoodService] 开始初始化食物数据...')
    const startTime = Date.now()

    // 从新的 JSON 文件获取食物数据
    const foodsFromJson: FoodItem[] = getInitialFoods()
    console.log(`[FoodService] 从 JSON 加载 ${foodsFromJson.length} 条食物数据`)

    // 转换为 FoodLibraryItem 格式
    const allFoods: FoodLibraryItem[] = foodsFromJson.map((food: FoodItem) => {
      return {
        id: String(food.id),
        type: 'food',
        category: 'COMMON', // 通用分类，不再按种族分类
        name: food.name,
        json_data: food as unknown as Record<string, unknown>,
      }
    })

    console.log(`[FoodService] 准备导入 ${allFoods.length} 条食物数据`)

    // 批量导入
    await this.importLibraryItems(allFoods)

    const elapsed = Date.now() - startTime
    console.log(`[FoodService] 食物数据初始化完成，耗时 ${elapsed}ms`)

    this.isInitialized = true
  }

  /**
   * 批量导入资料库数据
   */
  async importLibraryItems(items: FoodLibraryItem[]) {
    await this.init()

    if (this.isNative && this.dbConnection) {
      // Native 批量插入
      // const sql = `INSERT OR REPLACE INTO library (id, type, category, name, json_data) VALUES (?, ?, ?, ?, ?)`;
      // for (const item of items) {
      //   await this.dbConnection.run(sql, [item.id, item.type, item.category, item.name, JSON.stringify(item.json_data)]);
      // }
    } else {
      // Web IndexedDB 批量插入
      return this.runWebTransaction('library', 'readwrite', (store) => {
        items.forEach((item) => {
          store.put({
            id: item.id,
            type: item.type,
            category: item.category,
            name: item.name,
            json_data: JSON.stringify(item.json_data),
          })
        })
      })
    }
  }

  /**
   * 搜索资料库
   */
  async searchLibrary(
    query: string,
    filter: { type?: string; category?: string } = {},
  ): Promise<Record<string, unknown>[]> {
    await this.init()

    if (this.isNative && this.dbConnection) {
      // Native SQL search
      // let sql = `SELECT * FROM library WHERE name LIKE ?`;
      // const params: any[] = [`%${query}%`];
      // if (filter.type) {
      //   sql += ` AND type = ?`;
      //   params.push(filter.type);
      // }
      // if (filter.category) {
      //   sql += ` AND category = ?`;
      //   params.push(filter.category);
      // }
      // sql += ` LIMIT 50`;
      // const res = await this.dbConnection.query(sql, params);
      // return res.values.map((row: any) => {
      //   try { return JSON.parse(row.json_data); } catch { return null; }
      // }).filter(Boolean);
      return []
    } else {
      // Web IndexedDB search
      return new Promise((resolve) => {
        if (!this.webFallbackDB) return resolve([])
        const tx = this.webFallbackDB.transaction('library', 'readonly')
        const store = tx.objectStore('library')
        const request = store.getAll()

        request.onsuccess = () => {
          const all = request.result || []
          const results = all
            .filter((item: Record<string, unknown>) => {
              const name = typeof item.name === 'string' ? item.name : ''
              let match = name.toLowerCase().includes(query.toLowerCase())
              if (filter.type && item.type !== filter.type) match = false
              if (filter.category && item.category !== filter.category) match = false
              return match
            })
            .slice(0, 50)

          const parsed = results
            .map((row: Record<string, unknown>) => {
              const jsonData = row.json_data
              if (typeof jsonData !== 'string') return null
              try {
                return JSON.parse(jsonData) as Record<string, unknown>
              } catch {
                return null
              }
            })
            .filter((v): v is Record<string, unknown> => v !== null)

          resolve(parsed)
        }
      })
    }
  }

  /**
   * 添加单个食物到库
   */
  async addFood(food: Record<string, unknown>, category: string): Promise<void> {
    await this.init()

    const name = typeof food.name === 'string' ? food.name : 'Unnamed'
    const item: FoodLibraryItem = {
      id: `custom_${Date.now()}_${Math.random()}`,
      type: 'food',
      category: category,
      name,
      json_data: food,
    }

    if (this.isNative && this.dbConnection) {
      // const sql = `INSERT OR REPLACE INTO library (id, type, category, name, json_data) VALUES (?, ?, ?, ?, ?)`;
      // await this.dbConnection.run(sql, [item.id, item.type, item.category, item.name, JSON.stringify(item.json_data)]);
    } else {
      return this.runWebTransaction('library', 'readwrite', (store) => {
        store.put({
          id: item.id,
          type: item.type,
          category: item.category,
          name: item.name,
          json_data: JSON.stringify(item.json_data),
        })
      })
    }
  }

  // Helper
  private runWebTransaction(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.webFallbackDB) return reject('Web DB not ready')
      const tx = this.webFallbackDB.transaction(storeName, mode)
      const store = tx.objectStore(storeName)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      callback(store)
    })
  }
}

export const sqliteFoodService = new SqliteFoodService()
