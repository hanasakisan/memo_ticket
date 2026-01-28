// app.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// 1. 创建Express应用
const app = express();
const PORT = 3001;

// 2. 中间件配置
app.use(cors());  // 允许跨域
app.use(bodyParser.json());  // 解析JSON请求体

// 3. 初始化SQLite数据库
const dbPath = path.join(__dirname, 'db/account.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败：', err.message);
  } else {
    console.log('成功连接SQLite数据库');
    // 创建records表（id自增、类型、金额、描述、时间）
    db.run(`CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,  -- income/expense（收入/支出）
      amount REAL NOT NULL, -- 金额
      description TEXT,     -- 备注
      createTime TEXT NOT NULL DEFAULT (datetime('now', 'localtime')) -- 创建时间（本地时间）
    )`, (err) => {
      if (err) {
        console.error('创建表失败：', err.message);
      } else {
        console.log('records表初始化成功');
      }
    });
  }
});

// 4. 挂载路由（后续步骤实现）
app.use('/api/records', require('./routes/records'));

// 5. 启动服务
app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});

// 暴露数据库连接，供路由使用
module.exports = db;