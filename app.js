const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const SHIFT_INFO = {
  M: { label: "07:00–15:00", hours: 8 },
  T: { label: "15:00–24:00", hours: 9 },
  R: { label: "10:00–17:00", hours: 7 },
  L: { label: "Libre", hours: 0 }
};

// Perfil semanal: lunes a domingo.
const PROFILES = {
  A: ["M", "M", "M", "L", "L", "T", "T"],
  B: ["T", "T", "L", "M", "M", "M", "L"],
  C: ["R", "L", "T", "T", "T", "L", "M"]
};

// Ciclo continuo de 3 semanas.
// No se reinicia al cambiar de mes o año.
const ROTATION = [
  ["A", "B", "C"],
  ["B", "C", "A"],
  ["C", "A", "B"]
];

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

function getShiftsForDate(date, cycleStart) {
  const daysFromStart = diffDays(date, cycleStart);
  const weekIndex = Math.floor(daysFromStart / 7);
  const rotation = ROTATION[positiveModulo(weekIndex, ROTATION.length)];
  const dayIndex = mondayIndex(date);

  return rotation.map(profileName => PROFILES[profileName][dayIndex]);
}

function buildMonthSchedule(year, monthIndex, cycleStart) {
  const result = [];
  const first = new Date(year, monthIndex, 1, 12);
  const last = new Date(year, monthIndex + 1, 0, 12);

  for (let date = new Date(first); date <= last; date = addDays(date, 1)) {
    result.push({
      date: new Date(date),
      dayIndex: mondayIndex(date),
      day: DAYS[mondayIndex(date)],
      shifts: getShiftsForDate(date, cycleStart)
    });
  }

  return result;
}

function buildValidationWindow(year, monthIndex, cycleStart) {
  const first = new Date(year, monthIndex, 1, 12);
  const last = new Date(year, monthIndex + 1, 0, 12);
  const start = addDays(first, -7);
  const end = addDays(last, 7);
  const result = [];

  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    result.push({ date: new Date(date), shifts: getShiftsForDate(date, cycleStart) });
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
    if (!shifts.includes("M")) {
      errors.push(`${formatDateInput(row.date)}: sin JS de apertura 07:00.`);
    }
    if (!shifts.includes("T")) {
      errors.push(`${formatDateInput(row.date)}: sin JS de cierre hasta 24:00.`);
    }
  });
  return errors;
}

function validateSchedule(monthSchedule, validationWindow) {
  const names = getNames();
  const messages = validateCoverage(monthSchedule);

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

function renderCalendar(year, monthIndex, cycleStart) {
  const names = getNames();
  const grid = document.getElementById("calendarGrid");
  const { start, end } = calendarBounds(year, monthIndex);

  document.getElementById("calendarTitle").textContent = `${MONTHS[monthIndex][0].toUpperCase()}${MONTHS[monthIndex].slice(1)} ${year}`;
  document.getElementById("calendarHeads").innerHTML = DAYS_SHORT.map(day => `<div class="calendar-head">${day}</div>`).join("");

  let html = "";
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    const inMonth = date.getMonth() === monthIndex;
    const shifts = getShiftsForDate(date, cycleStart);

    html += `
      <div class="calendar-day ${inMonth ? "" : "outside"}">
        <div class="date-number">${date.getDate()}</div>
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
          <p><strong>Domingos libres:</strong> ${countSundaysOff(monthSchedule, i)}</p>
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
    el.innerHTML = `<p class="ok">Horario válido. Cobertura 07:00–24:00, máximo 6 días consecutivos y sin turno M después de T.</p><p>${cycleText}</p>`;
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

  currentYear = year;
  currentMonthIndex = monthIndex;
  currentMonthSchedule = buildMonthSchedule(year, monthIndex, cycleStart);
  const validationWindow = buildValidationWindow(year, monthIndex, cycleStart);

  renderCalendar(year, monthIndex, cycleStart);
  renderSummary(currentMonthSchedule, validationWindow);
  renderValidation(validateSchedule(currentMonthSchedule, validationWindow), cycleStart);
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

  // Punto inicial del ciclo. Debe ser lunes.
  // Puede cambiarse sin modificar código.
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

generate();
