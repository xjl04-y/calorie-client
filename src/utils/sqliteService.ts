/**
 * LifeRPG SQLite Service
 * 核心数据库服务，支持移动端原生 SQLite
 * 包含 Web 环境的自动降级/Mock 处理，确保开发环境不崩溃
 */

import { Capacitor } from '@capacitor/core';
// 注意：在真机打包前请运行: npm install @capacitor-community/sqlite
// import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

// 定义日志数据接口
export interface LogEntry {
  id: string;
  type: string; // 'food' | 'exercise' | 'hydration'
  date: string; // YYYY-MM-DD
  timestamp: number;
  json_data: string; // 存储完整的 JSON 字符串
}

// 定义资料库条目接口 (用于未来的海量数据)
export interface LibraryItem {
  id: string;
  type: string;     // 'food', 'weapon', 'material'
  category: string; // 'human', 'orc', 'elf' (种族/分类)
  name: string;     // 用于搜索
  json_data: any;   // 完整数据
}

class SqliteService {
  private dbConnection: any = null;
  private isNative: boolean = false;
  private dbName: string = 'liferpg_db';
  private isOpen: boolean = false;

  // Web 环境回退方案 (IndexedDB 句柄)
  private webFallbackDB: IDBDatabase | null = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  async init(): Promise<void> {
    if (this.isOpen) return;

    if (this.isNative) {
      await this.initNativeConnection();
    } else {
      console.log('LifeRPG: Running in Web Mode. Using IndexedDB as SQLite fallback.');
      await this.initWebFallback();
    }
    this.isOpen = true;
  }

  // --- Native SQLite Implementation ---

  private async initNativeConnection() {
    try {
      console.log('Initializing Native SQLite Connection...');
      // 真实环境下的初始化代码 (需要安装插件后取消注释)
      /*
      const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
      const sqlite = new SQLiteConnection(CapacitorSQLite);
      this.dbConnection = await sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
      await this.dbConnection.open();
      await this.createTablesNative(); // <--- 这里会自动调用下面的建表语句
      */
    } catch (e) {
      console.error('SQLite Native Init Failed:', e);
      throw e; // 抛出错误以便上层处理
    }
  }

  // 【核心建表逻辑】
  private async createTablesNative() {
    // 1. Logs 表: 用户流水账
    const schemaLogs = `
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        timestamp INTEGER,
        json_data TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
      CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);
    `;

    // 2. Library 表: 游戏资料库
    // 专门用于存成千上万条食物、道具数据
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
    `;

    // 执行建表 (真实环境取消注释)
    // if (this.dbConnection) {
    //   await this.dbConnection.execute(schemaLogs + schemaLibrary);
    // }
  }

  // --- Web Fallback Implementation (IndexedDB) ---
  // 确保 Web 开发环境的结构与原生环境完全一致

  private async initWebFallback() {
    return new Promise<void>((resolve, reject) => {
      // 增加版本号到 2，触发 onupgradeneeded 以创建新表
      const request = indexedDB.open(this.dbName, 2);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Logs Store (对应 Logs 表)
        if (!db.objectStoreNames.contains('logs')) {
          const store = db.createObjectStore('logs', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }

        // Library Store (对应 Library 表 - 新增)
        if (!db.objectStoreNames.contains('library')) {
          const store = db.createObjectStore('library', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('name', 'name', { unique: false }); // 用于搜索
        }
      };

      request.onsuccess = (event) => {
        this.webFallbackDB = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => reject(event);
    });
  }

  // --- Logs CRUD ---

  async saveLog(entry: { id: string, type: string, date: string, timestamp: number, data: any }) {
    await this.init();
    const jsonData = JSON.stringify(entry.data);

    if (this.isNative && this.dbConnection) {
      const sql = `INSERT OR REPLACE INTO logs (id, type, date, timestamp, json_data) VALUES (?, ?, ?, ?, ?)`;
      // await this.dbConnection.run(sql, [entry.id, entry.type, entry.date, entry.timestamp, jsonData]);
    } else {
      return this.runWebTransaction('logs', 'readwrite', (store) => {
        store.put({ id: entry.id, type: entry.type, date: entry.date, timestamp: entry.timestamp, json_data: jsonData });
      });
    }
  }

  async deleteLog(id: string) {
    await this.init();
    if (this.isNative && this.dbConnection) {
      // await this.dbConnection.run(`DELETE FROM logs WHERE id = ?`, [id]);
    } else {
      return this.runWebTransaction('logs', 'readwrite', (store) => store.delete(id));
    }
  }

  async getAllLogs(): Promise<any[]> {
    await this.init();
    if (this.isNative && this.dbConnection) {
      // const sql = `SELECT * FROM logs ORDER BY timestamp DESC`;
      // const res = await this.dbConnection.query(sql);
      // return res.values.map(row => ({ ...JSON.parse(row.json_data), id: row.id }));
      return [];
    } else {
      return new Promise((resolve) => {
        if (!this.webFallbackDB) return resolve([]);
        const tx = this.webFallbackDB.transaction('logs', 'readonly');
        const request = tx.objectStore('logs').getAll();
        request.onsuccess = () => {
          const parsed = (request.result || []).map((row: any) => {
            try { return { ...JSON.parse(row.json_data), id: row.id }; } catch { return null; }
          }).filter(Boolean);
          resolve(parsed);
        };
      });
    }
  }

  // --- Library Methods (资料库专用方法) ---

  /**
   * 批量导入资料库数据
   */
  async importLibraryItems(items: LibraryItem[]) {
    await this.init();
    // 简单示例逻辑，实际根据 Native/Web 分别处理
    if (!this.isNative) {
      return this.runWebTransaction('library', 'readwrite', (store) => {
        items.forEach(item => {
          store.put({
            id: item.id,
            type: item.type,
            category: item.category,
            name: item.name,
            json_data: JSON.stringify(item.json_data)
          });
        });
      });
    }
  }

  /**
   * 搜索资料库
   */
  async searchLibrary(query: string, filter: { type?: string, category?: string } = {}): Promise<any[]> {
    await this.init();

    if (this.isNative && this.dbConnection) {
      // Native SQL search placeholder
      return [];
    } else {
      // Web Mock Search
      return new Promise((resolve) => {
        if (!this.webFallbackDB) return resolve([]);
        const tx = this.webFallbackDB.transaction('library', 'readonly');
        const store = tx.objectStore('library');
        const request = store.getAll();

        request.onsuccess = () => {
          const all = request.result || [];
          const results = all.filter((item: any) => {
            let match = item.name.toLowerCase().includes(query.toLowerCase());
            if (filter.type && item.type !== filter.type) match = false;
            if (filter.category && item.category !== filter.category) match = false;
            return match;
          }).slice(0, 50);

          resolve(results.map((row: any) => {
            try { return JSON.parse(row.json_data); } catch { return null; }
          }).filter(Boolean));
        };
      });
    }
  }

  // Helper
  private runWebTransaction(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.webFallbackDB) return reject('Web DB not ready');
      const tx = this.webFallbackDB.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      callback(store);
    });
  }
}

export const sqliteService = new SqliteService();
