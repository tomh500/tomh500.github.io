document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('project-search');
    const cards = document.querySelectorAll('.product-card');

    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase().trim();

        cards.forEach(card => {
            // 抓取标题和描述的文本内容
            const titleText = card.querySelector('.prod-details h3')?.textContent.toLowerCase() || '';
            const descText = card.querySelector('.prod-details p')?.textContent.toLowerCase() || '';

            // 只要名字或介绍里包含关键词，就命中
            if (titleText.includes(keyword) || descText.includes(keyword)) {
                card.style.display = ''; // 恢复显示
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                }, 10);
            } else {
                // 没命中则隐藏，并加上淡出动画过渡
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                card.style.transition = 'all 0.2s ease';
                
                // 动画结束后正式脱离文档流，防止占位
                setTimeout(() => {
                    if (card.style.opacity === '0') {
                        card.style.display = 'none';
                    }
                }, 200);
            }
        });
    });
});