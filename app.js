const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const SHIFT_INFO = {
  M: { label: "07:00–15:00", hours: 8 },
  T: { label: "15:00–24:00", hours: 9 },
  R: { label: "10:00–17:00", hours: 7 },
  L: { label: "Libre", hours: 0 }
};

// Tres perfiles semanales que cuadran exactamente 42 h.
// Perfil A = 3M + 2T = 42 h
// Perfil B = 3M + 2T = 42 h
// Perfil C = 1M + 3T + 1R = 42 h
const PROFILES = {
  A: ["M", "M", "M", "L", "L", "T", "T"],
  B: ["T", "T", "L", "M", "M", "M", "L"],
  C: ["R", "L", "T", "T", "T", "L", "M"]
};

// Ciclo continuo de tres semanas.
// Cada JS rota por A/B/C, repartiendo cierres, aperturas, R y domingos libres.
const ROTATION = [
  ["A", "B", "C"],
  ["B", "C", "A"],
  ["A", "C", "B"]
];

function getNames() {
  return [
    document.getElementById("js1").value.trim() || "JS 1",
    document.getElementById("js2").value.trim() || "JS 2",
    document.getElementById("js3").value.trim() || "JS 3"
  ];
}

function buildSchedule(weeks) {
  const result = [];

  for (let w = 0; w < weeks; w++) {
    const rotation = ROTATION[w % ROTATION.length];

    for (let d = 0; d < 7; d++) {
      result.push({
        week: w + 1,
        dayIndex: d,
        day: DAYS[d],
        shifts: rotation.map(profileName => PROFILES[profileName][d])
      });
    }
  }

  return result;
}

function calculateWeeklyHours(schedule, weeks) {
  const weekly = [];

  for (let w = 1; w <= weeks; w++) {
    const rows = schedule.filter(r => r.week === w);
    const hours = [0, 0, 0];

    rows.forEach(row => {
      row.shifts.forEach((shift, i) => {
        hours[i] += SHIFT_INFO[shift].hours;
      });
    });

    weekly.push({ week: w, hours });
  }

  return weekly;
}

function maxConsecutiveDays(schedule, jsIndex) {
  let max = 0;
  let current = 0;

  schedule.forEach(row => {
    if (row.shifts[jsIndex] === "L") {
      current = 0;
    } else {
      current++;
      max = Math.max(max, current);
    }
  });

  return max;
}

function countSundaysOff(schedule, jsIndex) {
  return schedule.filter(row => row.dayIndex === 6 && row.shifts[jsIndex] === "L").length;
}

function maxWorkedSundaysInRow(schedule, jsIndex) {
  const sundays = schedule.filter(row => row.dayIndex === 6);
  let max = 0;
  let current = 0;

  sundays.forEach(row => {
    if (row.shifts[jsIndex] === "L") {
      current = 0;
    } else {
      current++;
      max = Math.max(max, current);
    }
  });

  return max;
}

function countCloseToOpen(schedule, jsIndex) {
  let errors = 0;

  for (let i = 1; i < schedule.length; i++) {
    const previous = schedule[i - 1].shifts[jsIndex];
    const current = schedule[i].shifts[jsIndex];

    if (previous === "T" && current === "M") {
      errors++;
    }
  }

  return errors;
}

function validateCoverage(schedule) {
  const errors = [];

  schedule.forEach(row => {
    const shifts = row.shifts;
    const hasMorning = shifts.includes("M") || shifts.includes("R");
    const hasClosing = shifts.includes("T");

    if (!hasMorning) {
      errors.push(`Semana ${row.week} ${row.day}: sin cobertura de apertura.`);
    }

    if (!hasClosing) {
      errors.push(`Semana ${row.week} ${row.day}: sin cobertura hasta las 24:00.`);
    }
  });

  return errors;
}

