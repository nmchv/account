import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

const icons = {
  overview: '<rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/>',
  projects: '<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>',
  activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  statistics: '<path d="M4 19V5"/><path d="M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/>',
  achievements: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  notifications: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  security: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
  login: '<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  device: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
  key: '<circle cx="8" cy="15" r="5"/><path d="m11.5 11.5 8-8 2 2-2 2 2 2-3 3-2-2-3 3"/>'
};

const pageNames = {
  overview: "Обзор", projects: "Проекты", activity: "Активность", statistics: "Статистика",
  achievements: "Достижения", goals: "Цели", notifications: "Уведомления", profile: "Профиль", security: "Безопасность"
};
const eventNames = {
  login: "Вход в аккаунт", test_started: "Начат тест", test_completed: "Тест завершён",
  lesson_completed: "Урок завершён", course_completed: "Курс завершён",
  achievement_unlocked: "Получено достижение", goal_completed: "Цель выполнена"
};
const projectStatuses = {
  available: "Доступен", restricted: "Ограничен", coming_soon: "Скоро", maintenance: "На обслуживании"
};
const state = {
  client: null,
  user: null,
  profile: null,
  projects: null,
  projectsError: null,
  activities: null,
  activitiesError: null,
  achievements: null,
  achievementsError: null,
  goals: null,
  goalsError: null,
  notifications: null,
  notificationsError: null,
  authMode: "login",
  loading: false
};

function icon(name, className = "") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.overview}</svg>`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function setMarkup(element, markup) {
  if (element) element.innerHTML = markup;
}

function formatDate(value, options = { day: "numeric", month: "short" }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", options).format(date);
}

function relativeDate(value) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Дата не указана";
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return "Сегодня";
  if (days === 1) return "Вчера";
  return formatDate(value);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " is-error" : ""}`;
  toast.textContent = message;
  document.querySelector("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function setError(element, message) {
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
}

function clearError(element) {
  if (!element) return;
  element.textContent = "";
  element.hidden = true;
}

function requireClient() {
  if (!state.client) throw new Error("Сначала подключите Supabase в scripts/config.js.");
  if (!state.user) throw new Error("Войдите в аккаунт, чтобы продолжить.");
}

function explainError(error, context) {
  const detail = error?.message || String(error);
  return `${context}: ${detail}`;
}

function showEmpty(message, description, action = "") {
  return `<div class="empty-state"><span class="empty-state-icon">${icon("activity")}</span><strong>${escapeHTML(message)}</strong><p>${escapeHTML(description)}</p>${action}</div>`;
}

function showFailure(message) {
  return `<div class="inline-error">${escapeHTML(message)}</div>`;
}

function setMetric(id, value, note) {
  const metric = document.getElementById(id);
  if (metric) metric.textContent = value;
  if (note) {
    const noteElement = document.getElementById(note.id);
    if (noteElement) noteElement.textContent = note.text;
  }
}

function renderStaticIcons() {
  document.querySelectorAll("[data-icon]").forEach((element) => {
    const name = element.dataset.icon;
    if (icons[name]) element.innerHTML = icon(name);
  });
}

function renderChart(target, activities) {
  if (!target) return;
  const countByDay = new Map();
  for (const activity of activities || []) {
    const day = new Date(activity.created_at).toISOString().slice(0, 10);
    countByDay.set(day, (countByDay.get(day) || 0) + 1);
  }
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, label: new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(date), count: countByDay.get(key) || 0 };
  });
  const peak = Math.max(1, ...days.map(({ count }) => count));
  setMarkup(target, days.map(({ key, label, count }) => {
    const height = count === 0 ? 3 : Math.max(12, Math.round((count / peak) * 100));
    const dayName = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(`${key}T12:00:00`));
    return `<div class="chart-day${count ? " has-activity" : ""}" title="${escapeHTML(dayName)}: ${count} событий"><div class="chart-bar" style="--bar-height:${height}%"></div><span>${label}</span></div>`;
  }).join(""));
  const legend = target.id === "activity-chart" ? target.parentElement?.nextElementSibling?.querySelector("span:first-child") : null;
  if (legend) legend.innerHTML = `<i></i> ${activities?.length ? "События активности" : "Нет данных об активности"}`;
}

