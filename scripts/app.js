import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";
import { createAdmin } from "./admin.js";

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
  logout: '<path d="M14 17l5-5-5-5M19 12H8"/><path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  key: '<circle cx="8" cy="15" r="5"/><path d="m11.5 11.5 8-8 2 2-2 2 2 2-3 3-2-2-3 3"/>'
};

const pageNames = {
  overview: "Обзор", projects: "Сервисы", activity: "Активность", statistics: "Статистика",
  achievements: "Достижения", goals: "Цели", notifications: "Уведомления", profile: "Профиль",
  settings: "Настройки", security: "Безопасность", admin: "Админка"
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
  isAdmin: false,
  pendingAdmin: false,
  authMode: "login",
  loading: false,
  chartDays: 14,
  chartProject: "all",
  geoAttempts: [],
  geoLink: null,
  geoLinkError: null,
  tasks: [],
  weather: null
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

function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    const day = dateKey(activity.created_at);
    countByDay.set(day, (countByDay.get(day) || 0) + 1);
  }
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    const key = dateKey(date);
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

function getGreeting(timezone) {
  let hour = new Date().getHours();
  if (timezone) {
    try {
      hour = Number(new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: timezone
      }).format(new Date()));
    } catch (error) {
      console.warn("Некорректный часовой пояс профиля:", error);
    }
  }
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

const weatherDescriptions = {
  0: "Ясно", 1: "Преимущественно ясно", 2: "Переменная облачность", 3: "Облачно",
  45: "Туман", 48: "Изморозь", 51: "Морось", 53: "Морось", 55: "Сильная морось",
  56: "Ледяная морось", 57: "Ледяная морось", 61: "Небольшой дождь", 63: "Дождь",
  65: "Сильный дождь", 66: "Ледяной дождь", 67: "Ледяной дождь", 71: "Небольшой снег",
  73: "Снег", 75: "Сильный снег", 77: "Снежные зёрна", 80: "Ливень", 81: "Ливень",
  82: "Сильный ливень", 85: "Снегопад", 86: "Сильный снегопад", 95: "Гроза",
  96: "Гроза с градом", 99: "Сильная гроза"
};

