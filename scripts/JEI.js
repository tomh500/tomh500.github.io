document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".product-grid");
    
    // 只选取 class 为 product-card 的元素，不要选中 h2
    const cards = Array.from(container.querySelectorAll(".product-card"));

    const priority = { hot: 2, new: 1, none: 0 };

    const sortedCards = cards.sort((a, b) => {
        const labelA = a.dataset.label || "none";
        const labelB = b.dataset.label || "none";

        if (priority[labelB] !== priority[labelA]) {
            return priority[labelB] - priority[labelA];
        }

        const typeOrder = { link: 0, download: 1 };
        return typeOrder[a.dataset.type] - typeOrder[b.dataset.type];
    });

    // 【修改点】：不要使用 innerHTML = ""
    // 而是移除所有旧卡片，重新添加
    cards.forEach(card => card.remove());
    
    // 把排序后的卡片放回到容器末尾
    sortedCards.forEach(card => container.appendChild(card));
});