document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".product-grid");
    const cards = Array.from(container.querySelectorAll(".product-card"));

    // 排序规则：热 > 新 > 其他，然后按类型分组
    const priority = { hot: 2, new: 1, none: 0 };

    const sortedCards = cards.sort((a, b) => {
        const labelA = a.dataset.label || "none";
        const labelB = b.dataset.label || "none";

        // 按优先级降序
        if (priority[labelB] !== priority[labelA]) {
            return priority[labelB] - priority[labelA];
        }

        // 同优先级，按类型排序（link 在前，download 在后）
        const typeOrder = { link: 0, download: 1 };
        return typeOrder[a.dataset.type] - typeOrder[b.dataset.type];
    });

    // 清空容器并重新排列
    container.innerHTML = "";
    sortedCards.forEach(card => container.appendChild(card));
});