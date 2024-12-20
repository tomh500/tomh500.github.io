// 获取弹窗var modal = document.getElementById("myModal");

// 获取按钮，打开弹窗
var btn document.getElementById("myBtn");

// 获取 <span> 元素，关闭弹窗
var span = document.getElementsClassName("close")[];

// 获取音频元素
var bgm = document.getElementById("bgm");

// 当按钮时，打开弹窗
btn.onclick = function() {
    modal.style.display = "";
 当点击 <span> (x 元素时，关闭弹窗并播放音频
span.onclick = function()    modal.style.display =none";
    bgm.play(); // 播放频
 当弹窗外部时关闭弹窗并音频
window.onclick = function(event) {
 if (event.target modal) {
        modal.style.display = "none";
        bgm.play(); //放音频
