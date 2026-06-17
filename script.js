document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. 【核心配置项】未来所有产品的下载链接与密码全在这里改！
    // ==========================================
    const productsDatabase = {
        // "ccd-manager-card" 对应 HTML 里产品卡片的 id 属性
        "ccd-manager-card": {
            name: "CCD Manager",
            routes: [
                { name: "蓝奏云 高速", url: "https://wwbjs.lanzoue.com/iheCU3s0w80h", password: "ab8u", available: 1 },
                { name: "GitHub 节点", url: "https://github.com/...", available: 0 },
                { name: "百度网盘 备份", url: "https://pan.baidu.com/...", available: 0 }
            ]
        },
"prod-a17f8f66-card": {
            "name": "R6ChineseInput",
            "routes": [
                        {
                                    "name": "Github 节点",
                                    "url": "https://github.com/tomh500/tomh500.github.io/releases/download/R6ChineseInput/R6ChineseInput.7z",
                                    "available": 1
                        }
            ]
},

        "prod-47c719e1-card": {
                "name": "SquareMove",
                "routes": [
                                {
                                                "name": "Github 节点",
                                                "url": "https://github.com/tomh500/SquareMove",
                                                "available": 1
                                }
                ],

}

        // 如果以后新增了产品，直接在 HTML 里给卡片加个 id="my-new-app"
        // 然后在这里接着写：
        // "my-new-app": {
        //     name: "全新神秘软件",
        //     routes: [ ... ]
        // }
    };

    // ==========================================
    // 2. 动态 Tips (一言) 随机刷新系统
    // ==========================================
    const tipsContent = document.getElementById('tips-content');
    const tipsContainer = document.getElementById('random-tips');

    const tipsDatabase = [
    "时间如同流水，而故人早已不在身边。",
    "如果那是虚无，那虚无本身也就是这般模样，在某种程度上，对大家而言都是相通的。正如我存在于众生之中，一切也存在于众生之中的每一个个体。",
    "有些故事尚未开始，就已经迎来了结局。",
    "星光穿越漫长岁月抵达此处，而你也终将抵达自己的未来。",
    "世界并不会因为谁停下脚步，但总有人愿意为你驻足。",
    "人与人的相遇，本就是无数概率交织而成的奇迹。",
    "当你凝望深渊时，也别忘了看看身后的灯火。",
    "记忆会褪色，但那些留下痕迹的时刻永远存在。",
    "孤独并不可怕，可怕的是忘记为何出发。",
    "即使身处黑夜，也总会有属于自己的星辰。",
    "有时候答案并不重要，重要的是寻找答案的过程。",
    "风会带走落叶，却带不走树木生长的痕迹。",
    "所有失去的东西，都会以另一种形式归来。",
    "人们总是在追逐远方，却忽略了脚下盛开的花。",
    "真正珍贵的事物，往往无法用价值衡量。",
    "未来从不是注定的，它诞生于每一次选择。",
    "或许世界本无意义，但正因如此，我们才能赋予它意义。",
    "黎明到来之前，夜色总会显得格外漫长。",
    "愿你历经风雨之后，依然保有仰望天空的勇气。",
    "所有的相逢，都是久别重逢。",
    "命运像一本尚未写完的书，而你始终握着笔。",
    "即便前路迷茫，也请不要否定曾经努力前行的自己。",
    "世界上没有真正的永恒，但总有值得铭记的瞬间。",
    "人与人的距离，有时比星辰更遥远。",
    "在无人知晓的角落，也有人默默守护着希望。",
    "雨终会停下，而故事仍将继续。",
    "如果终点无法改变，那就让旅途变得精彩一些。",
    "生命的意义或许并非抵达彼岸，而是学会航行。",
    "总有一天，你会与曾经困扰自己的问题和解。",
    "不要害怕改变，因为成长本身就是一种改变。",
    "愿你所珍视的一切，都能被这个世界温柔以待。",
    "即便身处寒冬，也请相信春天终将来临。",
    "每一颗星星都会熄灭，但它们曾照亮过夜空。",
    "人们害怕失去，却也因此懂得珍惜。",
    "故事会结束，但故事带来的影响不会消失。",
    "当你回首来时的路，或许会发现自己早已走了很远。",
    "有些答案藏在远方，而有些答案就在心中。",
    "时间不会治愈一切，但会教会你如何与过去共存。",
    "愿每一个不被理解的梦想，都有绽放光芒的一天。",
    "即使世界喧嚣，也请倾听自己内心的声音。"
    ];



    function refreshTip() {
        if (!tipsContent) return;
        const randomIndex = Math.floor(Math.random() * tipsDatabase.length);
        tipsContent.innerText = tipsDatabase[randomIndex];
    }
    refreshTip();
    if (tipsContainer) tipsContainer.addEventListener('click', refreshTip);


    // ==========================================
    // 3. 产品点击响应与动态弹窗逻辑（含密码拦截）
    // ==========================================
    const modal = document.getElementById('download-modal');
    const closeModal = document.getElementById('close-modal');
    const routeContainer = document.getElementById('route-container');
    const modalProdName = document.querySelector('.modal-prod-name');

    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.getAttribute('data-type');
            
            if (type === 'link') {
                const target = card.getAttribute('data-target');
                window.open(target, '_blank');
            } 
            else if (type === 'download') {
                const cardId = card.id;
                // 根据卡片的 ID 去数据库捞对应的下载数据
                const productData = productsDatabase[cardId];
                
                if (productData) {
                    openDownloadModal(productData);
                } else {
                    alert("该产品的下载路线库尚未配置。");
                }
            }
        });
    });

    function openDownloadModal(productData) {
        if (!routeContainer || !modal) return;
        
        // 动态修改弹窗内的产品名称
        if (modalProdName) modalProdName.innerText = productData.name;
        
        routeContainer.innerHTML = '';

        // 核心排序：可用的 1 在前，0 沉底
        const sortedRoutes = [...productData.routes].sort((a, b) => b.available - a.available);

        sortedRoutes.forEach(route => {
            const a = document.createElement('a');
            a.href = "javascript:void(0);"; // 统一用内部事件控制跳转
            
            if (route.available === 1) {
                a.className = "route-item available";
                // 附加密码提示的小标识
                const pwdTag = route.password ? ` <span style="font-size:11px;color:var(--neon-pink);">[密: ${route.password}]</span>` : '';
                a.innerHTML = `<span>${route.name}${pwdTag}</span><span class="status-text">ONLINE</span>`;
                
                // 核心控制：点击时的密码拦截和跳转
                a.addEventListener('click', () => {
                    if (route.password) {
                        // 尝试自动复制密码到剪贴板，极为极客的细节优化
                        navigator.clipboard.writeText(route.password).then(() => {
                            alert(`【提示】该线路下载密码为：${route.password}\n密码已自动复制到您的剪贴板，点击确定前往下载。`);
                            window.open(route.url, '_blank');
                        }).catch(() => {
                            // 兼容浏览器不支持复制的情况
                            alert(`【提示】该线路下载密码为：${route.password}\n请记下密码后点击确定前往下载。`);
                            window.open(route.url, '_blank');
                        });
                    } else {
                        window.open(route.url, '_blank');
                    }
                });
            } else {
                a.className = "route-item disabled";
                a.innerHTML = `<span>${route.name}</span><span class="status-text">OFFLINE</span>`;
            }
            routeContainer.appendChild(a);
        });

        modal.classList.add('active');
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });


    // ==========================================
    // 4. 自定义播放器控制核心 (音量压低至 25%)
    // ==========================================
    const audio = document.getElementById('bgm');
    const playBtn = document.getElementById('play-btn');
    const progress = document.getElementById('progress');
    const progressContainer = document.getElementById('progress-container');

    if (audio && playBtn) {
        audio.volume = 0.25;

        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play().then(() => {
                    playBtn.innerText = 'PAUSE';
                }).catch(err => {
                    console.log("自动播放被拦截:", err);
                });
            } else {
                audio.pause();
                playBtn.innerText = 'PLAY';
            }
        });

        audio.addEventListener('timeupdate', () => {
            if (progress) {
                const percentage = (audio.currentTime / audio.duration) * 100;
                progress.style.width = `${percentage}%`;
            }
        });

        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                const width = progressContainer.clientWidth;
                const clickX = e.offsetX;
                const duration = audio.duration;
                if(duration) {
                    audio.currentTime = (clickX / width) * duration;
                }
            });
        }
    }
});