function renderSignedOut() {
  document.querySelector("#signed-out-banner").hidden = false;
  document.querySelector("#overview-action").hidden = false;
  document.querySelector("#sidebar-name").textContent = "Гость";
  document.querySelector("#sidebar-email").textContent = state.client ? "Войдите в аккаунт" : "Подключите Supabase";
  setAvatar(document.querySelector("#sidebar-avatar"), "n");
  setAvatar(document.querySelector("#topbar-avatar"), "n");
  setAvatar(document.querySelector("#profile-avatar"), "n");
  document.querySelector("#profile-heading").textContent = "Профиль";
  document.querySelector("#profile-email").textContent = "Войдите, чтобы управлять профилем";
  document.querySelector("#security-email").textContent = "Не подключена";
  document.querySelector("#session-description").textContent = "Данные появятся после входа";
  document.querySelector("#email-verified").textContent = "—";
  document.querySelector("#profile-status").textContent = "Не подключён";
  document.querySelector("#profile-status").classList.remove("is-connected");
  document.querySelector("#profile-data-error").hidden = true;
  document.querySelector("#profile-data-error").textContent = "";
  document.querySelector("#statistics-error").hidden = true;
  document.querySelector("#statistics-error").textContent = "";
  document.querySelector("#profile-form").querySelectorAll("input, textarea, select, button").forEach((input) => { input.disabled = true; });
  document.querySelector("#signout-current").disabled = true;
  document.querySelector("#signout-button").disabled = true;
  document.querySelector("#overview-description").textContent = "Всё, что важно в экосистеме nmchv — в одном месте.";
  setMetric("metric-projects", "—", { id: "metric-projects-note", text: "Подключите аккаунт" });
  setMarkup(document.querySelector("#overview-projects"), showEmpty("Войдите в аккаунт", "Список проектов появится после авторизации."));
  setMarkup(document.querySelector("#projects-grid"), showEmpty("Проекты пока не подключены", "Войдите, чтобы увидеть сервисы, к которым у вас есть доступ.", '<button class="button button--secondary button--small" type="button" data-auth="login">Войти в аккаунт</button>'));
  setMarkup(document.querySelector("#recent-activity"), showEmpty("Пока тихо", "Ваши события появятся здесь после входа."));
  setMarkup(document.querySelector("#activity-list"), showEmpty("Нет событий", "Войдите, чтобы посмотреть историю активности."));
  setMarkup(document.querySelector("#achievements-grid"), showEmpty("Достижения появятся здесь", "Они начисляются за подтверждённую активность в сервисах."));
  setMarkup(document.querySelector("#goals-grid"), showEmpty("Задайте свой ритм", "Войдите, чтобы создавать личные цели.", '<button class="button button--secondary button--small" type="button" data-auth="login">Войти в аккаунт</button>'));
  setMarkup(document.querySelector("#notifications-list"), showEmpty("Нет уведомлений", "Войдите, чтобы получать важные обновления аккаунта."));
  for (const id of ["metric-tasks", "metric-score", "metric-time", "stats-events", "stats-days", "stats-tests", "stats-tasks"]) setMetric(id, "—");
  setMarkup(document.querySelector("#activity-chart"), "");
  setMarkup(document.querySelector("#statistics-chart"), "");
  const chartLegend = document.querySelector("#activity-chart").parentElement.nextElementSibling.querySelector("span:first-child");
  chartLegend.innerHTML = `<i></i> Нет данных об активности`;
}

function renderProjectCards(projects, compact = false) {
  if (!projects?.length) {
    return showEmpty("Проекты ещё не подключены", "Когда появятся доступные сервисы, они будут собраны здесь.");
  }
  return projects.map((project) => {
    const status = String(project.status || "").toLowerCase();
    const statusName = projectStatuses[status] || "Статус не указан";
    const destination = safeProjectUrl(project.url);
    const hasProjectAccess = status === "available" || (status === "restricted" && project.access_level);
    const allowed = Boolean(hasProjectAccess && destination);
    const title = escapeHTML(project.name || "Без названия");
    const description = escapeHTML(project.description || "Описание проекта не добавлено.");
    const slug = escapeHTML(project.slug || project.name || "?");
    const access = project.access_level ? `Доступ: ${escapeHTML(project.access_level)}` : "Публичный проект";
    const statusClass = status === "restricted" ? " project-status--restricted" : status === "maintenance" ? " project-status--maintenance" : "";
    return `<article class="project-card${compact ? " project-card--compact" : ""}">
      <div class="project-card-top"><span class="project-symbol">${escapeHTML(String(project.icon || slug).slice(0, 1).toUpperCase())}</span><span class="project-status${statusClass}">${escapeHTML(statusName)}</span></div>
      <h3>${title}</h3><p>${description}</p>
      <div class="project-card-footer"><span class="project-access">${access}</span>${allowed ? `<a class="project-open" href="${escapeHTML(destination)}" target="_blank" rel="noopener noreferrer">Открыть <span aria-hidden="true">↗</span></a>` : '<span class="project-open is-disabled">Недоступен</span>'}</div>
    </article>`;
  }).join("");
}

function safeProjectUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function safeAvatarUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function setAvatar(element, name, avatarUrl = "") {
  const initial = name.slice(0, 1).toUpperCase() || "n";
  const imageUrl = safeAvatarUrl(avatarUrl);
  if (!imageUrl) {
    element.textContent = initial;
    return;
  }
  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = "";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => { element.textContent = initial; }, { once: true });
  element.replaceChildren(image);
}

function renderActivity(activities, target) {
  if (!target) return;
  if (!activities?.length) {
    setMarkup(target, showEmpty("Пока нет событий", "Подключённые сервисы будут добавлять подтверждённую активность."));
    return;
  }
  setMarkup(target, activities.map((activity) => {
    const title = eventNames[activity.event_type] || "Активность в проекте";
    const project = state.projects?.find((item) => item.id === activity.project_id)?.name;
    return `<div class="activity-row"><span class="activity-symbol">${icon("activity")}</span><span class="activity-copy"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(project || "Экосистема nmchv")}</span></span><time class="activity-time" datetime="${escapeHTML(activity.created_at)}">${escapeHTML(relativeDate(activity.created_at))}</time></div>`;
  }).join(""));
}

function renderOverview() {
  document.querySelector("#signed-out-banner").hidden = Boolean(state.user);
  document.querySelector("#overview-action").hidden = Boolean(state.user);
  if (!state.user) return renderSignedOut();
  const displayName = state.profile?.display_name || state.profile?.username || state.user.email?.split("@")[0] || "Пользователь";
  document.querySelector("#overview-description").textContent = `${displayName}, ваша активность в экосистеме nmchv.`;
  document.querySelector("#metric-projects-note").textContent = state.projectsError ? "Не удалось загрузить" : "С доступом к аккаунту";
  setMetric("metric-projects", state.projects ? String(state.projects.length) : "—");
  setMetric("metric-tasks", "—", { id: "metric-tasks-note", text: "Нет подтверждённых данных" });
  setMetric("metric-score", "—");
  setMetric("metric-time", "—");
  if (state.projectsError) {
    setMarkup(document.querySelector("#overview-projects"), showFailure(state.projectsError));
    setMarkup(document.querySelector("#projects-grid"), showFailure(state.projectsError));
  } else {
    const cards = renderProjectCards(state.projects || [], true);
    setMarkup(document.querySelector("#overview-projects"), cards);
    setMarkup(document.querySelector("#projects-grid"), renderProjectCards(state.projects || []));
  }
  if (state.activitiesError) {
    setError(document.querySelector("#statistics-error"), state.activitiesError);
    setMarkup(document.querySelector("#recent-activity"), showFailure(state.activitiesError));
    setMarkup(document.querySelector("#activity-list"), showFailure(state.activitiesError));
    setMarkup(document.querySelector("#activity-chart"), "");
  } else {
    clearError(document.querySelector("#statistics-error"));
    renderActivity((state.activities || []).slice(0, 4), document.querySelector("#recent-activity"));
    renderActivity(state.activities || [], document.querySelector("#activity-list"));
    renderChart(document.querySelector("#activity-chart"), state.activities || []);
    renderChart(document.querySelector("#statistics-chart"), state.activities || []);
    renderStatistics(state.activities || []);
  }
  renderAchievements();
  renderGoals();
  renderNotifications();
}

function renderStatistics(activities) {
  const dates = new Set(activities.map((item) => new Date(item.created_at).toISOString().slice(0, 10)));
  const tests = activities.filter((item) => item.event_type === "test_completed").length;
  const tasks = activities.filter((item) => item.event_type === "lesson_completed").length;
  const capped = activities.length === 500;
  setMetric("stats-events", String(activities.length), { id: "stats-events-note", text: capped ? "Показаны последние 500 событий" : "За последние 30 дней" });
  setMetric("stats-days", String(dates.size));
  setMetric("stats-tests", String(tests));
  setMetric("stats-tasks", String(tasks));
}

function renderAchievements() {
  const target = document.querySelector("#achievements-grid");
  if (state.achievementsError) return setMarkup(target, showFailure(state.achievementsError));
  if (!state.achievements) return setMarkup(target, showEmpty("Достижения появятся здесь", "Они начисляются за подтверждённую активность в сервисах."));
  if (!state.achievements.length) return setMarkup(target, showEmpty("Пока нет достижений", "Новые результаты появятся здесь по мере учёбы."));
  setMarkup(target, state.achievements.map(({ achievement, unlocked_at }) => `<article class="achievement-card"><span class="achievement-icon">${escapeHTML(achievement.icon || "✦")}</span><h3>${escapeHTML(achievement.name)}</h3><p>${escapeHTML(achievement.description || "")}</p><time class="achievement-date" datetime="${escapeHTML(unlocked_at)}">Получено ${escapeHTML(formatDate(unlocked_at))}</time></article>`).join(""));
}