async function loadWeather() {
  if (!state.user) return;
  const city = (readProfilePrefs().weather_city || "").trim() || "Ростов-на-Дону";
  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.search = new URLSearchParams({ name: city, count: "1", language: "ru", format: "json" });
  const geocodeResponse = await fetch(geocodeUrl);
  if (!geocodeResponse.ok) throw new Error(`Сервис поиска города ответил ${geocodeResponse.status}.`);
  const geocode = await geocodeResponse.json();
  const place = geocode.results?.[0];
  if (!place) throw new Error(`Не удалось найти город «${city}».`);

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,cloud_cover,pressure_msl,uv_index",
    daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    forecast_hours: "24",
    timezone: "auto"
  });
  const forecastResponse = await fetch(forecastUrl);
  if (!forecastResponse.ok) throw new Error(`Сервис погоды ответил ${forecastResponse.status}.`);
  const forecast = await forecastResponse.json();
  const current = forecast.current;
  if (!current) throw new Error("Сервис погоды не вернул текущие показатели.");

  state.weather = {
    ...current,
    city: place.name,
    admin1: place.admin1 || "",
    sunrise: forecast.daily?.sunrise?.[0],
    sunset: forecast.daily?.sunset?.[0],
    tMax: forecast.daily?.temperature_2m_max?.[0],
    tMin: forecast.daily?.temperature_2m_min?.[0],
    uvMax: forecast.daily?.uv_index_max?.[0],
    precipProb: forecast.daily?.precipitation_probability_max?.[0],
    hourly: (forecast.hourly?.time || []).slice(0, 12).map((time, i) => ({
      time,
      temp: forecast.hourly.temperature_2m?.[i],
      prob: forecast.hourly.precipitation_probability?.[i],
      code: forecast.hourly.weather_code?.[i]
    }))
  };
  const description = weatherDescriptions[current.weather_code] || "Переменная погода";
  const rainy = current.precipitation > 0 || current.weather_code >= 51;
  const cloudy = (current.cloud_cover ?? 0) > 40 || (current.weather_code >= 2 && current.weather_code < 51);
  document.querySelector("#weather-city").textContent = `${place.name}${place.admin1 ? `, ${place.admin1}` : ""}`;
  document.querySelector("#weather-summary").textContent = description;
  document.querySelector("#weather-temperature").textContent = `${Math.round(current.temperature_2m)}°`;
  document.querySelector("#weather-updated").textContent = `Ощущается как ${Math.round(current.apparent_temperature)}°`;
  const card = document.querySelector("#weather-card");
  if (card) {
    card.classList.toggle("is-rainy", rainy);
    card.classList.toggle("is-night", !current.is_day);
    card.classList.toggle("is-cloudy", cloudy);
    card.classList.toggle("is-clear", !rainy && !cloudy);
  }
  document.querySelector("#weather-dialog-title").textContent = place.name;
  document.querySelector("#weather-detail-temperature").textContent = `${Math.round(current.temperature_2m)}°`;
  document.querySelector("#weather-detail-summary").textContent = description;
  document.querySelector("#weather-detail-icon").textContent = rainy ? "☂" : current.is_day ? "☀" : "☾";
  const details = [
    ["Ощущается как", `${Math.round(current.apparent_temperature)}°`],
    ["Влажность", `${Math.round(current.relative_humidity_2m)}%`],
    ["Ветер", `${Math.round(current.wind_speed_10m)} км/ч`],
    ["Осадки", `${Number(current.precipitation).toLocaleString("ru-RU")} мм`],
    ["Облачность", `${Math.round(current.cloud_cover ?? 0)}%`],
    ["Давление", current.pressure_msl ? `${Math.round(current.pressure_msl)} гПа` : "—"],
    ["УФ-индекс", current.uv_index != null ? String(Math.round(current.uv_index)) : "—"],
    ["Вероятность осадков", state.weather.precipProb != null ? `${Math.round(state.weather.precipProb)}%` : "—"],
    ["Макс. / мин.", state.weather.tMax != null ? `${Math.round(state.weather.tMax)}° / ${Math.round(state.weather.tMin)}°` : "—"],
    ["Восход", state.weather.sunrise ? formatDate(state.weather.sunrise, { hour: "2-digit", minute: "2-digit" }) : "—"],
    ["Закат", state.weather.sunset ? formatDate(state.weather.sunset, { hour: "2-digit", minute: "2-digit" }) : "—"]
  ];
  const detailCards = details.map(([label, value]) => `<div><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join("");
  const hourly = (state.weather.hourly || []).filter((h) => h.time);
  const hourlyBlock = hourly.length ? `<div class="weather-hourly"><h3>Почасовой прогноз</h3><div class="weather-hourly-track">${hourly.map((h) => `<div class="weather-hourly-item"><span>${escapeHTML(formatDate(h.time, { hour: "2-digit", minute: "2-digit" }))}</span><strong>${h.temp != null ? Math.round(h.temp) + "°" : "—"}</strong><small>${h.prob != null ? Math.round(h.prob) + "%" : ""}</small></div>`).join("")}</div></div>` : "";
  setMarkup(document.querySelector("#weather-details"), `${detailCards}${hourlyBlock}`);
  const visual = document.querySelector("#weather-dialog-visual");
  if (visual) visual.className = `weather-dialog-visual ${!current.is_day ? "is-night" : rainy ? "is-rainy" : cloudy ? "is-cloudy" : "is-clear"}`;
  const weatherError = document.querySelector("#weather-error");
  if (weatherError) weatherError.hidden = true;
}

function renderStreak(activities) {
  const activeDates = new Set(activities.map((item) => dateKey(item.created_at)));
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    return { date, active: activeDates.has(dateKey(date)) };
  });
  let streak = 0;
  for (const day of [...days].reverse()) {
    if (!day.active) break;
    streak += 1;
  }
  const unit = streak === 1 ? "день подряд" : streak > 1 && streak < 5 ? "дня подряд" : "дней подряд";
  document.querySelector("#streak-count").textContent = `${streak} ${unit}`;
  setMarkup(document.querySelector("#streak-days"), days.map(({ date, active }) => `<div class="streak-day${active ? " is-active" : ""}" title="${escapeHTML(formatDate(date, { day: "numeric", month: "long" }))}: ${active ? "учились" : "без занятий"}"><span>${escapeHTML(new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date))}</span><i>${date.getDate()}</i></div>`).join(""));
}

function extractAccuracyValues(value, depth = 0) {
  if (!value || depth > 5) return [];
  if (Array.isArray(value)) {
    const answerFlags = value.map((item) => item && typeof item === "object"
      ? item.is_correct ?? item.isCorrect ?? item.correct
      : undefined).filter((flag) => typeof flag === "boolean");
    if (answerFlags.length === value.length && answerFlags.length > 0) {
      return [Math.round(answerFlags.filter(Boolean).length / answerFlags.length * 100)];
    }
    return value.flatMap((item) => extractAccuracyValues(item, depth + 1));
  }
  if (typeof value !== "object") return [];
  const entries = Object.entries(value);
  const normalized = new Map(entries.map(([key, item]) => [key.toLowerCase(), item]));
  const accuracyKey = ["accuracy", "accuracy_percent", "percentage", "percent_correct"].find((key) => normalized.has(key));
  if (accuracyKey) {
    const numeric = Number(normalized.get(accuracyKey));
    if (Number.isFinite(numeric) && numeric >= 0) return [Math.round(numeric <= 1 ? numeric * 100 : Math.min(numeric, 100))];
  }
  const correctValue = normalized.get("correct_answers") ?? normalized.get("correct_count") ?? normalized.get("correct");
  const totalValue = normalized.get("total_answers") ?? normalized.get("total_count") ?? normalized.get("total");
  const correct = Number(correctValue);
  const total = Number(totalValue);
  const ownAccuracy = correctValue !== undefined && totalValue !== undefined && Number.isFinite(correct)
    && Number.isFinite(total) && total > 0 ? Math.round(correct / total * 100) : null;
  return [
    ...(ownAccuracy === null ? [] : [ownAccuracy]),
    ...entries.flatMap(([, item]) => extractAccuracyValues(item, depth + 1))
  ];
}

function renderInteractiveStatistics() {
  const activities = state.activities || [];
  const since = Date.now() - state.chartDays * 86_400_000;
  const selectedProject = state.chartProject;
  const filtered = activities.filter((item) => new Date(item.created_at).getTime() >= since
    && (selectedProject === "all" || item.project_id === selectedProject));
  const counts = new Map();
  for (const activity of filtered) {
    const day = dateKey(activity.created_at);
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  const days = Array.from({ length: state.chartDays }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (state.chartDays - 1 - index));
    return { count: counts.get(dateKey(date)) || 0, date };
  });
  const width = 800;
  const height = 220;
  const max = Math.max(1, ...days.map(({ count }) => count));
  const points = days.map(({ count }, index) => ({
    x: 16 + (index / Math.max(1, days.length - 1)) * (width - 32),
    y: height - 20 - (count / max) * (height - 46),
    count
  }));
  const line = points.map(({ x, y }, index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points.at(-1)?.x || 0},${height - 20} L${points[0]?.x || 0},${height - 20} Z`;
  const labels = days.filter((_, index) => index % Math.ceil(days.length / 7) === 0 || index === days.length - 1)
    .map(({ date }) => `<span>${escapeHTML(formatDate(date, { day: "numeric", month: "short" }))}</span>`).join("");
  const svg = `<svg class="stats-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="График активности за ${state.chartDays} дней">
    <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#6b91ed" stop-opacity=".28"/><stop offset="1" stop-color="#6b91ed" stop-opacity="0"/></linearGradient></defs>
    ${[0, 1, 2, 3].map((row) => `<line x1="0" x2="${width}" y1="${30 + row * 50}" y2="${30 + row * 50}" class="chart-grid-line"/>`).join("")}
    <path d="${area}" fill="url(#chart-fill)"/><path d="${line}" class="chart-line"/>
    ${points.map(({ x, y, count }, index) => `<circle class="chart-point${count ? " has-value" : ""}" data-index="${index}" tabindex="0" role="button" aria-label="${escapeHTML(formatDate(days[index].date, { day: "numeric", month: "long" }))}: ${count} событий" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${count ? 5 : 3}"><title>${escapeHTML(formatDate(days[index].date, { day: "numeric", month: "long" }))}: ${count} событий</title></circle>`).join("")}
  </svg><div class="chart-x-labels">${labels}</div><div class="chart-insight" id="chart-insight">Нажмите на точку графика, чтобы увидеть день</div>`;
  setMarkup(document.querySelector("#statistics-chart"), svg);
  const serviceFilters = document.querySelector("#chart-services");
  const options = [{ id: "all", name: "Все сервисы" }, ...(state.projects || []).map(({ id, name }) => ({ id, name }))];
  setMarkup(serviceFilters, options.map(({ id, name }) => `<button class="chart-filter${selectedProject === id ? " is-active" : ""}" type="button" data-project="${escapeHTML(id)}">${escapeHTML(name)}</button>`).join(""));
  document.querySelectorAll("[data-chart-days]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.chartDays) === state.chartDays);
  });

  const countsByProject = new Map();
  for (const activity of activities) countsByProject.set(activity.project_id, (countsByProject.get(activity.project_id) || 0) + 1);
  const breakdown = (state.projects || []).filter((project) => project.slug !== "geotrainer").map((project) => {
    const count = countsByProject.get(project.id) || 0;
    const percentage = activities.length ? Math.round((count / activities.length) * 100) : 0;
    const last = activities.find((item) => item.project_id === project.id);
    return `<article class="stats-service panel"><div><strong>${escapeHTML(project.name)}</strong><span>${count} событий · ${percentage}% активности</span></div><div class="stats-service-track"><i style="width:${percentage}%"></i></div><small>${last ? `Последнее событие: ${escapeHTML(relativeDate(last.created_at))}` : "Пока без активности"}</small></article>`;
  }).join("");
  const geoProject = state.projects?.find((project) => project.slug === "geotrainer");
  let geoCard = "";
  if (state.geoAttemptsError) {
    geoCard = `<div class="inline-error">${escapeHTML(state.geoAttemptsError)}</div>`;
  } else if (geoProject) {
    const attempts = state.geoAttempts || [];
    const accuracy = attempts.flatMap((attempt) => extractAccuracyValues(attempt.attempt_data));
    const average = accuracy.length ? Math.round(accuracy.reduce((sum, value) => sum + value, 0) / accuracy.length) : null;
    const link = state.geoLink;
    const linkNote = link ? `Связан с логином «${escapeHTML(link.legacy_name || link.legacy_key || "")}» (${escapeHTML(link.email || "")})` : "Логин Геотренажёра не связан — откройте кабинет в Геотренажёре, чтобы привязать";
    geoCard = `<article class="stats-service panel"><div><strong>GeoTrainer</strong><span>${attempts.length} попыток · ${average === null ? "нет данных о точности" : `${average}% средняя точность`}</span></div><div class="stats-service-track"><i style="width:${average ?? 0}%"></i></div><small>${linkNote}${attempts[0] ? ` · последняя попытка: ${escapeHTML(relativeDate(attempts[0].created_at))}` : ""}</small></article>`;
  }
  setMarkup(document.querySelector("#stats-breakdown"), `${geoCard}${breakdown}` || showEmpty("Сервисы появятся здесь", "Подключённые сервисы будут добавлены автоматически."));
}


function extractLearningSeconds(value, depth = 0) {
  if (!value || depth > 5) return 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + extractLearningSeconds(item, depth + 1), 0);
  if (typeof value !== "object") return 0;
  const entries = Object.entries(value);
  const lower = new Map(entries.map(([k, v]) => [String(k).toLowerCase(), v]));
  let best = 0;
  const toSeconds = (raw, unit) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    if (unit === "ms") return n / 1000;
    if (unit === "min") return n * 60;
    if (unit === "hour") return n * 3600;
    return n > 1e7 ? n / 1000 : n > 1e4 ? n / 1000 : n > 7200 && String(raw).length > 6 ? n / 1000 : n;
  };
  const rules = [
    [/millisecond|_ms$|ms$/, "ms"],
    [/(minute|min)/, "min"],
    [/(hour|hr)/, "hour"],
    [/(second|sec|duration|time_spent|elapsed|spent|active_time|session_time|training_time|study_time)/, "sec"]
  ];
  for (const [key, val] of lower.entries()) {
    if (val && typeof val === "object") continue;
    for (const [re, unit] of rules) {
      if (re.test(key)) { best = Math.max(best, toSeconds(val, unit)); break; }
    }
  }
  for (const [, val] of entries) best = Math.max(best, extractLearningSeconds(val, depth + 1));
  return best;
}

function formatLearningTime(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  if (!sec) return null;
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  if (hours >= 100) return `${hours} ч`;
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  if (minutes > 0) return `${minutes} мин`;
  return `${sec} с`;
}

function renderLearningTime() {
  const target = document.querySelector("#metric-time");
  if (!target) return;
  let total = 0;
  for (const attempt of (state.geoAttempts || [])) total += extractLearningSeconds(attempt.attempt_data || attempt);
  const formatted = formatLearningTime(total);
  if (formatted) {
    setMetric("metric-time", formatted, { id: "metric-time-note", text: "Общее время активных занятий во всех сервисах" });
  } else {
    setMetric("metric-time", "—", { id: "metric-time-note", text: "Нет данных о длительности занятий" });
  }
}

function renderSignedOut() {
  document.querySelector("#logout-button").hidden = true;
  if (document.querySelector('[data-view="admin"]').classList.contains("is-active")) openRoute("overview");
  document.querySelector("#auth-screen").hidden = false;
  document.querySelector("#auth-form").querySelectorAll("input, button").forEach((input) => { input.disabled = !state.client; });
  document.querySelector("#auth-form").querySelectorAll("input").forEach((input) => { input.required = input.name !== "display_name" && !input.closest("#legal-consents"); });
  document.querySelector("#auth-form").reset();
  state.authMode = "login";
  renderAuthMode();
  document.querySelector("#signed-out-banner").hidden = false;
  document.querySelector("#overview-action").hidden = false;
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
  document.querySelector("#overview-greeting").innerHTML = `Добрый день<span class="heading-period">.</span>`;
  const weatherError = document.querySelector("#weather-error");
  if (weatherError) weatherError.hidden = true;
  document.querySelector("#weather-city").textContent = "Ростов-на-Дону";
  document.querySelector("#weather-summary").textContent = "Погода появится после входа";
  document.querySelector("#weather-temperature").textContent = "—°";
  document.querySelector("#weather-updated").textContent = "Укажите город в профиле";
  document.querySelector("#streak-count").textContent = "0 дней подряд";
  setMarkup(document.querySelector("#streak-days"), "");
  setMarkup(document.querySelector("#stats-breakdown"), "");
  setMarkup(document.querySelector("#chart-services"), "");
  setMarkup(document.querySelector("#overview-projects"), showEmpty("Войдите в аккаунт", "Список сервисов появится после авторизации."));
  setMarkup(document.querySelector("#projects-grid"), showEmpty("Сервисы пока не подключены", "Войдите, чтобы увидеть сервисы, к которым у вас есть доступ.", '<button class="button button--secondary button--small" type="button" data-auth="login">Войти в аккаунт</button>'));
  setMarkup(document.querySelector("#recent-activity"), showEmpty("Пока тихо", "Ваши события появятся здесь после входа."));
  setMarkup(document.querySelector("#activity-list"), showEmpty("Нет событий", "Войдите, чтобы посмотреть историю активности."));
  setMarkup(document.querySelector("#achievements-grid"), showEmpty("Достижения появятся здесь", "Они начисляются за подтверждённую активность в сервисах."));
  setMarkup(document.querySelector("#goals-grid"), showEmpty("Задайте свой ритм", "Войдите, чтобы создавать личные цели.", '<button class="button button--secondary button--small" type="button" data-auth="login">Войти в аккаунт</button>'));
  setMarkup(document.querySelector("#notifications-list"), showEmpty("Нет уведомлений", "Войдите, чтобы получать важные обновления аккаунта."));
  for (const id of ["metric-time", "stats-events", "stats-days", "stats-tests", "stats-tasks"]) setMetric(id, "—");
  setMetric("metric-time", "—", { id: "metric-time-note", text: "Общее время активных занятий во всех сервисах" });
  setMarkup(document.querySelector("#activity-chart"), "");
  setMarkup(document.querySelector("#statistics-chart"), "");
  state.weather = null;
  state.tasks = [];
  state.geoAttempts = [];
  state.geoAttemptsError = null;
  state.geoLink = null;
  state.geoLinkError = null;
  const chartLegend = document.querySelector("#activity-chart").parentElement.nextElementSibling.querySelector("span:first-child");
  chartLegend.innerHTML = `<i></i> Нет данных об активности`;
}

function renderProjectCards(projects, compact = false) {
  if (!projects?.length) {
    return showEmpty("Сервисы ещё не подключены", "Когда появятся доступные сервисы, они будут собраны здесь.");
  }
  return projects.map((project) => {
    const status = String(project.status || "").toLowerCase();
    const statusName = projectStatuses[status] || "Статус не указан";
    const destination = safeProjectUrl(project.url);
    const hasProjectAccess = status === "available" || (status === "restricted" && project.access_level);
    const allowed = Boolean(hasProjectAccess && destination);
    const title = escapeHTML(project.name || "Без названия");
    const description = escapeHTML(project.description || "Описание сервиса не добавлено.");
    const slug = escapeHTML(project.slug || project.name || "?");
    const access = project.access_level ? `Доступ: ${escapeHTML(project.access_level)}` : "Публичный сервис";
    const lastActivity = state.activities?.find((item) => item.project_id === project.id);
    const statusClass = status === "restricted" ? " project-status--restricted" : status === "maintenance" ? " project-status--maintenance" : "";
    return `<article class="project-card${compact ? " project-card--compact" : ""}">
      <div class="project-card-top"><span class="project-symbol">${escapeHTML(String(project.icon || slug).slice(0, 1).toUpperCase())}</span><span class="project-status${statusClass}">${escapeHTML(statusName)}</span></div>
      <h3>${title}</h3><p>${description}</p>
      <div class="project-card-footer"><span class="project-access">${access}</span>${allowed ? `<a class="project-open" href="${escapeHTML(destination)}" target="_blank" rel="noopener noreferrer">Открыть <span aria-hidden="true">↗</span></a>` : '<span class="project-open is-disabled">Недоступен</span>'}</div>
      <small class="project-last-activity">${lastActivity ? `Последняя активность: ${escapeHTML(relativeDate(lastActivity.created_at))}` : "Пока без активности"}</small>
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
    const title = eventNames[activity.event_type] || "Активность в сервисе";
    const project = state.projects?.find((item) => item.id === activity.project_id)?.name;
    return `<div class="activity-row"><span class="activity-symbol">${icon("activity")}</span><span class="activity-copy"><strong>${escapeHTML(title)}</strong><span>${escapeHTML(project || "Экосистема nmchv")}</span></span><time class="activity-time" datetime="${escapeHTML(activity.created_at)}">${escapeHTML(relativeDate(activity.created_at))}</time></div>`;
  }).join(""));
}

