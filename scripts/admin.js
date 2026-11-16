// Админка nmchv account.
// Интерфейс только показывает и отправляет запросы: все права проверяет Supabase
// (RLS + public.is_admin()), поэтому подмена кнопок в браузере ничего не даёт.

const DEFAULT_LEVEL = "member";
const STATUS_LABELS = { available: "Доступен", restricted: "Ограничен", maintenance: "На обслуживании", coming_soon: "Скоро" };
const VISIBILITY_LABELS = { public: "Публичный", private: "Приватный" };
const SHORT_DATE = { day: "numeric", month: "short", year: "numeric" };
const FULL_DATE = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };
const LEGAL_BUCKET = "legal";
const LEGAL_DOCS = [
  { key: "user-agreement", name: "Пользовательское соглашение", file: "user-agreement.pdf" },
  { key: "privacy-policy", name: "Политика конфиденциальности", file: "privacy-policy.pdf" },
  { key: "personal-data-consent", name: "Согласие на обработку персональных данных", file: "personal-data-consent.pdf" }
];

export function createAdmin({ state, escapeHTML: esc, setMarkup, setMetric, setError, clearError, showToast, explainError, formatDate, eventNames }) {
  const root = document.querySelector('[data-view="admin"]');
  const $ = (selector) => root.querySelector(selector);
  const view = { users: [], projects: [], selected: null, tab: "users", search: "", legal: {} };

  const must = (result) => {
    if (result.error) throw result.error;
    return result.data;
  };
  const client = () => state.client;
  const day = (value) => String(value || "").slice(0, 10);

  async function run(task, success) {
    try {
      await task();
      if (success) showToast(success);
    } catch (error) {
      showToast(explainError(error, "Не удалось выполнить действие"), "error");
    }
  }

  // ---------- загрузка и список ----------
  function legalPublicUrl(file) {
    const { data } = client().storage.from(LEGAL_BUCKET).getPublicUrl(file);
    return data?.publicUrl || "";
  }

  async function loadLegalDocs() {
    view.legal = {};
    try {
      const { data, error } = await client().storage.from(LEGAL_BUCKET).list("", { limit: 100, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      const byName = new Map((data || []).map((item) => [item.name, item]));
      for (const doc of LEGAL_DOCS) {
        const item = byName.get(doc.file);
        view.legal[doc.key] = item ? { ...item, url: legalPublicUrl(doc.file) } : null;
      }
    } catch {
      for (const doc of LEGAL_DOCS) view.legal[doc.key] = { error: true, url: legalPublicUrl(doc.file) };
    }
    renderLegalDocs();
  }

  function renderLegalDocs() {
    const container = $("#admin-legal-list");
    if (!container) return;
    setMarkup(container, LEGAL_DOCS.map((doc) => {
      const item = view.legal[doc.key];
      const hasFile = item && !item.error && item.name;
      const url = item?.url || "";
      return `<div class="admin-legal-item" data-legal-key="${esc(doc.key)}">
        <div class="admin-legal-copy">
          <strong>${esc(doc.name)}</strong>
          <span class="muted">${esc(doc.file)}${hasFile && item.updated_at ? ` · обновлён ${esc(formatDate(item.updated_at, SHORT_DATE))}` : ""}${item?.error ? " · не удалось проверить файл в storage" : ""}</span>
          ${hasFile || url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Открыть текущий файл ↗</a>` : '<span class="muted">Файл ещё не загружен</span>'}
        </div>
        <div class="admin-legal-actions">
          <input id="legal-file-${esc(doc.key)}" type="file" accept="application/pdf,.pdf" class="admin-file-input">
          <button class="button button--primary button--small" type="button" data-admin-action="upload-legal" data-key="${esc(doc.key)}" data-file="${esc(doc.file)}">Загрузить</button>
        </div>
      </div>`;
    }).join(""));
  }

  async function uploadLegalDoc(element) {
    const key = element.dataset.key;
    const fileName = element.dataset.file;
    const input = root.querySelector(`#legal-file-${key}`);
    const file = input?.files?.[0];
    if (!file) throw new Error("Выберите PDF-файл для загрузки.");
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endswith(".pdf")) {
      throw new Error("Нужен файл в формате PDF.");
    }
    const { error } = await client().storage.from(LEGAL_BUCKET).upload(fileName, file, {
      upsert: true,
      contentType: "application/pdf",
      cacheControl: "3600"
    });
    if (error) throw error;
    if (input) input.value = "";
    await loadLegalDocs();
    window.dispatchEvent(new CustomEvent("nmchv:legal-docs-updated"));
  }

  async function load() {
    if (!state.isAdmin) return;
    clearError($("#admin-error"));
    try {
      const [users, projects] = await Promise.all([
        client().rpc("admin_list_users").then(must),
        client().from("projects").select("id,slug,name,status,visibility,url").order("name").then(must)
      ]);
      view.users = users || [];
      view.projects = projects || [];
      renderMetrics();
      renderUsers();
      renderProjects();
      await loadLegalDocs();
      if (view.selected) await openUser(view.selected, true);
    } catch (error) {
      setError($("#admin-error"), explainError(error, "Не удалось загрузить данные админки. Применены ли миграции 20261115120000 и 20261115130000?"));
    }
  }

  function renderMetrics() {
    const weekAgo = Date.now() - 7 * 86_400_000;
    const users = view.users;
    setMetric("admin-users", String(users.length));
    setMetric("admin-events", String(users.reduce((sum, user) => sum + Number(user.events_count || 0), 0)));
    setMetric("admin-new", String(users.filter((user) => new Date(user.created_at).getTime() > weekAgo).length));
    setMetric("admin-active", String(users.filter((user) => user.last_activity_at && new Date(user.last_activity_at).getTime() > weekAgo).length));
  }

  function renderUsers() {
    const needle = view.search.trim().toLowerCase();
    const users = needle
      ? view.users.filter((user) => [user.email, user.display_name, user.username].some((value) => String(value || "").toLowerCase().includes(needle)))
      : view.users;
    $("#admin-users-count").textContent = needle ? `Найдено: ${users.length} из ${view.users.length}` : `Всего: ${view.users.length}`;
    if (!users.length) {
      setMarkup($("#admin-users-body"), '<tr><td colspan="6" class="muted">Никого не найдено.</td></tr>');
      return;
    }
    setMarkup($("#admin-users-body"), users.map((user) => `<tr class="is-clickable" data-admin-action="open-user" data-id="${esc(user.id)}">
      <td><strong>${esc(user.display_name || user.username || String(user.email || "").split("@")[0] || "—")}</strong><div class="muted">${esc(user.email || "—")}</div></td>
      <td class="muted">${esc(user.username || "—")}</td>
      <td class="muted">${Number(user.events_count || 0)}</td>
      <td class="muted">${user.last_activity_at ? esc(formatDate(user.last_activity_at, SHORT_DATE)) : "—"}</td>
      <td class="muted">${esc(formatDate(user.created_at, SHORT_DATE))}</td>
      <td><button class="button button--secondary button--small" type="button" data-admin-action="open-user" data-id="${esc(user.id)}">Открыть</button></td>
    </tr>`).join(""));
  }

  // ---------- сервисы ----------
  function renderProjects() {
    const option = (labels, current) => Object.entries(labels).map(([value, label]) => `<option value="${value}"${value === current ? " selected" : ""}>${label}</option>`).join("");
    setMarkup($("#admin-projects-body"), view.projects.map((project) => `<tr data-id="${esc(project.id)}">
      <td><strong>${esc(project.name)}</strong><div class="muted">${esc(project.slug)}</div></td>
      <td><select name="status" class="admin-select" aria-label="Статус">${option(STATUS_LABELS, project.status)}</select></td>
      <td><select name="visibility" class="admin-select" aria-label="Видимость">${option(VISIBILITY_LABELS, project.visibility)}</select></td>
      <td><button class="button button--secondary button--small" type="button" data-admin-action="save-project">Сохранить</button></td>
    </tr>`).join("") || '<tr><td colspan="4" class="muted">Сервисов нет.</td></tr>');
  }

  function showTab(tab) {
    view.tab = tab;
    root.querySelectorAll(".admin-tab").forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
    $("#admin-users-panel").hidden = tab !== "users";
    $("#admin-projects-panel").hidden = tab !== "projects";
    const legalPanel = $("#admin-legal-panel");
    if (legalPanel) legalPanel.hidden = tab !== "legal";
  }

  // ---------- карточка пользователя ----------
  function accessState(row) {
    if (!row) return { key: "none", label: "Нет доступа" };
    if (!row.is_active) return { key: "revoked", label: "Отозван" };
    if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return { key: "expired", label: "Истёк" };
    return { key: "active", label: "Доступ есть" };
  }

  function chart(activities) {
    const counts = new Map();
    for (const item of activities) counts.set(day(item.created_at), (counts.get(day(item.created_at)) || 0) + 1);
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (13 - index));
      const key = date.toISOString().slice(0, 10);
      return { key, label: date.getDate(), count: counts.get(key) || 0 };
    });
    const peak = Math.max(1, ...days.map((item) => item.count));
    return `<div class="activity-chart activity-chart--large" aria-label="Активность за 14 дней">${days.map(({ key, label, count }) => `<div class="chart-day${count ? " has-activity" : ""}" title="${esc(key)}: ${count}"><div class="chart-bar" style="--bar-height:${count ? Math.max(12, Math.round((count / peak) * 100)) : 3}%"></div><span>${label}</span></div>`).join("")}</div>`;
  }

  async function openUser(id, silent = false) {
    view.selected = id;
    $("#admin-list-view").hidden = true;
    const box = $("#admin-user-view");
    box.hidden = false;
    if (!silent) {
      setMarkup(box, '<div class="empty-state"><strong>Загружаем данные пользователя…</strong></div>');
      window.scrollTo({ top: 0 });
    }
    try {
      const c = client();
      const [profile, activity, access, goals, earned, achievements, notifications, attempts, attemptsTotal, services] = await Promise.all([
        c.from("profiles").select("bio,preferred_language,timezone").eq("id", id).maybeSingle().then(must),
        c.from("user_activity").select("event_type,project_id,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(200).then(must),
        c.from("user_project_access").select("project_id,access_level,is_active,expires_at").eq("user_id", id).then(must),
        c.from("user_goals").select("id,title,metric,target_value,current_value,period").eq("user_id", id).order("created_at", { ascending: false }).then(must),
        c.from("user_achievements").select("achievement_id,unlocked_at").eq("user_id", id).then(must),
        c.from("achievements").select("id,name,icon,is_active").order("name").then(must),
        c.from("notifications").select("id,title,body,is_read,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(30).then(must),
        c.from("geotrainer_attempts").select("created_at,legacy_username").eq("user_id", id).order("created_at", { ascending: false }).limit(10).then(must),
        c.from("geotrainer_attempts").select("id", { count: "exact", head: true }).eq("user_id", id).then((result) => { if (result.error) throw result.error; return result.count ?? 0; }),
        c.from("service_data").select("project_id").eq("user_id", id).limit(5000).then(must)
      ]);
      renderUser(id, { profile, activity, access, goals, earned, achievements, notifications, attempts, attemptsTotal, services });
    } catch (error) {
      setMarkup(box, `<button class="button button--secondary button--small" type="button" data-admin-action="back">← К списку</button><div class="inline-error" style="margin-top:14px">${esc(explainError(error, "Не удалось загрузить пользователя"))}</div>`);
    }
  }

  function renderUser(id, data) {
    const user = view.users.find((item) => item.id === id) || {};
    const projectName = (projectId) => view.projects.find((item) => item.id === projectId)?.name || "Сервис";
    const since = Date.now() - 30 * 86_400_000;
    const recent = data.activity.filter((item) => new Date(item.created_at).getTime() >= since);
    const days = new Set(recent.map((item) => day(item.created_at))).size;
    const tests = recent.filter((item) => item.event_type === "test_completed").length;
    const tasks = recent.filter((item) => item.event_type === "lesson_completed").length;
    const name = user.display_name || user.username || String(user.email || "").split("@")[0] || "Пользователь";
    const metric = (label, value, note) => `<article class="metric-card"><div class="metric-top"><span class="metric-label">${esc(label)}</span></div><div class="metric-value">${esc(value)}</div><div class="metric-foot">${esc(note)}</div></article>`;

    const accessByProject = new Map(data.access.map((row) => [row.project_id, row]));
    const accessRows = view.projects.map((project) => {
      const row = accessByProject.get(project.id);
      const status = accessState(row);
      return `<div class="admin-access-row" data-project-id="${esc(project.id)}">
        <div class="admin-access-name"><strong>${esc(project.name)}</strong><span class="muted">${esc(STATUS_LABELS[project.status] || project.status)} · ${esc(VISIBILITY_LABELS[project.visibility] || project.visibility)}</span></div>
        <span class="admin-badge admin-badge--${status.key}">${status.label}</span>
        <label class="admin-mini"><span>Уровень</span><input name="level" maxlength="40" value="${esc(row?.access_level || DEFAULT_LEVEL)}"></label>
        <label class="admin-mini"><span>До (необязательно)</span><input name="expires" type="date" value="${esc(day(row?.expires_at))}"></label>
        <div class="admin-row-actions">
          <button class="button button--primary button--small" type="button" data-admin-action="grant-access">${status.key === "active" ? "Сохранить" : "Выдать"}</button>
          ${status.key === "active" ? '<button class="button button--secondary button--small" type="button" data-admin-action="revoke-access">Отозвать</button>' : ""}
        </div>
      </div>`;
    }).join("") || '<p class="muted">Сервисов нет.</p>';

    const earnedIds = new Set(data.earned.map((item) => item.achievement_id));
    const achievementById = new Map(data.achievements.map((item) => [item.id, item]));
    const earnedRows = data.earned.map((item) => {
      const achievement = achievementById.get(item.achievement_id);
      return `<li class="admin-line"><span>${esc(achievement?.icon || "✦")} ${esc(achievement?.name || "Достижение")}<span class="muted"> · ${esc(formatDate(item.unlocked_at, SHORT_DATE))}</span></span><button class="text-button" type="button" data-admin-action="revoke-achievement" data-id="${esc(item.achievement_id)}">Забрать</button></li>`;
    }).join("");
    const available = data.achievements.filter((item) => item.is_active && !earnedIds.has(item.id));

    const goalRows = data.goals.map((goal) => {
      const percent = Math.min(100, Math.round((Number(goal.current_value) / Math.max(1, Number(goal.target_value))) * 100));
      return `<li class="admin-line"><span>${esc(goal.title)}<span class="muted"> · ${goal.period === "monthly" ? "месяц" : "неделя"}</span></span><span class="muted">${Number(goal.current_value)} из ${Number(goal.target_value)} (${percent}%)</span></li>`;
    }).join("");

    const activityRows = data.activity.slice(0, 30).map((item) => `<li class="admin-line"><span>${esc(eventNames[item.event_type] || item.event_type)}<span class="muted"> · ${esc(projectName(item.project_id))}</span></span><span class="muted">${esc(formatDate(item.created_at, FULL_DATE))}</span></li>`).join("");

    const notificationRows = data.notifications.map((item) => `<li class="admin-line admin-line--block"><span><strong>${esc(item.title)}</strong>${item.is_read ? "" : ' <span class="admin-badge admin-badge--active">не прочитано</span>'}<span class="muted block">${esc(item.body)}</span></span><span class="muted">${esc(formatDate(item.created_at, FULL_DATE))}</span></li>`).join("");

    const serviceCounts = new Map();
    for (const row of data.services) serviceCounts.set(row.project_id, (serviceCounts.get(row.project_id) || 0) + 1);
    const serviceRows = [...serviceCounts].map(([projectId, count]) => `<li class="admin-line"><span>${esc(projectName(projectId))}</span><span class="muted">записей: ${count}</span></li>`).join("");
    const attemptRows = data.attempts.map((item) => `<li class="admin-line"><span>Попытка${item.legacy_username ? `<span class="muted"> · профиль «${esc(item.legacy_username)}»</span>` : ""}</span><span class="muted">${esc(formatDate(item.created_at, FULL_DATE))}</span></li>`).join("");

    setMarkup($("#admin-user-view"), `
      <button class="button button--secondary button--small" type="button" data-admin-action="back">← К списку</button>
      <div class="admin-user-head">
        <div><h2>${esc(name)}</h2><p class="muted">${esc(user.email || "—")} · ${esc(data.profile?.timezone || "часовой пояс не указан")} · язык ${esc((data.profile?.preferred_language || "ru").toUpperCase())}</p>${data.profile?.bio ? `<p class="admin-bio">${esc(data.profile.bio)}</p>` : ""}</div>
        <div class="admin-user-dates muted">Регистрация: ${esc(formatDate(user.created_at, SHORT_DATE))}<br>Последний вход: ${user.last_sign_in_at ? esc(formatDate(user.last_sign_in_at, FULL_DATE)) : "—"}</div>
      </div>
      <div class="metric-grid metric-grid--statistics">
        ${metric("Событий за 30 дней", String(recent.length), "Во всех сервисах")}
        ${metric("Активные дни", String(days), "За 30 дней")}
        ${metric("Завершённые тесты", String(tests), "За 30 дней")}
        ${metric("Выполнено заданий", String(tasks), "За 30 дней")}
      </div>
      <section class="panel page-panel admin-section"><div class="panel-heading"><div><h2>Ритм активности</h2><p>События по дням за последние две недели</p></div></div>${chart(data.activity)}</section>
      <section class="panel page-panel admin-section"><div class="panel-heading"><div><h2>Доступы к сервисам</h2><p>Для сервисов со статусом «Ограничен» доступ нужен, для публичных — по желанию</p></div></div><div class="admin-access">${accessRows}</div></section>
      <div class="admin-two">
        <section class="panel page-panel admin-section"><div class="panel-heading"><div><h2>Достижения</h2><p>Выдать или забрать вручную</p></div></div>
          <ul class="admin-list">${earnedRows || '<li class="muted">Пока нет.</li>'}</ul>
          ${available.length ? `<div class="admin-inline"><select id="admin-achievement" class="admin-select" aria-label="Достижение">${available.map((item) => `<option value="${esc(item.id)}">${esc(item.icon || "✦")} ${esc(item.name)}</option>`).join("")}</select><button class="button button--secondary button--small" type="button" data-admin-action="grant-achievement">Выдать</button></div>` : ""}
        </section>
        <section class="panel page-panel admin-section"><div class="panel-heading"><div><h2>Цели</h2><p>Личные цели пользователя</p></div></div><ul class="admin-list">${goalRows || '<li class="muted">Целей нет.</li>'}</ul></section>
      </div>
      <section class="panel page-panel admin-section"><div class="panel-heading"><div><h2>История активности</h2><p>Последние 30 из ${data.activity.length}${data.activity.length === 200 ? "+" : ""} событий</p></div></div><ul class="admin-list">${activityRows || '<li class="muted">Событий нет.</li>'}</ul></section>
      <div class="admin-two">
        <section class="panel page-panel admin-section"><div class="panel-heading"><div><h2>Данные сервисов</h2><p>Попыток Геотренажёра: ${data.attemptsTotal}</p></div></div><ul class="admin-list">${serviceRows}${attemptRows || (serviceRows ? "" : '<li class="muted">Данных нет.</li>')}</ul></section>
        <section class="panel page-panel admin-section"><div class="panel-heading"><div><h2>Уведомления</h2><p>Отправить пользователю сообщение</p></div></div>
          <div class="admin-notify"><input id="admin-notify-title" maxlength="120" placeholder="Заголовок"><textarea id="admin-notify-body" maxlength="1000" rows="3" placeholder="Текст"></textarea><button class="button button--primary button--small" type="button" data-admin-action="send-notification">Отправить</button></div>
          <ul class="admin-list">${notificationRows || '<li class="muted">Уведомлений нет.</li>'}</ul>
        </section>
      </div>`);
  }

  // ---------- действия ----------
  const refreshUser = () => openUser(view.selected, true);

  async function grantAccess(row) {
    const level = row.querySelector('[name="level"]').value.trim() || DEFAULT_LEVEL;
    const expires = row.querySelector('[name="expires"]').value;
    const expiresAt = expires ? new Date(`${expires}T23:59:59`).toISOString() : null;
    must(await client().from("user_project_access").upsert({
      user_id: view.selected, project_id: row.dataset.projectId, access_level: level, is_active: true, expires_at: expiresAt
    }, { onConflict: "user_id,project_id" }));
    await refreshUser();
  }

  async function revokeAccess(row) {
    must(await client().from("user_project_access").update({ is_active: false }).eq("user_id", view.selected).eq("project_id", row.dataset.projectId));
    await refreshUser();
  }

  async function grantAchievement() {
    const select = $("#admin-achievement");
    if (!select?.value) return;
    must(await client().from("user_achievements").insert({ user_id: view.selected, achievement_id: select.value }));
    await refreshUser();
  }

  async function revokeAchievement(achievementId) {
    must(await client().from("user_achievements").delete().eq("user_id", view.selected).eq("achievement_id", achievementId));
    await refreshUser();
  }

  async function sendNotification() {
    const title = $("#admin-notify-title").value.trim();
    const body = $("#admin-notify-body").value.trim();
    if (!title) throw new Error("Укажите заголовок уведомления.");
    must(await client().from("notifications").insert({ user_id: view.selected, type: "info", title, body }));
    await refreshUser();
  }

  async function saveProject(row) {
    const status = row.querySelector('[name="status"]').value;
    const visibility = row.querySelector('[name="visibility"]').value;
    must(await client().from("projects").update({ status, visibility }).eq("id", row.dataset.id));
    const project = view.projects.find((item) => item.id === row.dataset.id);
    if (project) Object.assign(project, { status, visibility });
  }

  root.addEventListener("click", (event) => {
    const element = event.target.closest("[data-admin-action]");
    if (!element || !state.isAdmin) return;
    const action = element.dataset.adminAction;
    if (action === "tab") return showTab(element.dataset.tab);
    if (action === "open-user") return openUser(element.dataset.id);
    if (action === "back") {
      view.selected = null;
      $("#admin-user-view").hidden = true;
      $("#admin-list-view").hidden = false;
      return;
    }
    const busy = () => { element.disabled = true; return () => { element.disabled = false; }; };
    const done = busy();
    const row = element.closest("[data-project-id], tr[data-id]");
    const tasks = {
      "grant-access": () => run(() => grantAccess(row), "Доступ сохранён."),
      "revoke-access": () => run(() => revokeAccess(row), "Доступ отозван."),
      "grant-achievement": () => run(grantAchievement, "Достижение выдано."),
      "revoke-achievement": () => (window.confirm("Забрать достижение у пользователя?") ? run(() => revokeAchievement(element.dataset.id), "Достижение отозвано.") : Promise.resolve()),
      "send-notification": () => run(sendNotification, "Уведомление отправлено."),
      "save-project": () => run(() => saveProject(row), "Сервис обновлён."),
      "upload-legal": () => run(() => uploadLegalDoc(element), "Документ загружен.")
    };
    (tasks[action]?.() || Promise.resolve()).finally(done);
  });

  $("#admin-search").addEventListener("input", (event) => {
    view.search = event.target.value;
    renderUsers();
  });
  $("#admin-refresh").addEventListener("click", load);

  return { load, reset() { view.selected = null; view.users = []; view.projects = []; } };
}