function validateSchedule(schedule, weeks) {
  const names = getNames();
  const weeklyHours = calculateWeeklyHours(schedule, weeks);
  const messages = [];
  let valid = true;

  weeklyHours.forEach(item => {
    item.hours.forEach((hours, i) => {
      if (hours !== 42) {
        valid = false;
        messages.push(`Semana ${item.week}: ${names[i]} tiene ${hours} h, no 42 h.`);
      }
    });
  });

  const coverageErrors = validateCoverage(schedule);
  if (coverageErrors.length) {
    valid = false;
    messages.push(...coverageErrors);
  }

  names.forEach((name, i) => {
    const consecutive = maxConsecutiveDays(schedule, i);
    const closeOpen = countCloseToOpen(schedule, i);

    if (consecutive > 6) {
      valid = false;
      messages.push(`${name}: supera 6 días consecutivos (${consecutive}).`);
    }

    if (closeOpen > 0) {
      valid = false;
      messages.push(`${name}: presenta ${closeOpen} cierre(s) 24:00 seguido(s) de apertura 07:00.`);
    }
  });

  return { valid, messages };
}

function renderSchedule(schedule) {
  const tbody = document.querySelector("#scheduleTable tbody");
  tbody.innerHTML = "";

  schedule.forEach((row, index) => {
    const tr = document.createElement("tr");
    if (row.dayIndex === 0 && index !== 0) tr.classList.add("week-start");

    tr.innerHTML = `
      <td>${row.week}</td>
      <td>${row.day}</td>
      ${row.shifts.map(shift => `<td><span class="shift shift-${shift}">${shift}</span><br><small>${SHIFT_INFO[shift].label}</small></td>`).join("")}
    `;

    tbody.appendChild(tr);
  });
}

function renderSummary(schedule, weeks) {
  const names = getNames();
  const weeklyHours = calculateWeeklyHours(schedule, weeks);
  const totalHours = [0, 0, 0];

  weeklyHours.forEach(w => w.hours.forEach((h, i) => totalHours[i] += h));

  const html = names.map((name, i) => {
    return `
      <div class="summary-card">
        <h3>${name}</h3>
        <p><strong>Horas totales:</strong> ${totalHours[i]}</p>
        <p><strong>Domingos libres:</strong> ${countSundaysOff(schedule, i)}</p>
        <p><strong>Máx. días consecutivos:</strong> ${maxConsecutiveDays(schedule, i)}</p>
        <p><strong>Máx. domingos trabajados seguidos:</strong> ${maxWorkedSundaysInRow(schedule, i)}</p>
        <p><strong>Cierre → apertura:</strong> ${countCloseToOpen(schedule, i)}</p>
      </div>
    `;
  }).join("");

  document.getElementById("summary").innerHTML = `<div class="summary-grid">${html}</div>`;
}

function renderValidation(validation) {
  const el = document.getElementById("validation");

  if (validation.valid) {
    el.innerHTML = `<p class="ok">Horario válido: cobertura completa, 42 h semanales y máximo 6 días consecutivos.</p>`;
    return;
  }

  el.innerHTML = `
    <p class="error">Se encontraron errores:</p>
    <ul>${validation.messages.map(m => `<li>${m}</li>`).join("")}</ul>
  `;
}

function updateHeaders() {
  const names = getNames();
  document.getElementById("head1").textContent = names[0];
  document.getElementById("head2").textContent = names[1];
  document.getElementById("head3").textContent = names[2];
}

let currentSchedule = [];

function generate() {
  const weeksInput = Number(document.getElementById("weeks").value) || 8;
  const weeks = Math.min(52, Math.max(1, weeksInput));
  document.getElementById("weeks").value = weeks;

  updateHeaders();
  currentSchedule = buildSchedule(weeks);
  renderSchedule(currentSchedule);
  renderSummary(currentSchedule, weeks);
  renderValidation(validateSchedule(currentSchedule, weeks));
}

function exportCSV() {
  if (!currentSchedule.length) generate();

  const names = getNames();
  const rows = [
    ["Semana", "Día", ...names],
    ...currentSchedule.map(row => [
      row.week,
      row.day,
      ...row.shifts.map(shift => `${shift} ${SHIFT_INFO[shift].label}`)
    ])
  ];

  const csv = rows
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "turnos-jefes-servicio.csv";
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("generateBtn").addEventListener("click", generate);
document.getElementById("csvBtn").addEventListener("click", exportCSV);

["js1", "js2", "js3"].forEach(id => {
  document.getElementById(id).addEventListener("change", generate);
});

generate();