function renderOverview() {
  document.querySelector("#signed-out-banner").hidden = Boolean(state.user);
  document.querySelector("#overview-action").hidden = Boolean(state.user);
  if (!state.user) return renderSignedOut();
  const authScreen = document.querySelector("#auth-screen");
  if (authScreen) authScreen.hidden = true;
  const displayName = state.profile?.display_name || state.profile?.username || state.user.email?.split("@")[0] || "Пользователь";
  document.querySelector("#overview-greeting").innerHTML = `${escapeHTML(getGreeting(state.profile?.timezone))}, ${escapeHTML(displayName)}<span class="heading-period">.</span>`;
  document.querySelector("#overview-description").textContent = `${displayName}, ваша активность в экосистеме nmchv.`;
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
    renderStreak(state.activities || []);
    renderStatistics(state.activities || []);
    renderInteractiveStatistics();
  }
  renderLearningTime();
  renderAchievements();
  renderGoals();
  renderNotifications();
  loadWeather().catch((error) => {
    const message = explainError(error, "Не удалось загрузить погоду");
    const weatherError = document.querySelector("#weather-error");
    if (weatherError) setError(weatherError, message);
    const summary = document.querySelector("#weather-summary");
    if (summary) summary.textContent = "Погода временно недоступна";
    console.error(message, error);
  });
}