function renderGoals() {
  const target = document.querySelector("#goals-grid");
  if (state.goalsError) return setMarkup(target, showFailure(state.goalsError));
  if (!state.goals) return setMarkup(target, showEmpty("Задайте свой ритм", "Создайте цель, которая подходит именно вам.", '<button class="button button--secondary button--small" type="button" data-action="add-goal">Новая цель</button>'));
  if (!state.goals.length) return setMarkup(target, showEmpty("Целей пока нет", "Небольшие, понятные шаги помогают учиться регулярно.", '<button class="button button--secondary button--small" type="button" data-action="add-goal">Создать первую цель</button>'));
  setMarkup(target, state.goals.map((goal) => {
    const current = Math.max(0, Number(goal.current_value) || 0);
    const targetValue = Math.max(1, Number(goal.target_value) || 1);
    const percent = Math.min(100, Math.round((current / targetValue) * 100));
    const period = goal.period === "monthly" ? "В месяц" : "На неделю";
    return `<article class="goal-card"><div class="goal-card-top"><span class="project-symbol">${icon(goal.metric === "minutes" ? "clock" : "goals")}</span><span class="goal-period">${period}</span></div><h3>${escapeHTML(goal.title)}</h3><p>${escapeHTML(goal.metric === "minutes" ? "Учебное время" : goal.metric === "tests" ? "Завершённые тесты" : "Выполненные задания")}</p><div class="goal-progress"><span style="width:${percent}%"></span></div><div class="goal-foot"><span>${current} из ${targetValue}</span><span>${percent}%</span></div></article>`;
  }).join(""));
}

function renderNotifications() {
  const target = document.querySelector("#notifications-list");
  const badge = document.querySelector("#notification-count");
  const indicator = document.querySelector("#notification-indicator");
  if (state.notificationsError) {
    setMarkup(target, showFailure(state.notificationsError));
    badge.hidden = true;
    indicator.hidden = true;
    return;
  }
  const notifications = state.notifications || [];
  const unread = notifications.filter((item) => !item.is_read).length;
  badge.hidden = unread === 0;
  badge.textContent = String(unread);
  indicator.hidden = unread === 0;
  if (!notifications.length) return setMarkup(target, showEmpty("Новых уведомлений нет", "Здесь появятся обновления аккаунта и ваших проектов."));
  setMarkup(target, notifications.map((item) => `<article class="notification-row${item.is_read ? "" : " is-unread"}"><span class="notification-dot"></span><div class="notification-copy"><h3>${escapeHTML(item.title || "Уведомление")}</h3><p>${escapeHTML(item.body || "")}</p><time datetime="${escapeHTML(item.created_at)}">${escapeHTML(formatDate(item.created_at, { day: "numeric", month: "long", year: "numeric" }))}</time></div>${item.is_read ? "" : `<button class="notification-read" type="button" data-action="read-notification" data-id="${escapeHTML(item.id)}">Прочитано</button>`}</article>`).join(""));
}

function updateProfileUI() {
  const profile = state.profile || {};
  const email = state.user?.email || "";
  const displayName = profile.display_name || profile.username || email.split("@")[0] || "Пользователь";
  document.querySelector("#sidebar-name").textContent = displayName;
  document.querySelector("#sidebar-email").textContent = email;
  setAvatar(document.querySelector("#sidebar-avatar"), displayName, profile.avatar_url);
  setAvatar(document.querySelector("#topbar-avatar"), displayName, profile.avatar_url);
  setAvatar(document.querySelector("#profile-avatar"), displayName, profile.avatar_url);
  document.querySelector("#profile-heading").textContent = displayName;
  document.querySelector("#profile-email").textContent = email;
  document.querySelector("#security-email").textContent = email || "Не подключена";
  document.querySelector("#session-description").textContent = state.user ? "Вы вошли на этом устройстве." : "Данные появятся после входа";
  const verified = Boolean(state.user?.email_confirmed_at);
  document.querySelector("#email-verified").textContent = verified ? "Подтверждена" : "Не подтверждена";
  document.querySelector("#email-verified").classList.toggle("is-verified", verified);
  document.querySelector("#profile-status").textContent = state.user ? "Подключён" : "Не подключён";
  document.querySelector("#profile-status").classList.toggle("is-connected", Boolean(state.user));
  const profileError = document.querySelector("#profile-data-error");
  profileError.textContent = state.profileError || "";
  profileError.hidden = !state.profileError;
  document.querySelectorAll("#profile-form input, #profile-form textarea, #profile-form select, #profile-form button").forEach((input) => { input.disabled = !state.user; });
  document.querySelector("#signout-current").disabled = !state.user;
  const form = document.querySelector("#profile-form");
  for (const [name, value] of Object.entries({
    display_name: profile.display_name || "",
    username: profile.username || "",
    avatar_url: profile.avatar_url || "",
    bio: profile.bio || "",
    preferred_language: profile.preferred_language || "ru",
    timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  })) form.elements.namedItem(name).value = value;
  document.querySelector("#signout-button").disabled = !state.user;
}

