/*
 * Science On 공통 학습 기록 모듈
 * - 모든 기록은 학생 기기의 브라우저(localStorage)에만 저장되며 서버로 전송하지 않습니다.
 * - science-on.kr 아래(같은 주소)에 있는 앱끼리만 기록이 공유됩니다.
 *
 * 앱에서 사용하는 방법:
 *   <script src="/shared/record.js"></script>
 *   ScienceOn.saveResult({
 *     app: "cell-division-quiz",          // 앱 고유 ID (영문)
 *     appName: "체세포분열 단계 퀴즈",       // 화면에 보일 이름
 *     score: 4, max: 5,                    // 점수 / 만점
 *     standards: [{ code: "[9과21-02]", title: "체세포 분열 과정" }],
 *   });
 */
(function () {
  const KEY = "scienceon:v1";
  const MAX_RECORDS = 3000;

  function empty() {
    return { version: 1, profile: { name: "" }, records: [] };
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (data && Array.isArray(data.records)) return data;
    } catch (e) {}
    return empty();
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function saveResult(r) {
    if (!r || !r.app) throw new Error("app 값이 필요합니다.");
    const max = Number(r.max) || 0;
    const score = Number(r.score) || 0;
    const record = {
      id: uid(),
      app: String(r.app),
      appName: String(r.appName || r.app),
      score,
      max,
      percent: max > 0 ? Math.round((score / max) * 100) : null,
      standards: (r.standards || []).map((s) => ({ code: String(s.code), title: String(s.title || "") })),
      at: new Date().toISOString(),
    };
    const data = load();
    data.records.push(record);
    if (data.records.length > MAX_RECORDS) data.records = data.records.slice(-MAX_RECORDS);
    const ok = save(data);
    requestPersist();
    return ok ? record : null;
  }

  function levelOf(percent) {
    if (percent >= 80) return { key: "done", label: "달성" };
    if (percent >= 50) return { key: "near", label: "거의 다 왔어요" };
    return { key: "try", label: "더 연습해요" };
  }

  // 성취기준별 · 앱별 요약
  function summarize(data) {
    data = data || load();
    const standards = {};
    const apps = {};
    data.records.forEach((r) => {
      const a = (apps[r.app] ||= { app: r.app, appName: r.appName, count: 0, best: null, last: null });
      a.appName = r.appName;
      a.count++;
      if (r.percent != null && (a.best == null || r.percent > a.best)) a.best = r.percent;
      if (!a.last || r.at > a.last) a.last = r.at;

      r.standards.forEach((s) => {
        const st = (standards[s.code] ||= { code: s.code, title: s.title, count: 0, best: null, last: null, apps: new Set() });
        if (s.title) st.title = s.title;
        st.count++;
        st.apps.add(r.appName);
        if (r.percent != null && (st.best == null || r.percent > st.best)) st.best = r.percent;
        if (!st.last || r.at > st.last) st.last = r.at;
      });
    });
    const byCode = (a, b) => a.code.localeCompare(b.code);
    return {
      standards: Object.values(standards)
        .map((s) => ({ ...s, apps: [...s.apps], level: levelOf(s.best ?? 0) }))
        .sort(byCode),
      apps: Object.values(apps).sort((a, b) => (b.last || "").localeCompare(a.last || "")),
      total: data.records.length,
    };
  }

  function setProfile(profile) {
    const data = load();
    data.profile = { ...data.profile, ...profile };
    return save(data);
  }

  function exportData() {
    return JSON.stringify({ ...load(), exportedAt: new Date().toISOString() }, null, 2);
  }

  // 백업 파일 불러오기: 기존 기록과 합치고 중복(id 기준)은 건너뜀
  function importData(text) {
    const incoming = JSON.parse(text);
    if (!incoming || !Array.isArray(incoming.records)) throw new Error("Science On 백업 파일이 아닙니다.");
    const data = load();
    const seen = new Set(data.records.map((r) => r.id));
    let added = 0;
    incoming.records.forEach((r) => {
      if (r && r.id && r.app && !seen.has(r.id)) {
        data.records.push(r);
        seen.add(r.id);
        added++;
      }
    });
    data.records.sort((a, b) => a.at.localeCompare(b.at));
    if (!data.profile.name && incoming.profile && incoming.profile.name) data.profile.name = incoming.profile.name;
    save(data);
    return added;
  }

  function clearAll() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  // 브라우저가 저장 공간을 임의로 지우지 않도록 요청 (지원하는 브라우저에서만)
  function requestPersist() {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    } catch (e) {}
  }

  function storageAvailable() {
    try {
      localStorage.setItem("scienceon:test", "1");
      localStorage.removeItem("scienceon:test");
      return true;
    } catch (e) {
      return false;
    }
  }

  // 카카오톡 등 앱 내부 브라우저 감지 (기록이 따로 저장되므로 안내용)
  function inAppBrowser() {
    const ua = navigator.userAgent || "";
    if (/KAKAOTALK/i.test(ua)) return "카카오톡";
    if (/NAVER\(inapp/i.test(ua)) return "네이버";
    if (/Instagram/i.test(ua)) return "인스타그램";
    if (/FBAN|FBAV/i.test(ua)) return "페이스북";
    if (/Line\//i.test(ua)) return "라인";
    return null;
  }

  window.ScienceOn = {
    saveResult, getData: load, summarize, levelOf, setProfile,
    exportData, importData, clearAll, requestPersist, storageAvailable, inAppBrowser,
  };
})();