function renderStatistics(activities) {
  const since = Date.now() - 30 * 86_400_000;
  const recent = activities.filter((item) => new Date(item.created_at).getTime() >= since);
  const dates = new Set(recent.map((item) => dateKey(item.created_at)));
  const tests = recent.filter((item) => item.event_type === "test_completed").length;
  const tasks = recent.filter((item) => item.event_type === "lesson_completed").length;
  const capped = activities.length === 500;
  setMetric("stats-events", String(recent.length), { id: "stats-events-note", text: capped ? "Показаны последние 500 событий" : "За последние 30 дней" });
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
    const tasks = (state.tasks || []).filter((task) => task.goal_id === goal.id);
    return `<article class="goal-card"><div class="goal-card-top"><span class="project-symbol">${icon(goal.metric === "minutes" ? "clock" : "goals")}</span><span class="goal-period">${period}</span></div><h3>${escapeHTML(goal.title)}</h3><p>${escapeHTML(goal.metric === "minutes" ? "Учебное время" : goal.metric === "tests" ? "Завершённые тесты" : "Выполненные задания")}</p><div class="goal-progress"><span style="width:${percent}%"></span></div><div class="goal-foot"><span>${current} из ${targetValue}</span><span>${percent}%</span></div><div class="goal-tasks">${tasks.map((task) => `<label class="goal-task${task.is_completed ? " is-complete" : ""}"><input type="checkbox" data-action="toggle-task" data-id="${escapeHTML(task.id)}" ${task.is_completed ? "checked" : ""}><span>${escapeHTML(task.title)}${task.due_at ? `<small>Срок: ${escapeHTML(formatDate(`${task.due_at}T12:00:00`, { day: "numeric", month: "short" }))}</small>` : ""}</span><button type="button" data-action="delete-task" data-id="${escapeHTML(task.id)}" aria-label="Удалить задачу">×</button></label>`).join("")}</div><button class="text-button goal-add-task" type="button" data-action="add-task" data-goal-id="${escapeHTML(goal.id)}">＋ Добавить задачу</button></article>`;
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
  const prefs = readProfilePrefs();
  const form = document.querySelector("#profile-form");
  for (const [name, value] of Object.entries({
    display_name: profile.display_name || "",
    username: profile.username || "",
    avatar_url: profile.avatar_url || "",
    bio: profile.bio || "",
    preferred_language: profile.preferred_language || "ru",
    timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    weather_city: prefs.weather_city || profile.weather_city || "Ростов-на-Дону"
  })) {
    const field = form.elements.namedItem(name);
    if (field) field.value = value;
  }
  const privacy = document.querySelector("#privacy-toggle");
  if (privacy) privacy.checked = prefs.privacy !== false;
  const avatarFile = form.elements.namedItem("avatar_file");
  if (avatarFile) avatarFile.value = "";
  document.querySelector("#signout-button").disabled = !state.user;
  document.querySelector("#logout-button").hidden = !state.user;
  syncThemeSelect();
}

