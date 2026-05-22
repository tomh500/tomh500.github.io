document.addEventListener("DOMContentLoaded", () => {
    const container = document.querySelector(".product-grid");
    const cards = Array.from(container.querySelectorAll(".product-card"));

    // 修改优先级：hot(2) > new(1) > none(0) > legacy(-1)
    const priority = { hot: 2, new: 1, none: 0, legacy: -1 };

    const sortedCards = cards.sort((a, b) => {
        const labelA = a.dataset.label || "none";
        const labelB = b.dataset.label || "none";

        if (priority[labelB] !== priority[labelA]) {
            return priority[labelB] - priority[labelA];
        }

        const typeOrder = { link: 0, download: 1 };
        return typeOrder[a.dataset.type] - typeOrder[b.dataset.type];
    });

    cards.forEach(card => card.remove());
    sortedCards.forEach(card => container.appendChild(card));
});