// =============================
// SUPABASE
// =============================
// Reemplaza estos dos valores con Project URL y anon/public key de tu proyecto.
// Nunca uses la service_role key en este archivo ni en GitHub.
const SUPABASE_URL = "https://etpyqkgwufcztrwiqlsc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FdGUDvsYeau50wDKfMVjyg_LnkCAhg3";

let supabaseClient = null;

function supabaseConfigured() {
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("PEGA_AQUI") &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes("PEGA_AQUI")
  );
}

function setCloudStatus(message, type = "info") {
  const el = document.getElementById("supabaseStatus");
  if (!el) return;
  el.textContent = message;
  el.className = `cloud-status ${type}`;
}

function initSupabase() {
  if (!supabaseConfigured()) {
    setCloudStatus("Supabase sin configurar. Agrega URL y anon key en app.js.", "info");
    return;
  }

  if (!window.supabase) {
    setCloudStatus("No fue posible cargar la librería de Supabase.", "error");
    return;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  refreshAuthState();

  supabaseClient.auth.onAuthStateChange(() => refreshAuthState());
}

async function getCurrentSession() {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function refreshAuthState() {
  if (!supabaseClient) return;
  try {
    const session = await getCurrentSession();
    const saveBtn = document.getElementById("saveCloudBtn");
    const loadBtn = document.getElementById("loadCloudBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginBtn = document.getElementById("loginBtn");

    const logged = Boolean(session);
    saveBtn.disabled = !logged;
    loadBtn.disabled = !logged;
    logoutBtn.disabled = !logged;
    loginBtn.disabled = logged;

    if (logged) {
      setCloudStatus(`Conectado como ${session.user.email}.`, "ok");
    } else {
      setCloudStatus("Supabase conectado. Inicia sesión para guardar o cargar horarios.", "info");
    }
  } catch (error) {
    setCloudStatus(error.message || "Error consultando la sesión.", "error");
  }
}

async function loginSupabase() {
  if (!supabaseClient) {
    setCloudStatus("Configura Supabase en app.js antes de iniciar sesión.", "error");
    return;
  }

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  if (!email || !password) {
    setCloudStatus("Ingresa email y contraseña.", "error");
    return;
  }

  setCloudStatus("Iniciando sesión…", "info");
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setCloudStatus(error.message, "error");
    return;
  }
  document.getElementById("authPassword").value = "";
  await refreshAuthState();
}

async function logoutSupabase() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) setCloudStatus(error.message, "error");
  else await refreshAuthState();
}

function serializeSchedule(schedule) {
  return schedule.map(row => ({
    date: formatDateInput(row.date),
    day: row.day,
    shifts: [...row.shifts]
  }));
}

function deserializeSchedule(schedule) {
  return (schedule || []).map(row => ({
    date: parseDateInput(row.date),
    dayIndex: mondayIndex(parseDateInput(row.date)),
    day: row.day || DAYS[mondayIndex(parseDateInput(row.date))],
    shifts: [...row.shifts]
  }));
}

async function saveMonthToSupabase() {
  if (!supabaseClient) {
    setCloudStatus("Supabase no está configurado.", "error");
    return;
  }

  try {
    const session = await getCurrentSession();
    if (!session) {
      setCloudStatus("Debes iniciar sesión antes de guardar.", "error");
      return;
    }

    generate();
    const monthKey = document.getElementById("monthPicker").value;
    const payload = {
      user_id: session.user.id,
      month_key: monthKey,
      cycle_start: formatDateInput(getCycleStart()),
      js_names: getNames(),
      schedule: serializeSchedule(currentMonthSchedule),
      updated_at: new Date().toISOString()
    };

    setCloudStatus(`Guardando ${monthKey}…`, "info");
    const { error } = await supabaseClient
      .from("js_schedule_months")
      .upsert(payload, { onConflict: "user_id,month_key" });

    if (error) throw error;
    setCloudStatus(`Mes ${monthKey} guardado correctamente en Supabase.`, "ok");
  } catch (error) {
    setCloudStatus(error.message || "No fue posible guardar el mes.", "error");
  }
}