function setConnectionStatus(kind, text) {
  const status = document.querySelector("#connection-status");
  if (!status) return;
  status.classList.toggle("is-connected", kind === "connected");
  status.classList.toggle("is-error", kind === "error");
  if (status.lastElementChild) status.lastElementChild.textContent = text;
}

const LEGAL_BUCKET = "legal";
const LEGAL_DOCS = [
  { key: "user-agreement", file: "user-agreement.pdf" },
  { key: "privacy-policy", file: "privacy-policy.pdf" },
  { key: "personal-data-consent", file: "personal-data-consent.pdf" }
];

function applyLegalDocLinks(map = {}) {
  for (const doc of LEGAL_DOCS) {
    const link = document.querySelector(`[data-legal-key="${doc.key}"]`);
    if (!link) continue;
    const url = map[doc.key];
    if (url) {
      link.href = url;
      link.removeAttribute("aria-disabled");
      link.title = "Открыть документ";
    } else {
      link.href = "#";
      link.setAttribute("aria-disabled", "true");
      link.title = "Документ будет доступен после публикации";
    }
  }
}

async function loadLegalDocs() {
  const map = {};
  if (state.client) {
    for (const doc of LEGAL_DOCS) {
      try {
        const { data } = state.client.storage.from(LEGAL_BUCKET).getPublicUrl(doc.file);
        map[doc.key] = data?.publicUrl || "";
      } catch {
        map[doc.key] = "";
      }
    }
  }
  applyLegalDocLinks(map);
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
    ["notifications", state.client.from("notifications").select("id,type,title,body,is_read,created_at").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(50)],
    ["geoAttempts", state.client.from("geotrainer_attempts").select("created_at,attempt_data").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(50)],
    ["geoLink", state.client.from("geotrainer_links").select("legacy_key,legacy_name,email,linked_at,updated_at").eq("user_id", state.user.id).maybeSingle()]
  ];
  state.tasks = readTasks();
  const results = await Promise.allSettled(work.map(([, request]) => request));
  for (let index = 0; index < work.length; index += 1) {
    const [key] = work[index];
    const result = results[index];
    if (result.status === "rejected") {
      if (key === "geoAttempts") { state.geoAttempts = []; state.geoAttemptsError = null; }
      else if (key === "geoLink") { state.geoLink = null; state.geoLinkError = null; }
      else {
        state[`${key}Error`] = explainError(result.reason, `Не удалось загрузить ${key === "profile" ? "профиль" : key}`);
        if (key === "profile") state.profile = null;
        else state[key] = null;
      }
      continue;
    }
    const value = result.value;
    if (value?.error) {
      if (key === "geoAttempts") { state.geoAttempts = []; state.geoAttemptsError = null; }
      else if (key === "geoLink") { state.geoLink = null; state.geoLinkError = null; }
      else {
        state[`${key}Error`] = explainError(value.error, `Не удалось загрузить ${key === "profile" ? "профиль" : key}`);
        state[key === "activities" ? "activities" : key] = null;
      }
    } else {
      state[`${key}Error`] = null;
      if (key === "activities") state.activities = value.data || [];
      else if (key === "geoAttempts") state.geoAttempts = value.data || [];
      else if (key === "geoLink") state.geoLink = value.data || null;
      else state[key] = value.data;
    }
  }
  updateProfileUI();
  renderOverview();
  await checkAdmin();
}

