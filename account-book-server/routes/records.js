// routes/records.js
const express = require('express');
const router = express.Router();
const db = require('../app');

// 1. 获取所有记账记录
router.get('/', (req, res) => {
  db.all('SELECT * FROM records ORDER BY createTime DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ success: false, message: err.message });
    } else {
      res.json({ success: true, data: rows });
    }
  });
});

// 2. 新增记账记录
router.post('/', (req, res) => {
  const { type, amount, description } = req.body;
  // 验证必填字段
  if (!type || !amount) {
    return res.status(400).json({ success: false, message: '类型和金额为必填项' });
  }
  // 插入数据
  const stmt = db.prepare(`INSERT INTO records (type, amount, description) VALUES (?, ?, ?)`);
  stmt.run([type, amount, description], (err) => {
    if (err) {
      res.status(500).json({ success: false, message: err.message });
    } else {
      res.json({ success: true, message: '记录添加成功' });
    }
  });
  stmt.finalize();
});

// 3. 获取统计数据（总收入、总支出、余额）
router.get('/stats', (req, res) => {
  const sql = `
    SELECT 
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpense
    FROM records
  `;
  db.get(sql, (err, row) => {
    if (err) {
      res.status(500).json({ success: false, message: err.message });
    } else {
      const totalIncome = row.totalIncome || 0;
      const totalExpense = row.totalExpense || 0;
      const balance = totalIncome - totalExpense;
      res.json({
        success: true,
        data: { totalIncome, totalExpense, balance }
      });
    }
  });
});

// 4. 导出所有记录（JSON格式）
router.get('/export', (req, res) => {
  db.all('SELECT * FROM records', (err, rows) => {
    if (err) {
      res.status(500).json({ success: false, message: err.message });
    } else {
      // 设置响应头，触发文件下载
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=account-records-${new Date().getTime()}.json`);
      res.json(rows);
    }
  });
});

// 5. 导入记录（批量插入）
router.post('/import', (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: '导入数据为空或格式错误' });
  }
  // 开启事务，批量插入
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const stmt = db.prepare(`INSERT INTO records (type, amount, description, createTime) VALUES (?, ?, ?, ?)`);
    let error = null;
    records.forEach(record => {
      if (!error && record.type && record.amount) {
        stmt.run([
          record.type,
          record.amount,
          record.description || '',
          record.createTime || new Date().toLocaleString()
        ], (err) => {
          if (err) error = err;
        });
      }
    });
    stmt.finalize((err) => {
      if (err) error = err;
      if (error) {
        db.run('ROLLBACK');
        res.status(500).json({ success: false, message: error.message });
      } else {
        db.run('COMMIT');
        res.json({ success: true, message: `成功导入 ${records.length} 条记录` });
      }
    });
  });
});

module.exports = router;