function renderLoadedSnapshot(monthSchedule, year, monthIndex, cycleStart, weeklyPlan) {
  const names = getNames();
  const savedMap = new Map(monthSchedule.map(row => [formatDateInput(row.date), row.shifts]));
  const grid = document.getElementById("calendarGrid");
  const { start, end } = calendarBounds(year, monthIndex);

  document.getElementById("calendarTitle").textContent = `${MONTHS[monthIndex][0].toUpperCase()}${MONTHS[monthIndex].slice(1)} ${year}`;
  document.getElementById("calendarHeads").innerHTML = DAYS_SHORT.map(day => `<div class="calendar-head">${day}</div>`).join("");

  let html = "";
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    const key = formatDateInput(date);
    const inMonth = date.getMonth() === monthIndex;
    const shifts = savedMap.get(key) || getShiftsForDate(date, cycleStart, weeklyPlan);
    const isSunday = mondayIndex(date) === 6;
    const workingSunday = isSunday ? shifts.filter(shift => shift !== "L").length : 0;

    html += `
      <div class="calendar-day ${inMonth ? "" : "outside"} ${isSunday && workingSunday === 1 ? "reduced-sunday" : ""}">
        <div class="date-number">${date.getDate()}</div>
        ${isSunday && workingSunday === 1 ? '<div class="reduced-badge">Domingo · 1 JS</div>' : ''}
        ${names.map((name, i) => `
          <div class="calendar-shift">
            <span class="js-name">${name}</span>
            <span class="shift shift-${shifts[i]}">${shifts[i]}</span>
            <small>${SHIFT_INFO[shifts[i]].label}</small>
          </div>
        `).join("")}
      </div>
    `;
  }
  grid.innerHTML = html;
}

async function loadMonthFromSupabase() {
  if (!supabaseClient) {
    setCloudStatus("Supabase no está configurado.", "error");
    return;
  }

  try {
    const session = await getCurrentSession();
    if (!session) {
      setCloudStatus("Debes iniciar sesión antes de cargar.", "error");
      return;
    }

    const monthKey = document.getElementById("monthPicker").value;
    setCloudStatus(`Cargando ${monthKey}…`, "info");

    const { data, error } = await supabaseClient
      .from("js_schedule_months")
      .select("month_key,cycle_start,js_names,schedule,updated_at")
      .eq("user_id", session.user.id)
      .eq("month_key", monthKey)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      setCloudStatus(`No existe un horario guardado para ${monthKey}.`, "info");
      return;
    }

    const names = Array.isArray(data.js_names) ? data.js_names : ["JS 1", "JS 2", "JS 3"];
    document.getElementById("js1").value = names[0] || "JS 1";
    document.getElementById("js2").value = names[1] || "JS 2";
    document.getElementById("js3").value = names[2] || "JS 3";
    document.getElementById("cycleStart").value = data.cycle_start;

    const { year, monthIndex } = parseMonthInput(monthKey);
    const cycleStart = getCycleStart();
    const planEnd = addDays(calendarBounds(year, monthIndex).end, 7);
    const weeklyPlan = buildWeeklyPlan(planEnd, cycleStart);
    const validationWindow = buildValidationWindow(year, monthIndex, cycleStart, weeklyPlan);

    currentYear = year;
    currentMonthIndex = monthIndex;
    currentMonthSchedule = deserializeSchedule(data.schedule);

    renderLoadedSnapshot(currentMonthSchedule, year, monthIndex, cycleStart, weeklyPlan);
    renderSummary(currentMonthSchedule, validationWindow);
    renderValidation(validateSchedule(currentMonthSchedule, validationWindow), cycleStart);

    const when = data.updated_at ? new Date(data.updated_at).toLocaleString("es-CL") : "";
    setCloudStatus(`Mes ${monthKey} cargado desde Supabase${when ? ` · actualizado ${when}` : ""}.`, "ok");
  } catch (error) {
    setCloudStatus(error.message || "No fue posible cargar el mes.", "error");
  }
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const SHIFT_INFO = {
  M: { label: "07:00–15:00", hours: 8 },
  T: { label: "15:00–24:00", hours: 9 },
  R: { label: "10:00–17:00", hours: 7 },
  L: { label: "Libre", hours: 0 }
};

