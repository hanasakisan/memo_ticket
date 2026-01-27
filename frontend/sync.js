// 同步配置
const API_BASE = 'http://localhost:3001/api';

// 1. 获取本地 Token（登录后存储）
function getToken() {
  return localStorage.getItem('accounting_token');
}

// 2. 登录（获取 Token）
async function login(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.code === 0) {
    localStorage.setItem('accounting_token', data.data.token);
    return true;
  }
  alert(data.msg);
  return false;
}

// 3. 上传本地增量数据到云端
async function uploadSyncData() {
  const token = getToken();
  if (!token) {
    alert('请先登录');
    window.location.href = 'login.html';
    return;
  }

  // 1. 获取本地最后同步版本号
  const lastSyncVersion = localStorage.getItem('last_sync_version') || 0;
  // 2. 获取本地版本号大于 lastSyncVersion 的记录
  const stmt = db.prepare(`SELECT * FROM records WHERE version > ?`);
  const syncRecords = [];
  while (stmt.step()) {
    syncRecords.push(stmt.getAsObject());
  }
  stmt.free();

  if (syncRecords.length === 0) return;

  // 3. 上传到云端
  const res = await fetch(`${API_BASE}/sync/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ records: syncRecords })
  });

  const data = await res.json();
  if (data.code === 0) {
    // 更新本地最后同步版本号（取本地最大版本号）
    const maxVersion = Math.max(...syncRecords.map(r => r.version));
    localStorage.setItem('last_sync_version', maxVersion);
    showToast('数据同步成功');
  } else {
    showToast(`同步失败：${data.msg}`);
  }
}

// 4. 从云端拉取增量数据到本地
async function downloadSyncData() {
  const token = getToken();
  if (!token) return;

  const lastSyncVersion = localStorage.getItem('last_sync_version') || 0;
  const res = await fetch(`${API_BASE}/sync/download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ lastVersion: lastSyncVersion })
  });

  const data = await res.json();
  if (data.code === 0 && data.data.length > 0) {
    // 批量更新本地数据
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO records (
        id, type, amount, category, remark, create_time, update_time, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let maxVersion = lastSyncVersion;
    data.data.forEach(record => {
      stmt.run([
        record.id,
        record.type,
        record.amount,
        record.category,
        record.remark,
        record.create_time,
        record.update_time,
        record.version
      ]);
      if (record.version > maxVersion) maxVersion = record.version;
    });

    stmt.finalize();
    localStorage.setItem('last_sync_version', maxVersion);
    updateStats(); // 更新页面统计
    showToast(`拉取到 ${data.data.length} 条新数据`);
  }
}

// 5. 自动同步（页面加载/后台切换时触发）
async function autoSync() {
  await downloadSyncData(); // 先拉取云端最新数据
  await uploadSyncData();   // 再上传本地增量数据
}

// 6. 提示框（复用原 toast 组件）
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg bg-green-500 text-white flex items-center z-50';
  setTimeout(() => {
    toast.className = 'fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg transform translate-y-20 opacity-0 transition-all duration-300 flex items-center z-50';
  }, 2000);
}