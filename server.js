const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-keep-safe'; // 生产环境需替换为环境变量

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 初始化 SQLite 数据库
const db = new sqlite3.Database('./accounting.db', (err) => {
  if (err) console.error('数据库连接失败:', err.message);
  else console.log('已连接到 SQLite 数据库');
});

// 创建用户表（多端同步需用户鉴权）
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// 创建云端记账表（关联用户 + 版本号）
db.run(`
  CREATE TABLE IF NOT EXISTS cloud_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    remark TEXT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1, -- 版本号，用于增量同步
    is_deleted INTEGER DEFAULT 0, -- 软删除标记
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// -------------------------- 接口：用户鉴权 --------------------------
// 注册
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ code: -1, msg: '用户名/密码不能为空' });
  }

  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ code: -1, msg: '用户名已存在' });
      }
      return res.status(500).json({ code: -1, msg: '注册失败' });
    }
    res.json({ code: 0, msg: '注册成功', data: { userId: this.lastID } });
  });
});

// 登录（生成 JWT Token）
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT id FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (err) return res.status(500).json({ code: -1, msg: '登录失败' });
    if (!row) return res.status(400).json({ code: -1, msg: '用户名/密码错误' });

    // 生成 Token（有效期7天）
    const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ code: 0, msg: '登录成功', data: { token } });
  });
});

// -------------------------- 中间件：Token 校验 --------------------------
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ code: -1, msg: '未登录，请先登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ code: -1, msg: 'Token 失效，请重新登录' });
  }
};

// -------------------------- 接口：数据同步 --------------------------
// 1. 上传本地增量数据（前端 → 云端）
app.post('/api/sync/upload', authMiddleware, (req, res) => {
  const { records } = req.body; // records: [{ type, amount, category, remark, version, id }]
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ code: -1, msg: '同步数据不能为空' });
  }

  // 批量插入/更新云端数据
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO cloud_records (
      id, user_id, type, amount, category, remark, version, update_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  records.forEach(record => {
    stmt.run([
      record.id || null, // 新增记录无id，null 让自增生效
      req.userId,
      record.type,
      record.amount,
      record.category,
      record.remark || '',
      record.version
    ]);
  });

  stmt.finalize((err) => {
    if (err) return res.status(500).json({ code: -1, msg: '同步失败' });
    res.json({ code: 0, msg: '同步成功' });
  });
});

// 2. 拉取云端增量数据（云端 → 前端）
app.post('/api/sync/download', authMiddleware, (req, res) => {
  const { lastVersion } = req.body; // 前端最后同步的版本号
  db.all(`
    SELECT * FROM cloud_records 
    WHERE user_id = ? AND version > ? AND is_deleted = 0
    ORDER BY update_time DESC
  `, [req.userId, lastVersion || 0], (err, rows) => {
    if (err) return res.status(500).json({ code: -1, msg: '拉取数据失败' });
    res.json({ code: 0, data: rows });
  });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`服务端运行在 http://localhost:${PORT}`);
});