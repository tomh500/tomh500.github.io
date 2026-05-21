const toggleBtn = document.getElementById('theme-toggle');
const body = document.body;

// 检查本地缓存是否之前设置过模式
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'light') {
    body.classList.add('light-mode');
    toggleBtn.textContent = '🌙';
}

toggleBtn.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    
    // 切换图标与保存状态
    if (body.classList.contains('light-mode')) {
        toggleBtn.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        toggleBtn.textContent = '☀';
        localStorage.setItem('theme', 'dark');
    }
});