function setConnectionStatus(kind, text) {
  const status = document.querySelector("#connection-status");
  status.classList.toggle("is-connected", kind === "connected");
  status.classList.toggle("is-error", kind === "error");
  status.lastElementChild.textContent = text;
}

function getClientConfig() {
  const url = SUPABASE_URL.trim();
  const key = SUPABASE_ANON_KEY.trim();
  if (!url && !key) return { configured: false, error: null };
  try {
    const parsedUrl = new URL(url);
    if (!["https:", "http:"].includes(parsedUrl.protocol) || !parsedUrl.hostname) throw new Error();
  } catch {
    return { configured: false, error: "Некорректный адрес Supabase в scripts/config.js." };
  }
  if (!key) return { configured: false, error: "Добавьте публичный Supabase anon/publishable key в scripts/config.js." };
  return { configured: true, url, key, error: null };
}

async function loadProjects() {
  const { data: publicProjects, error: publicError } = await state.client.from("projects")
    .select("id,slug,name,description,icon,url,category,status,visibility")
    .eq("visibility", "public");
  if (publicError) throw new Error(explainError(publicError, "Не удалось загрузить реестр проектов"));
  const { data: accessRows, error: accessError } = await state.client.from("user_project_access")
    .select("project_id,access_level,is_active,expires_at")
    .eq("user_id", state.user.id)
    .eq("is_active", true);
  if (accessError) throw new Error(explainError(accessError, "Не удалось проверить доступ к проектам"));
  const validAccess = (accessRows || []).filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now());
  const privateIds = validAccess.map((row) => row.project_id).filter(Boolean);
  let restrictedProjects = [];
  if (privateIds.length) {
    const { data, error } = await state.client.from("projects")
      .select("id,slug,name,description,icon,url,category,status,visibility")
      .in("id", privateIds);
    if (error) throw new Error(explainError(error, "Не удалось загрузить доступные проекты"));
    restrictedProjects = data || [];
  }
  const accessByProject = new Map(validAccess.map((row) => [row.project_id, row.access_level]));
  const merged = new Map();
  for (const project of publicProjects || []) merged.set(project.id, { ...project, access_level: accessByProject.get(project.id) });
  for (const project of restrictedProjects) merged.set(project.id, { ...project, access_level: accessByProject.get(project.id) });
  return [...merged.values()].filter((project) => {
    const status = String(project.status).toLowerCase();
    return ["available", "maintenance"].includes(status)
      || (status === "restricted" && accessByProject.has(project.id))
      || (status === "coming_soon" && project.visibility === "public");
  });
}

async function loadUserData() {
  if (!state.client || !state.user) return;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const work = [
    ["profile", state.client.from("profiles").select("username,display_name,avatar_url,bio,preferred_language,timezone").eq("id", state.user.id).maybeSingle()],
    ["projects", loadProjects()],
    ["activities", state.client.from("user_activity").select("event_type,project_id,created_at").eq("user_id", state.user.id).gte("created_at", since).order("created_at", { ascending: false }).limit(500)],
    ["achievements", loadAchievements()],
    ["goals", state.client.from("user_goals").select("id,title,metric,target_value,current_value,period,created_at").eq("user_id", state.user.id).order("created_at", { ascending: false })],
    ["notifications", state.client.from("notifications").select("id,type,title,body,is_read,created_at").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(50)]
  ];
  const results = await Promise.allSettled(work.map(([, request]) => request));
  for (let index = 0; index < work.length; index += 1) {
    const [key] = work[index];
    const result = results[index];
    if (result.status === "rejected") {
      state[`${key}Error`] = explainError(result.reason, `Не удалось загрузить ${key === "profile" ? "профиль" : key}`);
      if (key === "profile") state.profile = null;
      else state[key] = null;
      continue;
    }
    const value = result.value;
    if (value?.error) {
      state[`${key}Error`] = explainError(value.error, `Не удалось загрузить ${key === "profile" ? "профиль" : key}`);
      state[key === "activities" ? "activities" : key] = null;
    } else {
      state[`${key}Error`] = null;
      state[key] = key === "activities" ? value.data || [] : value.data;
    }
  }
  updateProfileUI();
  renderOverview();
}

