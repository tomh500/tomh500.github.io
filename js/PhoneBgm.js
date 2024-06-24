document.addEventListener('DOMContentLoaded', function() {
  var bgm = document.getElementById('bgm');
  var hasInteracted = false;

  function playBGM() {
    if (!hasInteracted) {
      // 只有在首次交互后才播放音频
      bgm.play();
      hasInteracted = true;
    }
  }

  // 监听滑动事件（触摸屏幕）
  window.addEventListener('touchstart', playBGM);

  // 监听点击事件
  document.addEventListener('click', playBGM);

  // 监听鼠标按下事件
  document.addEventListener('mousedown', playBGM);

  // 监听鼠标释放事件
  document.addEventListener('mouseup', playBGM);

  // 监听鼠标移动事件
  document.addEventListener('mousemove', playBGM);

  // 监听触摸结束事件
  window.addEventListener('touchend', playBGM);

  // 监听触摸移动事件
  window.addEventListener('touchmove', playBGM);

  // 监听键盘按下事件
  document.addEventListener('keydown', playBGM);

  // 监听键盘释放事件
  document.addEventListener('keyup', playBGM);

  // 监听键盘按键事件
  document.addEventListener('keypress', playBGM);

  // 监听页面滚动事件
  window.addEventListener('scroll', playBGM);

  // 监听窗口大小变化事件
  window.addEventListener('resize', playBGM);

  // 页面完全加载后，如果音频已加载完成，尝试播放音频（针对可能的自动播放场景）
  window.addEventListener('load', function() {
    if (bgm.readyState >= 3 && !hasInteracted) {
      bgm.play();
      hasInteracted = true;
    }
  });
});