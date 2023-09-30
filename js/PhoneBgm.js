
    var audio = new Audio('bgm.ogg'); // 替换为你的音频文件路径

    function playAudio() {
        audio.play();
    }

    // 监听滑动手势
    var startY, endY;
    document.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
    });

    document.addEventListener('touchmove', function(e) {
        endY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', function() {
        // 当滑动距离足够大时，触发音频播放
        if (Math.abs(endY - startY) > 50) {
            playAudio();
        }
    });