async function checkAdmin() {
  state.isAdmin = false;
  try {
    // Права проверяет сервер: строка в admins видна только её владельцу (RLS).
    const { data, error } = await state.client.from("admins").select("user_id").eq("user_id", state.user.id).maybeSingle();
    state.isAdmin = !error && Boolean(data);
  } catch {
    state.isAdmin = false;
  }
  if (state.pendingAdmin) {
    state.pendingAdmin = false;
    if (state.isAdmin) openRoute("admin");
    else showToast("У этого аккаунта нет доступа к админке.", "error");
  } else if (state.isAdmin && location.hash === "#admin") {
    openRoute("admin");
  }
  if (state.isAdmin && document.querySelector('[data-view="admin"]').classList.contains("is-active")) loadAdmin();
}

function openAdmin() {
  if (!state.client || !state.user) {
    state.pendingAdmin = true;
    return openAuth("login");
  }
  if (!state.isAdmin) return showToast("У этого аккаунта нет доступа к админке.", "error");
  openRoute("admin");
}

function loadAdmin() {
  return admin.load();
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
  admin.reset();
  state.isAdmin = false;
  state.pendingAdmin = false;
  state.profile = null;
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
  state.geoAttempts = [];
  state.geoAttemptsError = null;
  state.geoLink = null;
  state.geoLinkError = null;
  state.tasks = [];
  state.weather = null;
  state.chartDays = 14;
  state.chartProject = "all";
}

