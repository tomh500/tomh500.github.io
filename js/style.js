
 modal = document.getElementById("myModal");

// 获取 <span> 元素，关闭弹窗
var span = document.getElementsByClassName("close")[0];

// 获取音频元素
var bgm = document.getElementById("bgm");

// 当页面加载时，打开弹窗
window.onload = function() {
    modal.style.display = "block"; // 显示弹窗
    bgm.play(); // 播放音频
span.onclick = function() {
    modal.style.display = "none";

window.onclick = function(event) {
 if (event.target ==) {
        modal.display = "none";
 bgm.play();
