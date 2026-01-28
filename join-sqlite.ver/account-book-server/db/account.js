// db.js - SQLite数据库核心操作
let db;

// 初始化数据库
function initDB() {
    // 打开/创建本地SQLite数据库（基于浏览器的sql.js，需引入依赖）
    const request = indexedDB.open('SmartAccountDB', 1);

    // 数据库版本升级/首次创建
    request.onupgradeneeded = function(e) {
        db = e.target.result;
        // 创建记账记录表（id自增、类型、金额、描述、日期）
        if (!db.objectStoreNames.contains('records')) {
            const store = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
            // 创建索引（方便查询）
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('date', 'date', { unique: false });
        }
    };

    // 初始化成功
    request.onsuccess = function(e) {
        db = e.target.result;
        console.log('数据库初始化成功');
    };

    // 初始化失败
    request.onerror = function(e) {
        console.error('数据库初始化失败:', e.target.error);
    };
}

// 新增记账记录
function addRecord(record) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['records'], 'readwrite');
        const store = transaction.objectStore('records');
        const request = store.add({
            type: record.type, // 'income' 或 'expense'
            amount: parseFloat(record.amount),
            description: record.description,
            date: record.date || new Date().toISOString()
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 获取所有记账记录
function getRecords() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['records'], 'readonly');
        const store = transaction.objectStore('records');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 根据ID删除记录
function deleteRecord(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['records'], 'readwrite');
        const store = transaction.objectStore('records');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// 计算收支统计（总收入、总支出、余额）
async function calculateStats() {
    const records = await getRecords();
    let totalIncome = 0;
    let totalExpense = 0;

    records.forEach(record => {
        if (record.type === 'income') {
            totalIncome += record.amount;
        } else if (record.type === 'expense') {
            totalExpense += record.amount;
        }
    });

    return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense
    };
}

// 导出数据为JSON（兼容原有功能）
async function exportRecordsToJSON() {
    const records = await getRecords();
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-account-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('导出成功');
}

// 导入JSON数据到SQLite
function importRecordsFromJSON(file) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const records = JSON.parse(e.target.result);
            // 批量插入
            const transaction = db.transaction(['records'], 'readwrite');
            const store = transaction.objectStore('records');
            
            for (const record of records) {
                // 过滤有效字段，避免脏数据
                const validRecord = {
                    type: record.type || 'expense',
                    amount: parseFloat(record.amount) || 0,
                    description: record.description || '',
                    date: record.date || new Date().toISOString()
                };
                store.add(validRecord);
            }

            transaction.oncomplete = () => {
                showToast('导入成功');
                updateStats(); // 刷新统计数据
            };
        } catch (err) {
            showToast('导入失败：文件格式错误');
            console.error(err);
        }
    };
    reader.readAsText(file);
}

// 通用提示框（复用原有逻辑）
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg bg-green-500 text-white z-50';
    
    setTimeout(() => {
        toast.className = 'fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg transform translate-y-20 opacity-0 transition-all duration-300 flex items-center z-50';
    }, 2000);
}

// 页面加载时初始化数据库
document.addEventListener('DOMContentLoaded', initDB);