async function loadAchievements() {
  const { data: earned, error: earnedError } = await state.client.from("user_achievements")
    .select("achievement_id,unlocked_at")
    .eq("user_id", state.user.id)
    .order("unlocked_at", { ascending: false });
  if (earnedError) return { error: earnedError };
  if (!earned?.length) return { data: [] };
  const { data: definitions, error: definitionsError } = await state.client.from("achievements")
    .select("id,name,description,icon")
    .eq("is_active", true)
    .in("id", earned.map((item) => item.achievement_id));
  if (definitionsError) return { error: definitionsError };
  const byId = new Map((definitions || []).map((item) => [item.id, item]));
  return { data: earned.map((item) => ({ achievement: byId.get(item.achievement_id), unlocked_at: item.unlocked_at })).filter((item) => item.achievement) };
}

function clearUserData() {
  state.profile = null;
  state.profileError = null;
  state.profileError = null;
  state.projects = null;
  state.projectsError = null;
  state.activities = null;
  state.activitiesError = null;
  state.achievements = null;
  state.achievementsError = null;
  state.goals = null;
  state.goalsError = null;
  state.notifications = null;
  state.notificationsError = null;
}

function renderAuthMode() {
  const title = document.querySelector("#auth-title");
  const description = document.querySelector("#auth-description");
  const password = document.querySelector("#password-field");
  const passwordInput = password.querySelector("input");
  const submit = document.querySelector("#auth-submit");
  const footer = document.querySelector("#auth-footer");
  const modes = {
    login: ["С возвращением", "Войдите, чтобы продолжить.", "Войти", true, "current-password"],
    register: ["Создайте аккаунт", "Один аккаунт для проектов экосистемы nmchv.", "Зарегистрироваться", true, "new-password"],
    reset: ["Восстановить доступ", "Отправим ссылку для сброса пароля на вашу почту.", "Отправить ссылку", false, "email"]
  };
  const [heading, text, label, showPassword, autocomplete] = modes[state.authMode];
  title.innerHTML = `${escapeHTML(heading)}<span class="heading-period">.</span>`;
  description.textContent = text;
  password.hidden = !showPassword;
  passwordInput.required = showPassword;
  passwordInput.autocomplete = autocomplete;
  submit.textContent = label;
  footer.hidden = state.authMode === "reset";
}

function openAuth(mode = "login") {
  state.authMode = mode;
  clearError(document.querySelector("#auth-error"));
  renderAuthMode();
  const configNote = document.querySelector("#auth-config-note");
  configNote.hidden = Boolean(state.client);
  configNote.textContent = state.configError || state.connectionError || "Авторизация пока не подключена. Укажите публичные параметры Supabase в scripts/config.js.";
  document.querySelector("#auth-submit").disabled = !state.client;
  const dialog = document.querySelector("#auth-dialog");
  if (!dialog.open) dialog.showModal();
}

function openRoute(route) {
  const page = pageNames[route] ? route : "overview";
  document.querySelectorAll("[data-view]").forEach((view) => view.classList.toggle("is-active", view.dataset.view === page));
  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.dataset.route === page;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelector("#current-breadcrumb").textContent = pageNames[page];
  document.title = `${pageNames[page]} — nmchv Account`;
  if (!hasAuthCallback()) {
    const url = new URL(location.href);
    url.hash = page;
    history.replaceState(null, "", url);
  }
  closeSidebar();
}

function hasAuthCallback() {
  const callbackKeys = ["code", "access_token", "refresh_token", "token_hash", "type", "error", "error_description"];
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.slice(1));
  return callbackKeys.some((key) => query.has(key) || fragment.has(key));
}

function getAuthRedirectUrl() {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  return url.href;
}

function closeSidebar() {
  document.querySelector("#sidebar").classList.remove("is-open");
  document.querySelector("#sidebar-backdrop").classList.remove("is-visible");
  document.querySelector("#menu-button").setAttribute("aria-expanded", "false");
}

function openGoalDialog() {
  clearError(document.querySelector("#goal-error"));
  const dialog = document.querySelector("#goal-dialog");
  if (!dialog.open) dialog.showModal();
}

