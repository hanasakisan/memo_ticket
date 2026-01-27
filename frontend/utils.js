// 全局共享的分类数据
window.categoryData = {
    income: [
        { value: 'salary', label: '工资' },
        { value: 'bonus', label: '奖金' },
        { value: 'investment', label: '投资收益' },
        { value: 'part-time', label: '兼职' },
        { value: 'other-income', label: '其他' }
    ],
    expense: [
        { value: 'food', label: '餐饮' },
        { value: 'transportation', label: '交通' },
        { value: 'shopping', label: '购物' },
        { value: 'housing', label: '住房' },
        { value: 'entertainment', label: '娱乐' },
        { value: 'health', label: '医疗健康' },
        { value: 'education', label: '教育' },
        { value: 'other-expense', label: '其他' }
    ]
};

// 获取本地存储的记账记录
window.getRecords = function() {
    return JSON.parse(localStorage.getItem('accountRecords')) || [];
};

// 保存记录到本地存储
window.saveRecords = function(records) {
    localStorage.setItem('accountRecords', JSON.stringify(records));
};

// 工具函数：获取分类名称
window.getCategoryName = function(value) {
    const incomeCat = window.categoryData.income.find(cat => cat.value === value);
    if (incomeCat) return incomeCat.label;
    const expenseCat = window.categoryData.expense.find(cat => cat.value === value);
    if (expenseCat) return expenseCat.label;
    return value;
};

// 工具函数：格式化日期
window.formatDate = function(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

// 工具函数：显示提示框
window.showToast = function(doc, message, type = 'info') {
    let toast = doc.getElementById('toast');
    if (!toast) {
        toast = doc.createElement('div');
        toast.id = 'toast';
        toast.innerHTML = '<i id="toastIcon" class="mr-2"></i><span id="toastText"></span>';
        doc.body.appendChild(toast);
    }

    const toastIcon = doc.getElementById('toastIcon');
    const toastText = doc.getElementById('toastText');
    
    let iconClass, bgColor;
    switch(type) {
        case 'success':
            iconClass = 'fa-check-circle text-white';
            bgColor = '#10B981'; // 收入绿
            break;
        case 'error':
            iconClass = 'fa-exclamation-circle text-white';
            bgColor = '#EF4444'; // 支出红
            break;
        case 'info':
            iconClass = 'fa-info-circle text-white';
            bgColor = '#4F46E5'; // 主色蓝
            break;
        default:
            iconClass = 'fa-info-circle text-white';
            bgColor = '#4F46E5';
    }
    
    toastIcon.className = iconClass;
    toastText.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transform: translateY(0);
        opacity: 1;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        z-index: 9999;
        background-color: ${bgColor};
        color: white;
    `;
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
    }, 3000);
};

// 工具函数：计算统计数据
window.calculateStats = function(records) {
    const totalIncome = records.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    const balance = totalIncome - totalExpense;
    return { totalIncome, totalExpense, balance };
};

// 模拟云端同步
window.syncToCloud = function(doc, records) {
    window.showToast(doc, '正在同步数据...', 'info');
    setTimeout(() => {
        window.showToast(doc, '数据同步成功', 'success');
    }, 1500);
};

// 原有代码保持不变，新增以下函数 ↓

// 导出本地数据到JSON文件（需配合浏览器下载，或手动复制）
window.exportRecordsToJSON = function() {
    const records = getRecords();
    const jsonContent = JSON.stringify(records, null, 2); // 格式化JSON，便于Git查看
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接，自动下载JSON文件到项目根目录
    const a = document.createElement('a');
    a.href = url;
    a.download = 'account-records.json'; // 固定文件名，与Git同步的文件一致
    a.click();
    URL.revokeObjectURL(url);
    
    showToast(document, '数据已导出为 account-records.json', 'success');
};

// 导入JSON文件到本地localStorage
window.importRecordsFromJSON = function(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const records = JSON.parse(e.target.result);
            // 验证数据格式
            if (Array.isArray(records)) {
                saveRecords(records);
                showToast(document, '数据导入成功！', 'success');
                // 刷新页面，更新数据
                window.location.reload();
            } else {
                showToast(document, 'JSON文件格式错误', 'error');
            }
        } catch (err) {
            showToast(document, '导入失败：' + err.message, 'error');
        }
    };
    reader.readAsText(file);
};

// 原有代码保持不变 ↑