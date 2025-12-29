/**
 * LifeRPG SQLite 日志服务
 * 负责用户流水账数据的存储（食物、运动、水摄入记录）
 */

import { Capacitor } from '@capacitor/core';

// 日志数据接口
export interface LogEntry {
  id: string;
  type: string; // 'food' | 'exercise' | 'hydration'
  date: string; // YYYY-MM-DD
  timestamp: number;
  json_data: string; // 存储完整的 JSON 字符串
}

class SqliteLogService {
  private dbConnection: unknown = null;
  private isNative: boolean = false;
  private dbName: string = 'liferpg_db'; // 统一数据库名称
  private isOpen: boolean = false;
  private webFallbackDB: IDBDatabase | null = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  async init(): Promise<void> {
    if (this.isOpen) return;

    if (this.isNative) {
      await this.initNativeConnection();
    } else {
      console.log('[LogService] Running in Web Mode. Using IndexedDB as fallback.');
      await this.initWebFallback();
    }
    this.isOpen = true;
  }

  // --- Native SQLite Implementation ---

  private async initNativeConnection() {
    try {
      console.log('[LogService] Initializing Native SQLite Connection...');
      // 真实环境下的初始化代码 (需要安装插件后取消注释)
      /*
      const { CapacitorSQLite, SQLiteConnection } = await import('@capacitor-community/sqlite');
      const sqlite = new SQLiteConnection(CapacitorSQLite);
      this.dbConnection = await sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
      await this.dbConnection.open();
      await this.createTablesNative();
      */
    } catch (e) {
      console.error('[LogService] SQLite Native Init Failed:', e);
      throw e;
    }
  }

  private async createTablesNative() {
    // schemaLogs will be used when native plugin is enabled
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // 执行建表 (真实环境取消注释)
    // if (this.dbConnection) {
    //   await this.dbConnection.execute(schemaLogs);
    // }
  }

  // --- Web Fallback Implementation (IndexedDB) ---

  private async initWebFallback() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2); // 版本2，包含两个表

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Logs Store (日志表)
        if (!db.objectStoreNames.contains('logs')) {
          const store = db.createObjectStore('logs', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }

        // Library Store (食物表)
        if (!db.objectStoreNames.contains('library')) {
          const store = db.createObjectStore('library', { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('name', 'name', { unique: false });
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

  async saveLog(entry: { id: string, type: string, date: string, timestamp: number, data: Record<string, unknown> }) {
    await this.init();
    const jsonData = JSON.stringify(entry.data);

    if (this.isNative && this.dbConnection) {
      // sql will be used when native plugin is enabled
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  async getAllLogs(): Promise<Record<string, unknown>[]> {
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
          const parsed = (request.result || []).map((row: Record<string, unknown>) => {
            try {
              // 解析 json_data 字段
              const jsonData = typeof row.json_data === 'string' ? JSON.parse(row.json_data) : row.json_data;
              // 返回完整的日志对象，包含 date 字段
              return { ...jsonData, date: row.date };
            } catch { 
              return null; 
            }
          }).filter(Boolean);
          resolve(parsed);
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

export const sqliteLogService = new SqliteLogService();