/*
  Patrones semanales válidos.
  Todos cumplen por JS:
  - 42 horas semanales
  - 5 días trabajados / 2 libres
  - nunca T -> M al día siguiente dentro de la semana

  La clave indica qué JS tienen libre el domingo.
  Cada grupo contiene alternativas para permitir continuidad entre semanas.
*/
const WEEK_TEMPLATES = {
  "0": [
    ["MMMLTTL", "TTLMMLM", "RLTTLMT"],
    ["MMMLTTL", "TTLMMLM", "LRTTLMT"],
    ["MMMLTTL", "RLTTLMT", "TTLMMLM"]
  ],
  "1": [
    ["MMMLLTT", "TTLMMML", "RLTTTLM"],
    ["MMTLMLT", "RTLMTTL", "TLMTLMM"],
    ["MMTLTLM", "TTLMMML", "RLMTLTT"]
  ],
  "2": [
    ["MMMLLTT", "RLTTTLM", "TTLMMML"],
    ["MMTLMLT", "TLMTLMM", "RTLMTTL"],
    ["MMTLTLM", "RLMTLTT", "TTLMMML"]
  ],
  "0,1": [
    ["MMMLTTL", "TTLMMML", "MLTTRLT"],
    ["MMMLTTL", "TTLMMML", "MLTTLRT"],
    ["MMMLTTL", "TTLMMML", "TLTTRLM"]
  ],
  "0,2": [
    ["MMMLTTL", "MLTTRLT", "TTLMMML"],
    ["MMMLTTL", "MLTTLRT", "TTLMMML"],
    ["MMMLTTL", "TLTTRLM", "TTLMMML"]
  ],
  "1,2": [
    ["MLMMTLT", "MMTLMTL", "TTLTRML"],
    ["MLMMTLT", "TTLTRML", "MMTLMTL"],
    ["MLMTTLM", "TTLMMML", "RMTLTTL"]
  ]
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMonthInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseDateInput(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function parseMonthInput(value) {
  const [year, month] = value.split("-").map(Number);
  return { year, monthIndex: month - 1 };
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function diffDays(a, b) {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / 86400000);
}

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function normalizeCycleStart(date) {
  return addDays(date, -mondayIndex(date));
}

function getNames() {
  return [
    document.getElementById("js1").value.trim() || "JS 1",
    document.getElementById("js2").value.trim() || "JS 2",
    document.getElementById("js3").value.trim() || "JS 3"
  ];
}

function getCycleStart() {
  const raw = parseDateInput(document.getElementById("cycleStart").value);
  return normalizeCycleStart(raw);
}

function getSundaysInMonth(year, monthIndex) {
  const sundays = [];
  const last = new Date(year, monthIndex + 1, 0, 12);
  for (let day = 1; day <= last.getDate(); day++) {
    const date = new Date(year, monthIndex, day, 12);
    if (mondayIndex(date) === 6) sundays.push(date);
  }
  return sundays;
}

function rotateSet(values, rotation) {
  return values.map(value => positiveModulo(value + rotation, 3)).sort((a, b) => a - b);
}

/*
  Cada JS recibe exactamente 2 domingos libres por mes.
  - Mes de 4 domingos: 6 libres repartidos como 1 + 1 + 2 + 2.
  - Mes de 5 domingos: 6 libres repartidos como 2 + 1 + 1 + 1 + 1.
  Nunca quedan los 3 JS libres el mismo domingo.
*/
function buildSundayOffPlan(year, monthIndex, cycleStart) {
  const sundays = getSundaysInMonth(year, monthIndex);
  const cycleSerial = cycleStart.getFullYear() * 12 + cycleStart.getMonth();
  const monthSerial = year * 12 + monthIndex;
  const rotation = positiveModulo(monthSerial - cycleSerial, 3);

  const base = sundays.length === 5
    ? [[0, 1], [2], [0], [2], [1]]
    : [[0], [1], [0, 2], [1, 2]];

  const plan = new Map();
  sundays.forEach((date, index) => {
    plan.set(formatDateInput(date), rotateSet(base[index], rotation));
  });
  return plan;
}

function sundayOffForDate(date, cycleStart) {
  const plan = buildSundayOffPlan(date.getFullYear(), date.getMonth(), cycleStart);
  return plan.get(formatDateInput(date));
}

function offKey(indices) {
  return [...indices].sort((a, b) => a - b).join(",");
}

function tailWorkDays(sequence) {
  let total = 0;
  for (let i = sequence.length - 1; i >= 0; i--) {
    if (sequence[i] === "L") break;
    total++;
  }
  return total;
}

function headWorkDays(sequence) {
  let total = 0;
  for (let i = 0; i < sequence.length; i++) {
    if (sequence[i] === "L") break;
    total++;
  }
  return total;
}

function templatesCompatible(previous, current) {
  if (!previous) return true;

  for (let js = 0; js < 3; js++) {
    const prev = previous[js];
    const curr = current[js];

    if (prev[6] === "T" && curr[0] === "M") return false;
    if (tailWorkDays(prev) + headWorkDays(curr) > 6) return false;
  }
  return true;
}

function validateTemplate(template, sundayOff) {
  const expectedKey = offKey(sundayOff);
  const actualOff = [];

  for (let js = 0; js < 3; js++) {
    const sequence = template[js];
    const hours = [...sequence].reduce((sum, shift) => sum + SHIFT_INFO[shift].hours, 0);
    const worked = [...sequence].filter(shift => shift !== "L").length;

    if (hours !== 42 || worked !== 5) return false;
    if (sequence[6] === "L") actualOff.push(js);
    for (let d = 1; d < 7; d++) {
      if (sequence[d - 1] === "T" && sequence[d] === "M") return false;
    }
  }

  if (offKey(actualOff) !== expectedKey) return false;

  // Lunes a sábado deben mantener apertura y cierre.
  for (let d = 0; d < 6; d++) {
    const shifts = template.map(sequence => sequence[d]);
    if (!shifts.includes("M") || !shifts.includes("T")) return false;
  }

  // Domingo: mínimo 1 JS. Si queda solo uno, debe ser M o T.
  const sundayWorking = template.map(sequence => sequence[6]).filter(shift => shift !== "L");
  if (sundayWorking.length < 1) return false;
  if (sundayWorking.length === 1 && !["M", "T"].includes(sundayWorking[0])) return false;
  if (sundayWorking.length === 2 && !(sundayWorking.includes("M") && sundayWorking.includes("T"))) return false;

  return true;
}

function mondayOf(date) {
  return addDays(date, -mondayIndex(date));
}

/*
  Genera semanas completas desde el inicio del ciclo hasta la fecha solicitada.
  Usa programación dinámica con las alternativas de cada patrón para asegurar
  continuidad entre semanas sin T->M y sin superar 6 días consecutivos.
*/
function buildWeeklyPlan(endDate, cycleStart) {
  const firstMonday = cycleStart;
  const lastMonday = mondayOf(endDate);
  const weeks = Math.floor(diffDays(lastMonday, firstMonday) / 7) + 1;

  if (weeks <= 0) return new Map();

  let states = [{ template: null, path: [] }];

  for (let week = 0; week < weeks; week++) {
    const monday = addDays(firstMonday, week * 7);
    const sunday = addDays(monday, 6);
    const off = sundayOffForDate(sunday, cycleStart);
    const pool = WEEK_TEMPLATES[offKey(off)] || [];
    const nextStates = [];

    for (const candidate of pool) {
      if (!validateTemplate(candidate, off)) continue;

      const compatibleState = states.find(state => templatesCompatible(state.template, candidate));
      if (compatibleState) {
        nextStates.push({ template: candidate, path: [...compatibleState.path, candidate] });
      }
    }

    if (!nextStates.length) {
      throw new Error(`No fue posible continuar el ciclo en la semana del ${formatDateInput(monday)}.`);
    }

    states = nextStates;
  }

  const chosen = states[0].path;
  const result = new Map();
  chosen.forEach((template, index) => {
    result.set(formatDateInput(addDays(firstMonday, index * 7)), template);
  });
  return result;
}

function getShiftsForDate(date, cycleStart, weeklyPlan) {
  if (date < cycleStart) {
    // Para días anteriores al inicio formal del ciclo se muestra libre.
    return ["L", "L", "L"];
  }

  const monday = mondayOf(date);
  const template = weeklyPlan.get(formatDateInput(monday));
  if (!template) return ["L", "L", "L"];
  const dayIndex = mondayIndex(date);
  return template.map(sequence => sequence[dayIndex]);
}

function buildMonthSchedule(year, monthIndex, cycleStart, weeklyPlan) {
  const result = [];
  const first = new Date(year, monthIndex, 1, 12);
  const last = new Date(year, monthIndex + 1, 0, 12);

  for (let date = new Date(first); date <= last; date = addDays(date, 1)) {
    result.push({
      date: new Date(date),
      dayIndex: mondayIndex(date),
      day: DAYS[mondayIndex(date)],
      shifts: getShiftsForDate(date, cycleStart, weeklyPlan)
    });
  }

  return result;
}

function buildValidationWindow(year, monthIndex, cycleStart, weeklyPlan) {
  const first = new Date(year, monthIndex, 1, 12);
  const last = new Date(year, monthIndex + 1, 0, 12);
  const start = new Date(Math.max(addDays(first, -7).getTime(), cycleStart.getTime()));
  const end = addDays(last, 7);
  const result = [];

  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    result.push({ date: new Date(date), shifts: getShiftsForDate(date, cycleStart, weeklyPlan) });
  }
  return result;
}

function maxConsecutiveDays(schedule, jsIndex) {
  let max = 0;
  let current = 0;
  schedule.forEach(row => {
    if (row.shifts[jsIndex] === "L") current = 0;
    else {
      current++;
      max = Math.max(max, current);
    }
  });
  return max;
}

function countCloseToOpen(schedule, jsIndex) {
  let errors = 0;
  for (let i = 1; i < schedule.length; i++) {
    if (schedule[i - 1].shifts[jsIndex] === "T" && schedule[i].shifts[jsIndex] === "M") errors++;
  }
  return errors;
}

function countSundaysOff(schedule, jsIndex) {
  return schedule.filter(row => mondayIndex(row.date) === 6 && row.shifts[jsIndex] === "L").length;
}

function countShift(schedule, jsIndex, code) {
  return schedule.filter(row => row.shifts[jsIndex] === code).length;
}

function totalMonthHours(schedule, jsIndex) {
  return schedule.reduce((sum, row) => sum + SHIFT_INFO[row.shifts[jsIndex]].hours, 0);
}

function validateCoverage(schedule) {
  const errors = [];
  schedule.forEach(row => {
    const shifts = row.shifts;
    const isSunday = mondayIndex(row.date) === 6;

    if (isSunday) {
      const working = shifts.filter(shift => shift !== "L");
      if (working.length < 1) errors.push(`${formatDateInput(row.date)}: domingo sin Jefe de Servicio.`);
      if (working.length === 1 && !["M", "T"].includes(working[0])) {
        errors.push(`${formatDateInput(row.date)}: el único JS dominical debe tener turno M o T.`);
      }
    } else {
      if (!shifts.includes("M")) errors.push(`${formatDateInput(row.date)}: sin JS de apertura 07:00.`);
      if (!shifts.includes("T")) errors.push(`${formatDateInput(row.date)}: sin JS de cierre hasta 24:00.`);
    }
  });
  return errors;
}

function validateSundayRules(monthSchedule) {
  const names = getNames();
  const errors = [];

  names.forEach((name, js) => {
    const offs = countSundaysOff(monthSchedule, js);
    if (offs !== 2) errors.push(`${name}: debe tener exactamente 2 domingos libres y tiene ${offs}.`);
  });

  return errors;
}

function validateWeeklyHours(validationWindow) {
  const errors = [];
  const names = getNames();
  const weeks = new Map();

  validationWindow.forEach(row => {
    const monday = mondayOf(row.date);
    const key = formatDateInput(monday);
    if (!weeks.has(key)) weeks.set(key, []);
    weeks.get(key).push(row);
  });

  weeks.forEach((rows, mondayKey) => {
    if (rows.length !== 7) return;
    names.forEach((name, js) => {
      const hours = rows.reduce((sum, row) => sum + SHIFT_INFO[row.shifts[js]].hours, 0);
      const worked = rows.filter(row => row.shifts[js] !== "L").length;
      if (hours !== 42) errors.push(`${name}: semana ${mondayKey} tiene ${hours} h en vez de 42 h.`);
      if (worked !== 5) errors.push(`${name}: semana ${mondayKey} tiene ${worked} días trabajados en vez de 5.`);
    });
  });

  return errors;
}

function validateSchedule(monthSchedule, validationWindow) {
  const names = getNames();
  const messages = [
    ...validateCoverage(monthSchedule),
    ...validateSundayRules(monthSchedule),
    ...validateWeeklyHours(validationWindow)
  ];

  names.forEach((name, i) => {
    const consecutive = maxConsecutiveDays(validationWindow, i);
    const closeOpen = countCloseToOpen(validationWindow, i);
    if (consecutive > 6) messages.push(`${name}: supera 6 días consecutivos (${consecutive}).`);
    if (closeOpen > 0) messages.push(`${name}: presenta ${closeOpen} cierre(s) seguido(s) de apertura.`);
  });

  return { valid: messages.length === 0, messages };
}

function calendarBounds(year, monthIndex) {
  const first = new Date(year, monthIndex, 1, 12);
  const last = new Date(year, monthIndex + 1, 0, 12);
  return {
    start: addDays(first, -mondayIndex(first)),
    end: addDays(last, 6 - mondayIndex(last))
  };
}

function renderCalendar(year, monthIndex, cycleStart, weeklyPlan) {
  const names = getNames();
  const grid = document.getElementById("calendarGrid");
  const { start, end } = calendarBounds(year, monthIndex);

  document.getElementById("calendarTitle").textContent = `${MONTHS[monthIndex][0].toUpperCase()}${MONTHS[monthIndex].slice(1)} ${year}`;
  document.getElementById("calendarHeads").innerHTML = DAYS_SHORT.map(day => `<div class="calendar-head">${day}</div>`).join("");

  let html = "";
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    const inMonth = date.getMonth() === monthIndex;
    const shifts = getShiftsForDate(date, cycleStart, weeklyPlan);
    const isSunday = mondayIndex(date) === 6;
    const workingSunday = isSunday ? shifts.filter(shift => shift !== "L").length : 0;

    html += `
      <div class="calendar-day ${inMonth ? "" : "outside"} ${isSunday && workingSunday === 1 ? "reduced-sunday" : ""}">
        <div class="date-number">${date.getDate()}</div>
        ${isSunday && workingSunday === 1 ? '<div class="reduced-badge">Domingo · 1 JS</div>' : ''}
        ${names.map((name, i) => `
          <div class="calendar-shift">
            <span class="js-name">${name}</span>
            <span class="shift shift-${shifts[i]}">${shifts[i]}</span>
            <small>${SHIFT_INFO[shifts[i]].label}</small>
          </div>
        `).join("")}
      </div>
    `;
  }
  grid.innerHTML = html;
}