function renderAuthMode() {
  const title = document.querySelector("#auth-title");
  const description = document.querySelector("#auth-description");
  const password = document.querySelector("#password-field");
  const passwordInput = password.querySelector("input");
  const submit = document.querySelector("#auth-submit");
  const footer = document.querySelector("#auth-footer");
  const nameField = document.querySelector("#display-name-field");
  const legal = document.querySelector("#legal-consents");
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
  if (nameField) nameField.hidden = state.authMode !== "register";
  if (legal) {
    legal.hidden = state.authMode !== "register";
    legal.querySelectorAll("input[type='checkbox']").forEach((input) => {
      input.required = state.authMode === "register";
      if (state.authMode !== "register") input.checked = false;
    });
  }
}

function openAuth(mode = "login") {
  state.authMode = mode;
  clearError(document.querySelector("#auth-error"));
  renderAuthMode();
  const screen = document.querySelector("#auth-screen");
  if (screen) screen.hidden = false;
  const configNote = document.querySelector("#auth-config-note");
  configNote.hidden = Boolean(state.client);
  configNote.textContent = state.configError || state.connectionError || "Авторизация пока не подключена. Укажите публичные параметры Supabase в scripts/config.js.";
  const form = document.querySelector("#auth-form");
  if (form) {
    form.querySelectorAll("input, button, select").forEach((input) => { input.disabled = !state.client; });
    form.querySelectorAll("#legal-consents input").forEach((input) => { if (mode !== "register") input.checked = false; });
  }
  document.querySelector("#auth-submit").disabled = !state.client;
}

function openRoute(route) {
  let page = pageNames[route] ? route : "overview";
  if (page === "admin" && !state.isAdmin) page = "overview";
  document.querySelectorAll("[data-view]").forEach((view) => view.classList.toggle("is-active", view.dataset.view === page));
  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.dataset.route === page;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  document.querySelector(".nav-link.is-active")?.scrollIntoView({ block: "nearest", inline: "center" });
  window.scrollTo({ top: 0 });
  document.title = `${pageNames[page]} — nmchv Account`;
  if (page === "admin") loadAdmin();
  if (!hasAuthCallback()) {
    const url = new URL(location.href);
    url.hash = page;
    history.replaceState(null, "", url);
  }
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

function profilePrefsKey() {
  return state.user ? `nmchv-account:prefs:${state.user.id}` : "";
}

function readProfilePrefs() {
  const key = profilePrefsKey();
  if (!key) return {};
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeProfilePrefs(prefs) {
  const key = profilePrefsKey();
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(prefs)); } catch {}
}

function tasksKey() {
  return state.user ? `nmchv-account:tasks:${state.user.id}` : "";
}

function readTasks() {
  const key = tasksKey();
  if (!key) return [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeTasks(tasks) {
  const key = tasksKey();
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(tasks)); } catch {}
}

