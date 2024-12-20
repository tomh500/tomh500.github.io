 获取弹窗
 modal = document.getElementById("myModal");

// 获取 <span> 元素，关闭弹窗
var span = document.getElementsByClassName("close")[0];

// 获取音频元素
var bgm = document.getElementById("bgm");

// 当页面加载时，打开弹窗
window.onload = function() {
    modal.style.display = "block"; // 显示弹窗
    bgm.play(); // 播放音频
 当点击 <span>x 元素时，关闭弹窗并播放音频
span.onclick = function() {
    modal.style.display = "none";
 当点击弹窗外部时关闭弹窗
window.onclick = function(event) {
 if (event.target ==) {
        modal.display = "none";
 bgm.play(); 播放音频