function renderSummary(monthSchedule, validationWindow) {
  const names = getNames();
  document.getElementById("summary").innerHTML = `
    <div class="summary-grid">
      ${names.map((name, i) => `
        <div class="summary-card">
          <h3>${name}</h3>
          <p><strong>Horas del mes:</strong> ${totalMonthHours(monthSchedule, i)}</p>
          <p><strong>M:</strong> ${countShift(monthSchedule, i, "M")} · <strong>T:</strong> ${countShift(monthSchedule, i, "T")} · <strong>R:</strong> ${countShift(monthSchedule, i, "R")}</p>
          <p><strong>Libres:</strong> ${countShift(monthSchedule, i, "L")}</p>
          <p><strong>Domingos libres:</strong> ${countSundaysOff(monthSchedule, i)} / 2</p>
          <p><strong>Máx. días consecutivos:</strong> ${maxConsecutiveDays(validationWindow, i)}</p>
          <p><strong>Cierre → apertura:</strong> ${countCloseToOpen(validationWindow, i)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function renderValidation(validation, cycleStart) {
  const el = document.getElementById("validation");
  const cycleText = `Ciclo continuo anclado al lunes ${formatDateInput(cycleStart)}.`;

  if (validation.valid) {
    el.innerHTML = `<p class="ok">Horario válido. 42 h semanales, 2 domingos libres por JS, mínimo 1 JS los domingos, máximo 6 días consecutivos y sin M después de T.</p><p>${cycleText}</p>`;
  } else {
    el.innerHTML = `<p class="error">Se encontraron errores:</p><ul>${validation.messages.map(m => `<li>${m}</li>`).join("")}</ul><p>${cycleText}</p>`;
  }
}

let currentMonthSchedule = [];
let currentYear = 0;
let currentMonthIndex = 0;

function generate() {
  const { year, monthIndex } = parseMonthInput(document.getElementById("monthPicker").value);
  const cycleStart = getCycleStart();
  const calendarEnd = calendarBounds(year, monthIndex).end;

  currentYear = year;
  currentMonthIndex = monthIndex;

  try {
    const planEnd = addDays(calendarEnd, 7);
    const weeklyPlan = buildWeeklyPlan(planEnd, cycleStart);
    currentMonthSchedule = buildMonthSchedule(year, monthIndex, cycleStart, weeklyPlan);
    const validationWindow = buildValidationWindow(year, monthIndex, cycleStart, weeklyPlan);

    renderCalendar(year, monthIndex, cycleStart, weeklyPlan);
    renderSummary(currentMonthSchedule, validationWindow);
    renderValidation(validateSchedule(currentMonthSchedule, validationWindow), cycleStart);
  } catch (error) {
    document.getElementById("validation").innerHTML = `<p class="error">${error.message}</p>`;
  }
}

function moveMonth(delta) {
  const { year, monthIndex } = parseMonthInput(document.getElementById("monthPicker").value);
  const target = new Date(year, monthIndex + delta, 1, 12);
  document.getElementById("monthPicker").value = formatMonthInput(target);
  generate();
}

function exportCSV() {
  if (!currentMonthSchedule.length) generate();
  const names = getNames();
  const rows = [
    ["Fecha", "Día", ...names],
    ...currentMonthSchedule.map(row => [
      formatDateInput(row.date),
      row.day,
      ...row.shifts.map(shift => `${shift} ${SHIFT_INFO[shift].label}`)
    ])
  ];

  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `turnos-js-${currentYear}-${pad(currentMonthIndex + 1)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function setInitialValues() {
  const today = new Date();
  document.getElementById("monthPicker").value = formatMonthInput(today);
  const defaultCycle = new Date(2026, 0, 5, 12);
  document.getElementById("cycleStart").value = formatDateInput(defaultCycle);
}

setInitialValues();

document.getElementById("generateBtn").addEventListener("click", generate);
document.getElementById("prevMonth").addEventListener("click", () => moveMonth(-1));
document.getElementById("nextMonth").addEventListener("click", () => moveMonth(1));
document.getElementById("csvBtn").addEventListener("click", exportCSV);
document.getElementById("monthPicker").addEventListener("change", generate);
document.getElementById("cycleStart").addEventListener("change", () => {
  const normalized = getCycleStart();
  document.getElementById("cycleStart").value = formatDateInput(normalized);
  generate();
});
["js1", "js2", "js3"].forEach(id => document.getElementById(id).addEventListener("change", generate));

document.getElementById("loginBtn").addEventListener("click", loginSupabase);
document.getElementById("logoutBtn").addEventListener("click", logoutSupabase);
document.getElementById("saveCloudBtn").addEventListener("click", saveMonthToSupabase);
document.getElementById("loadCloudBtn").addEventListener("click", loadMonthFromSupabase);

initSupabase();
generate();