function syncThemeSelect() {
  const select = document.querySelector("#theme-select");
  if (!select) return;
  let value = "system";
  try { value = localStorage.getItem("nmchv-theme") || "system"; } catch {}
  if (value !== "light" && value !== "dark") value = "system";
  select.value = value;
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
      const displayName = (form.elements.namedItem("display_name")?.value || "").trim();
      const options = { emailRedirectTo: getAuthRedirectUrl() };
      if (displayName) options.data = { display_name: displayName };
      const { error: signupError } = await state.client.auth.signUp({ email, password, options });
      if (signupError) throw signupError;
      const screen = document.querySelector("#auth-screen"); if (screen) screen.hidden = true;
      showToast("Проверьте почту, чтобы подтвердить адрес.");
    } else if (state.authMode === "reset") {
      const { error: resetError } = await state.client.auth.resetPasswordForEmail(email, { redirectTo: getAuthRedirectUrl() });
      if (resetError) throw resetError;
      const screen = document.querySelector("#auth-screen"); if (screen) screen.hidden = true;
      showToast("Если адрес зарегистрирован, письмо для восстановления уже отправлено.");
    } else {
      const { error: loginError } = await state.client.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      const screen = document.querySelector("#auth-screen"); if (screen) screen.hidden = true;
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
    const avatarValue = (form.elements.namedItem("avatar_url")?.value || "").trim();
    const avatarUrl = safeAvatarUrl(avatarValue);
    if (avatarValue && !avatarUrl) throw new Error("Ссылка на аватар должна быть корректным HTTPS-адресом.");
    const profile = {
      id: state.user.id,
      display_name: (form.elements.namedItem("display_name")?.value || "").trim(),
      username: (form.elements.namedItem("username")?.value || "").trim() || null,
      avatar_url: avatarUrl,
      bio: (form.elements.namedItem("bio")?.value || "").trim(),
      preferred_language: form.elements.namedItem("preferred_language")?.value || "ru",
      timezone: (form.elements.namedItem("timezone")?.value || "").trim()
    };
    const { data, error } = await state.client.from("profiles").upsert(profile, { onConflict: "id" }).select("username,display_name,avatar_url,bio,preferred_language,timezone").single();
    if (error) throw error;
    state.profile = data;
    writeProfilePrefs({
      weather_city: (form.elements.namedItem("weather_city")?.value || "").trim() || "Ростов-на-Дону",
      privacy: document.querySelector("#privacy-toggle")?.checked !== false
    });
    state.weather = null;
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

function openTaskDialog(goalId = "") {
  const dialog = document.querySelector("#task-dialog");
  const form = document.querySelector("#task-form");
  if (!dialog || !form) return;
  clearError(document.querySelector("#task-error"));
  form.reset();
  const goalField = form.elements.namedItem("goal_id");
  if (goalField) goalField.value = goalId;
  if (!dialog.open) dialog.showModal();
}

function saveTasks(tasks) {
  state.tasks = tasks;
  writeTasks(tasks);
  renderGoals();
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const legal = event.target.closest("[data-legal-key]");
    if (legal && (!legal.getAttribute("href") || legal.getAttribute("href") === "#")) {
      event.preventDefault();
      showToast("Документ пока не опубликован. Его можно загрузить в админке.", "error");
      return;
    }
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
      event.preventDefault();
      if (!state.user) return openAuth("login");
      return openGoalDialog();
    }
    if (action?.dataset.action === "add-task") {
      event.preventDefault();
      if (!state.user) return openAuth("login");
      return openTaskDialog(action.dataset.goalId || "");
    }
    if (action?.dataset.action === "delete-task") {
      event.preventDefault();
      saveTasks((state.tasks || []).filter((task) => task.id !== action.dataset.id));
      return;
    }
    if (action?.dataset.action === "read-notification") {
      event.preventDefault();
      return markNotificationRead(action.dataset.id);
    }
    const chartDays = event.target.closest("[data-chart-days]");
    if (chartDays) {
      state.chartDays = Number(chartDays.dataset.chartDays) || 14;
      renderInteractiveStatistics();
      return;
    }
    const projectFilter = event.target.closest("[data-project]");
    if (projectFilter) {
      state.chartProject = projectFilter.dataset.project || "all";
      renderInteractiveStatistics();
      return;
    }
    const point = event.target.closest(".chart-point");
    if (point) {
      const insight = document.querySelector("#chart-insight");
      if (insight) insight.textContent = point.getAttribute("aria-label") || "День выбран";
      return;
    }
    const nav = event.target.closest("[data-route]");
    if (nav) {
      event.preventDefault();
      openRoute(nav.dataset.route);
      return;
    }
    if (event.target.closest("#back-to-top")) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (event.target.closest("#weather-more")) {
      const dialog = document.querySelector("#weather-dialog");
      if (dialog && !dialog.open) dialog.showModal();
      return;
    }
    if (event.target.closest("#feedback-button")) {
      showToast("Канал обратной связи появится позже.");
      return;
    }
  });

  document.addEventListener("change", (event) => {
    const toggle = event.target.closest("[data-action='toggle-task']");
    if (toggle) {
      saveTasks((state.tasks || []).map((task) => task.id === toggle.dataset.id ? { ...task, is_completed: toggle.checked } : task));
      return;
    }
    if (event.target.id === "theme-select") {
      const value = event.target.value;
      if (value === "system") {
        try { localStorage.removeItem("nmchv-theme"); } catch {}
        const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
        if (window.NmchvTheme?.set) window.NmchvTheme.set(prefersLight ? "light" : "dark");
        try { localStorage.removeItem("nmchv-theme"); } catch {}
      } else if (window.NmchvTheme?.set) {
        window.NmchvTheme.set(value);
      } else {
        try { localStorage.setItem("nmchv-theme", value); } catch {}
      }
      syncThemeSelect();
    }
  });

  document.querySelector("#auth-form")?.addEventListener("submit", submitAuth);
  document.querySelector("#profile-form")?.addEventListener("submit", saveProfile);
  document.querySelector("#goal-form")?.addEventListener("submit", createGoal);
  document.querySelector("#task-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const errorTarget = document.querySelector("#task-error");
    clearError(errorTarget);
    try {
      requireClient();
      const form = event.currentTarget;
      const title = (form.elements.namedItem("title")?.value || "").trim();
      const goalId = form.elements.namedItem("goal_id")?.value || "";
      const dueAt = form.elements.namedItem("due_at")?.value || "";
      if (!title) throw new Error("Укажите название задачи.");
      const task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        goal_id: goalId,
        title,
        due_at: dueAt || null,
        is_completed: false,
        created_at: new Date().toISOString()
      };
      saveTasks([task, ...(state.tasks || [])]);
      document.querySelector("#task-dialog")?.close();
      form.reset();
      showToast("Задача добавлена.");
    } catch (error) {
      setError(errorTarget, explainError(error, "Не удалось добавить задачу"));
    }
  });
  document.querySelector("#logout-button")?.addEventListener("click", () => signOut("local"));
  document.querySelector("#admin-button")?.addEventListener("click", openAdmin);
  document.querySelector("#signout-current")?.addEventListener("click", () => signOut("local"));
  document.querySelector("#signout-button")?.addEventListener("click", () => signOut("global"));
  document.querySelector("#add-goal-button")?.addEventListener("click", () => state.user ? openGoalDialog() : openAuth("login"));
  ["goal-dialog", "task-dialog", "weather-dialog"].forEach((id) => {
    document.querySelector(`#${id}`)?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    });
  });
  document.querySelector("#auth-footer")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth]");
    if (button) openAuth(button.dataset.auth);
  });
  window.addEventListener("hashchange", () => openRoute(location.hash.slice(1)));
  window.addEventListener("nmchv:legal-docs-updated", () => { loadLegalDocs().catch(() => {}); });
}

const admin = createAdmin({ state, escapeHTML, setMarkup, setMetric, setError, clearError, showToast, explainError, formatDate, eventNames });

async function initialize() {
  renderStaticIcons();
  applyLegalDocLinks();
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
    await loadLegalDocs();
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