async function submitAuth(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.elements.namedItem("email").value.trim();
  const password = form.elements.namedItem("password").value;
  const error = document.querySelector("#auth-error");
  clearError(error);
  if (!state.client) return setError(error, "Авторизация не настроена. Добавьте URL и публичный ключ Supabase в scripts/config.js.");
  const button = document.querySelector("#auth-submit");
  button.disabled = true;
  try {
    if (state.authMode === "register") {
      const { error: signupError } = await state.client.auth.signUp({ email, password, options: { emailRedirectTo: getAuthRedirectUrl() } });
      if (signupError) throw signupError;
      document.querySelector("#auth-dialog").close();
      showToast("Проверьте почту, чтобы подтвердить адрес.");
    } else if (state.authMode === "reset") {
      const { error: resetError } = await state.client.auth.resetPasswordForEmail(email, { redirectTo: getAuthRedirectUrl() });
      if (resetError) throw resetError;
      document.querySelector("#auth-dialog").close();
      showToast("Если адрес зарегистрирован, письмо для восстановления уже отправлено.");
    } else {
      const { error: loginError } = await state.client.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      document.querySelector("#auth-dialog").close();
      showToast("Вы вошли в аккаунт.");
    }
  } catch (authError) {
    setError(error, authError?.message || "Не удалось выполнить запрос авторизации.");
  } finally {
    button.disabled = false;
  }
}

async function saveProfile(event) {
  event.preventDefault();
  try {
    requireClient();
    const form = event.currentTarget;
    const avatarValue = form.elements.namedItem("avatar_url").value.trim();
    const avatarUrl = safeAvatarUrl(avatarValue);
    if (avatarValue && !avatarUrl) throw new Error("Ссылка на аватар должна быть корректным HTTPS-адресом.");
    const profile = {
      id: state.user.id,
      display_name: form.elements.namedItem("display_name").value.trim(),
      username: form.elements.namedItem("username").value.trim() || null,
      avatar_url: avatarUrl,
      bio: form.elements.namedItem("bio").value.trim(),
      preferred_language: form.elements.namedItem("preferred_language").value,
      timezone: form.elements.namedItem("timezone").value.trim()
    };
    const { data, error } = await state.client.from("profiles").upsert(profile, { onConflict: "id" }).select("username,display_name,avatar_url,bio,preferred_language,timezone").single();
    if (error) throw error;
    state.profile = data;
    updateProfileUI();
    renderOverview();
    showToast("Профиль сохранён.");
  } catch (error) {
    showToast(explainError(error, "Не удалось сохранить профиль"), "error");
  }
}

async function createGoal(event) {
  event.preventDefault();
  const errorTarget = document.querySelector("#goal-error");
  clearError(errorTarget);
  try {
    requireClient();
    const form = event.currentTarget;
    const goal = {
      user_id: state.user.id,
      title: form.elements.namedItem("title").value.trim(),
      metric: form.elements.namedItem("metric").value,
      target_value: Number(form.elements.namedItem("target_value").value),
      current_value: 0,
      period: form.elements.namedItem("period").value
    };
    if (!goal.title || !Number.isInteger(goal.target_value) || goal.target_value < 1) throw new Error("Укажите название и целое значение цели больше нуля.");
    const { data, error } = await state.client.from("user_goals").insert(goal)
      .select("id,title,metric,target_value,current_value,period,created_at").single();
    if (error) throw error;
    state.goals = [data, ...(state.goals || [])];
    renderGoals();
    document.querySelector("#goal-dialog").close();
    form.reset();
    showToast("Цель создана.");
  } catch (error) {
    setError(errorTarget, explainError(error, "Не удалось создать цель"));
  }
}

async function markNotificationRead(id) {
  try {
    requireClient();
    const { error } = await state.client.from("notifications").update({ is_read: true })
      .eq("id", id).eq("user_id", state.user.id);
    if (error) throw error;
    state.notifications = (state.notifications || []).map((item) => item.id === id ? { ...item, is_read: true } : item);
    renderNotifications();
  } catch (error) {
    showToast(explainError(error, "Не удалось обновить уведомление"), "error");
  }
}

async function signOut(scope) {
  if (!state.client || !state.user) return;
  const message = scope === "global" ? "Выйти из аккаунта на всех устройствах?" : "Выйти из аккаунта на этом устройстве?";
  if (!window.confirm(message)) return;
  try {
    const { error } = await state.client.auth.signOut({ scope });
    if (error) throw error;
  } catch (error) {
    showToast(explainError(error, "Не удалось завершить сессию"), "error");
  }
}

