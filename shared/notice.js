/*
 * 카카오톡 등 앱 내부 브라우저로 열었을 때 안내 배너를 띄웁니다.
 * record.js 다음에 불러오세요:  <script src="/shared/notice.js"></script>
 */
(function () {
  const app = window.ScienceOn && ScienceOn.inAppBrowser();
  if (!app) return;

  const isAndroid = /Android/i.test(navigator.userAgent);
  const bar = document.createElement("div");
  bar.setAttribute("role", "alert");
  bar.style.cssText =
    "position:sticky;top:0;z-index:100;background:#fff4d6;color:#5b4300;border-bottom:1px solid #f0d58a;" +
    "padding:12px 16px;font-size:14px;line-height:1.5;font-family:inherit";

  const text = document.createElement("div");
  text.textContent =
    app + " 안에서 열었어요. 여기서 푼 기록은 크롬/사파리와 따로 저장돼요. " +
    (isAndroid ? "아래 버튼으로 크롬에서 열어 주세요." : "오른쪽 아래 ⋯ 메뉴에서 '다른 브라우저로 열기'를 눌러 주세요.");
  bar.appendChild(text);

  if (isAndroid && app === "카카오톡") {
    const btn = document.createElement("a");
    btn.textContent = "크롬으로 열기";
    btn.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(location.href);
    btn.style.cssText = "display:inline-block;margin-top:8px;padding:6px 12px;border-radius:8px;background:#5b4300;color:#fff;font-weight:600;text-decoration:none";
    bar.appendChild(btn);
  }

  document.addEventListener("DOMContentLoaded", () => document.body.prepend(bar));
})();
