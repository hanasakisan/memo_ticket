// api.js
const BASE_URL = 'http://localhost:3001/api';

// 封装请求函数
async function request(url, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    const data = await response.json();
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.message || '请求失败');
    }
  } catch (err) {
    showToast(err.message, 'error'); // 复用现有toast提示
    throw err;
  }
}

/* // 记账记录相关API
export const recordAPI = {
  // 获取所有记录
  getRecords: () => request('/records'),
  // 新增记录
  addRecord: (record) => request('/records', {
    method: 'POST',
    body: JSON.stringify(record),
  }),
  // 获取统计数据
  getStats: () => request('/records/stats'),
  // 导出记录
  exportRecords: () => {
    window.open(`${BASE_URL}/records/export`); // 触发下载
  },
  // 导入记录
  importRecords: (records) => request('/records/import', {
    method: 'POST',
    body: JSON.stringify(records),
  }),
}; */

// Toast提示函数（复用现有逻辑）
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg transform opacity-100 transition-all duration-300 flex items-center z-50 ${type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`;
  setTimeout(() => {
    toast.className = 'fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg transform translate-y-20 opacity-0 transition-all duration-300 flex items-center z-50';
  }, 3000);
}

// api.js
import { db } from './db.js';

export const recordAPI = {
  // 获取所有记录
  getRecords: async () => {
    return await db.getRecords();
  },

  // 新增记录
  addRecord: async (record) => {
    return await db.addRecord(record);
  },

  // 删除记录
  deleteRecord: async (id) => {
    return await db.deleteRecord(id);
  },

  // 更新记录
  updateRecord: async (id, updateData) => {
    return await db.updateRecord(id, updateData);
  },

  // 获取统计数据
  getStats: async () => {
    return await db.getStats();
  },

  // 导出记录
  exportRecords: async () => {
    return await db.exportRecords();
  },

  // 导入记录
  importRecords: async (records) => {
    return await db.importRecords(records);
  }
};