async function changePassword() {
  if (!state.client || !state.user) return openAuth("login");
  const newPassword = window.prompt("Введите новый пароль (не менее 8 символов):");
  if (newPassword === null) return;
  if (newPassword.length < 8) return showToast("Пароль должен содержать не менее 8 символов.", "error");
  try {
    const { error } = await state.client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    showToast("Пароль успешно изменён.");
  } catch (error) {
    showToast(explainError(error, "Не удалось изменить пароль"), "error");
  }
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const authButton = event.target.closest("[data-auth]");
    if (authButton) {
      event.preventDefault();
      if (authButton.dataset.auth === "reset" && state.user) return changePassword();
      openAuth(authButton.dataset.auth);
      return;
    }
    const routeButton = event.target.closest("[data-navigate]");
    if (routeButton) return openRoute(routeButton.dataset.navigate);
    const action = event.target.closest("[data-action]");
    if (action?.dataset.action === "add-goal") {
      if (!state.user) return openAuth("login");
      openGoalDialog();
    }
    if (action?.dataset.action === "read-notification") markNotificationRead(action.dataset.id);
    const nav = event.target.closest("[data-route]");
    if (nav) {
      event.preventDefault();
      openRoute(nav.dataset.route);
    }
  });
  document.querySelector("#auth-form").addEventListener("submit", submitAuth);
  document.querySelector("#profile-form").addEventListener("submit", saveProfile);
  document.querySelector("#goal-form").addEventListener("submit", createGoal);
  document.querySelector("#user-chip").addEventListener("click", () => openRoute("profile"));
  document.querySelector("#signout-current").addEventListener("click", () => signOut("local"));
  document.querySelector("#signout-button").addEventListener("click", () => signOut("global"));
  document.querySelector("#menu-button").addEventListener("click", () => {
    const open = document.querySelector("#sidebar").classList.toggle("is-open");
    document.querySelector("#sidebar-backdrop").classList.toggle("is-visible", open);
    document.querySelector("#menu-button").setAttribute("aria-expanded", String(open));
  });
  document.querySelector("#sidebar-backdrop").addEventListener("click", closeSidebar);
  document.querySelector("#add-goal-button").addEventListener("click", () => state.user ? openGoalDialog() : openAuth("login"));
  document.querySelector("#auth-dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  document.querySelector("#goal-dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
  document.querySelector("#auth-footer").addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth]");
    if (button) openAuth(button.dataset.auth);
  });
  window.addEventListener("hashchange", () => openRoute(location.hash.slice(1)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });
}

async function initialize() {
  renderStaticIcons();
  bindEvents();
  openRoute(location.hash.slice(1) || "overview");
  const config = getClientConfig();
  if (config.error) {
    setConnectionStatus("error", "Проверьте настройки");
    state.configError = config.error;
    renderSignedOut();
    return;
  }
  if (!config.configured) {
    setConnectionStatus("error", "Supabase не подключён");
    renderSignedOut();
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
      navigator.serviceWorker.register("./sw.js").catch((error) => console.error("Не удалось зарегистрировать service worker:", error));
    }
    return;
  }
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    state.client = createClient(config.url, config.key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
    });
    setConnectionStatus("connected", "Supabase подключён");
    document.querySelector("#auth-submit").disabled = false;
    document.querySelector("#auth-config-note").hidden = true;
    const { data: { session }, error } = await state.client.auth.getSession();
    if (error) throw error;
    state.user = session?.user || null;
    if (state.user) {
      await loadUserData();
    } else {
      renderSignedOut();
    }
    state.client.auth.onAuthStateChange((_event, sessionState) => {
      window.setTimeout(() => {
        state.user = sessionState?.user || null;
        if (state.user) {
          loadUserData().catch((error) => showToast(explainError(error, "Не удалось обновить данные"), "error"));
          updateProfileUI();
        } else {
          clearUserData();
          updateProfileUI();
          renderSignedOut();
        }
      }, 0);
    });
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
      navigator.serviceWorker.register("./sw.js").catch((error) => console.error("Не удалось зарегистрировать service worker:", error));
    }
  } catch (error) {
    setConnectionStatus("error", "Нет соединения");
    state.connectionError = explainError(error, "Не удалось подключиться к Supabase");
    state.client = null;
    renderSignedOut();
    showToast(explainError(error, "Не удалось подключиться к Supabase"), "error");
    console.error("Ошибка подключения nmchv Account:", error);
  }
}

initialize().catch((error) => {
  setConnectionStatus("error", "Ошибка приложения");
  showToast(explainError(error, "Не удалось запустить кабинет"), "error");
  console.error("Ошибка запуска nmchv Account:", error);
});
