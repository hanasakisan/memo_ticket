// 1. 引入 sql.js（需先下载 sql-wasm.wasm 文件）
<script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.min.js"></script>

// 2. 初始化 SQLite 数据库
let db;
document.addEventListener('DOMContentLoaded', async () => {
  const SQL = await initSqlJs({ locateFile: file => `/${file}` });
  // 创建数据库（内存/本地持久化）
  db = new SQL.Database();
  // 创建记账记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- income/expense
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      remark TEXT,
      create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      version INTEGER DEFAULT 1 -- 版本号，用于同步
    );
  `);
  // 迁移原 LocalStorage 数据到 SQLite
  migrateLocalStorageToSQLite();
  updateStats();
});

// 3. 迁移原 LocalStorage 数据
function migrateLocalStorageToSQLite() {
  const oldRecords = getRecords(); // 原 utils.js 中的方法
  if (oldRecords.length === 0) return;
  
  const stmt = db.prepare(`
    INSERT INTO records (type, amount, category, remark, create_time, update_time)
    VALUES (?, ?, ?, ?, ?, ?);
  `);
  
  oldRecords.forEach(record => {
    stmt.run([
      record.type,
      record.amount,
      record.category,
      record.remark || '',
      record.createTime,
      record.updateTime || record.createTime
    ]);
  });
  stmt.free();
}

// 4. 重写原 CRUD 方法（替换 LocalStorage）
function getRecords() {
  const stmt = db.prepare("SELECT * FROM records ORDER BY create_time DESC");
  const records = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    records.push(row);
  }
  stmt.free();
  return records;
}

// 新增记录方法
function addRecord(record) {
  db.run(`
    INSERT INTO records (type, amount, category, remark, create_time, update_time)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  `, [record.type, record.amount, record.category, record.remark || '']);
  updateStats();
}