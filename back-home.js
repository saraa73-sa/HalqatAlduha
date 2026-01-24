// إظهار زر العودة
function showBackHome() {
  var box = document.getElementById("backHomeWrapper");
  if (box) {
    box.classList.add("show");
  }
}

// زر الرجوع
document.addEventListener("click", function (e) {
  if (e.target && e.target.id === "backHomeBtn") {
    window.location.href = "index.html"; // الصفحة الرئيسية
  }
});