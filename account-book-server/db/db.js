// db.js (原生 SQLite 版本)
let db;

// 初始化 SQLite 数据库
async function initDB() {
  const SQL = await window.initSqlJs({
    locateFile: file => `https://cdn.bootcdn.net/ajax/libs/sql.js/1.8.0/${file}`
  });
  // 打开/创建数据库
  db = new SQL.Database();
  // 创建记账记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- income/expense
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      remark TEXT,
      createTime TEXT NOT NULL
    );
  `);
}

// 封装通用查询方法
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.getAsObject(params);
      stmt.free();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

// 封装通用执行方法（增删改）
function execute(sql, params = []) {
  return new Promise((resolve, reject) => {
    try {
      db.run(sql, params);
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}

// 记账记录相关 API
export const recordAPI = {
  // 初始化数据库
  init: async () => await initDB(),

  // 获取所有记录
  getRecords: async () => {
    const stmt = db.prepare("SELECT * FROM records ORDER BY createTime DESC");
    const records = [];
    while (stmt.step()) {
      records.push(stmt.getAsObject());
    }
    stmt.free();
    return records;
  },

  // 新增记录
  addRecord: async (record) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const createTime = new Date().toISOString();
    await execute(
      `INSERT INTO records (id, type, amount, category, remark, createTime) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, record.type, record.amount, record.category, record.remark || '', createTime]
    );
    return { ...record, id, createTime };
  },

  // 删除记录
  deleteRecord: async (id) => {
    await execute("DELETE FROM records WHERE id = ?", [id]);
    return true;
  },

  // 获取统计数据
  getStats: async () => {
    // 总收入
    const incomeResult = await query("SELECT SUM(amount) AS total FROM records WHERE type = 'income'");
    const totalIncome = parseFloat(incomeResult.total || 0);
    
    // 总支出
    const expenseResult = await query("SELECT SUM(amount) AS total FROM records WHERE type = 'expense'");
    const totalExpense = parseFloat(expenseResult.total || 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  },

  // 导出记录
  exportRecords: async () => {
    const records = await recordAPI.getRecords();
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `记账记录_${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // 导入记录
  importRecords: async (importedRecords) => {
    if (!Array.isArray(importedRecords)) throw new Error('导入数据必须是数组');
    let count = 0;
    for (const record of importedRecords) {
      if (!record.type || !['income', 'expense'].includes(record.type) || isNaN(record.amount)) {
        continue;
      }
      const id = record.id || Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const createTime = record.createTime || new Date().toISOString();
      // 避免重复插入
      const exists = await query("SELECT id FROM records WHERE id = ?", [id]);
      if (!exists.id) {
        await execute(
          `INSERT INTO records (id, type, amount, category, remark, createTime) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, record.type, record.amount, record.category, record.remark || '', createTime]
        );
        count++;
      }
    }
    return count;
  }
};

// 初始化数据库
recordAPI.init();