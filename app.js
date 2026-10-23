// Property management cost analysis: compares fee plans (or self-managing)
// over 3 years. Everything is worked out on the page from what's typed in;
// it loads no data, so there's nothing to refresh.

// ------------------------------------------------------------- settings
// The numbers the page opens with. Change them here to change the defaults.
const SETTINGS = {
  increase2: 5, // % rent goes up in year 2
  increase3: 7, // % rent goes up in year 3 (on top of year 2)
  mortgage: 0, // monthly mortgage payment
  otherFixed: 0, // other fixed monthly costs (HOA, taxes, insurance)
  // Maintenance: industry average is 10–15% of rent, or about 1% of the
  // property's value each year.
  maintenance: { method: "rent", rentPct: 10, valuePct: 1, propertyValue: 0 },
  cashMonths: [3, 6], // recommended cash on hand, in months of fixed costs
  dayChoices: [21, 30, 60, 90], // quick picks for days to rent
  plans: [
    {
      name: "Plan A",
      rent: 2700, // monthly rent this company expects in year 1
      days: 60, // days the property sits empty before it's rented
      management: { type: "pct", value: 10 },
      leasing: { type: "flat", value: 1350 },
      renewal: { type: "flat", value: 675 },
      reserve: 500,
      inspection: 0,
      tax1099: 0,
    },
    {
      name: "Plan B",
      rent: 2600,
      days: 21,
      management: { type: "pct", value: 10 },
      leasing: { type: "pct", value: 50 },
      renewal: { type: "pct", value: 25 },
      reserve: 500,
      inspection: 0,
      tax1099: 0,
    },
  ],
  // "I Don't Want A Property Manager". Hours follow industry averages: 5–20
  // hours a month for a single-family rental, 8–15 for routine management.
  self: {
    name: "Self-Managed",
    companyName: "Professional Management", // what Plan A is called on this tab
    rent: 2600,
    days: 45,
    marketing: 150, // advertising, listing and screening, each time it's rented
    software: 0, // rent-collection software, lease forms, bookkeeping, per month
    salary: 60000, // yearly pay, to put a price on an hour
    hours: {
      listing: 4, // up front: photos, listing and marketing
      showings: 10, // up front: showings
      screening: 4, // up front: screening applicants, signing the lease
      moveIn: 2, // up front: move-in inspection and keys
      rentCollection: 2, // every month: rent, late payments, bookkeeping
      communication: 3, // every month: tenant calls, texts and emails
      upkeep: 3, // every month: routine upkeep and check-ins
      repairsPerYear: 6, // when something breaks: times a year
      hoursPerRepair: 3, // ...hours each: finding a vendor, quotes, letting them in
      renewal: 3, // once a year: lease renewal (years 2 and 3)
      taxes: 4, // once a year: year-end taxes and records
    },
  },
  workHoursPerYear: 2080, // 40 hours × 52 weeks, to turn a salary into an hourly rate
  colors: ["#2a78d6", "#eb6834", "#1baf7a"], // Plan A, Plan B, Self-Managed
};

// A month counts as 30 days when working out vacancy.
const DAYS_PER_MONTH = 30;

// Fees that can be a percentage or a flat amount.
const SWITCHABLE = [
  { key: "management", label: "Management fee", pct: "% of monthly rent", flat: "$ flat per month", when: "Every rented month" },
  { key: "leasing", label: "Leasing fee", pct: "% of one month's rent", flat: "$ flat", when: "Once, when it's rented" },
  { key: "renewal", label: "Renewal fee", pct: "% of one month's rent", flat: "$ flat", when: "Start of years 2 and 3" },
];

// Fees that are always a dollar amount.
const FLAT = [
  { key: "reserve", label: "Reserve", when: "Once, in month 1" },
  { key: "inspection", label: "Annual inspection fee", when: "Once a year, in month 12" },
  { key: "tax1099", label: "End of year 1099 fee", when: "Once a year, in month 12" },
];

// Self-management time, in groups. `kind` says when the hours happen.
const HOUR_GROUPS = [
  {
    title: "Up Front, To Get It Rented",
    hint: "Once, at the start",
    fields: [
      ["listing", "Photos, listing & marketing"],
      ["showings", "Showings"],
      ["screening", "Screening & signing the lease"],
      ["moveIn", "Move-in inspection & keys"],
    ],
  },
  {
    title: "Every Month",
    hint: "Once it's rented",
    fields: [
      ["rentCollection", "Rent collection & bookkeeping"],
      ["communication", "Tenant calls, texts & emails"],
      ["upkeep", "Routine upkeep & check-ins"],
    ],
  },
  {
    title: "When Something Breaks",
    hint: "Finding a vendor, getting quotes, letting them in",
    fields: [
      ["repairsPerYear", "Repairs per year", "times"],
      ["hoursPerRepair", "Hours for each repair"],
    ],
  },
  {
    title: "Once A Year",
    hint: "",
    fields: [
      ["renewal", "Lease renewal (years 2 & 3)"],
      ["taxes", "Year-end taxes & records"],
    ],
  },
];

// "What would you rather be doing?" answers, and how they read in a sentence.
const ACTIVITIES = [
  ["Golfing", "on the golf course"],
  ["Traveling", "traveling"],
  ["Spoiling The Grandkids", "with the grandkids"],
  ["Fishing", "fishing"],
  ["Napping, Honestly", "napping"],
  ["Literally Anything Else", "doing literally anything else"],
];

// Management costs, out-of-pocket costs and maintenance, in table order.
const COST_ROWS = [
  { key: "management", label: "Management fee" },
  { key: "leasing", label: "Leasing fee" },
  { key: "renewal", label: "Renewal fee" },
  { key: "reserve", label: "Reserve" },
  { key: "inspection", label: "Annual inspection" },
  { key: "tax1099", label: "1099 fee" },
  { key: "selfMarketing", label: "Advertising & screening" },
  { key: "selfSoftware", label: "Software & forms" },
  { key: "maintenance", label: "Maintenance & repairs" },
];

// The owner's own fixed costs, the same under every plan.
const FIXED_ROWS = [
  { key: "mortgage", label: "Mortgage" },
  { key: "otherFixed", label: "Other fixed costs" },
];

// -------------------------------------------------------------- helpers

function $(id) {
  return document.getElementById(id);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

// Blank or negative boxes count as 0.
function readNumber(input) {
  const n = Number(input.value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const round2 = (n) => Math.round(n * 100) / 100;

function money(n, { sign = false } = {}) {
  const r = round2(n);
  const text = Math.abs(r).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(r) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  if (r < 0) return "−" + text;
  return sign && r > 0 ? "+" + text : text;
}

function hours(n, { sign = false } = {}) {
  const r = Math.round(n * 10) / 10;
  const text = Math.abs(r).toLocaleString("en-US", { maximumFractionDigits: 1 }) + " hrs";
  if (r < 0) return "−" + text;
  return sign && r > 0 ? "+" + text : text;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Negative cash flow shows in red.
const tone = (n) => (round2(n) < 0 ? " text-red-600" : "");

const INPUT = "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-plan-a";

function colorDot(color, size = "h-3 w-3") {
  const dot = el("span", size + " shrink-0 rounded-full");
  dot.style.background = color;
  return dot;
}

function button(text, className, onClick) {
  const b = el("button", className, text);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

// ---------------------------------------------------------- plan forms

const planInputs = []; // per company: { name, rent, days, management: {type, value}, ..., reserve, ... }
const selfInputs = { hours: {} };

function field(labelText, hint, control) {
  const wrap = el("label", "block");
  const top = el("div", "flex items-baseline justify-between gap-2");
  top.append(el("span", "text-sm font-medium text-slate-700", labelText), el("span", "text-xs text-slate-400", hint));
  wrap.append(top, control);
  return wrap;
}

function numberInput(value, step) {
  const input = el("input", INPUT);
  input.type = "number";
  input.min = "0";
  input.step = step;
  input.inputMode = "decimal";
  input.value = value;
  return input;
}

// Box with a "$", "%", "hrs" or "days" beside the number.
function affixInput(value, step, { prefix, suffix, big = false, small = false }) {
  const box = el("div", "mt-1 flex items-center rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-plan-a");
  const size = big ? "py-2 text-2xl font-semibold" : small ? "py-1.5 text-sm" : "py-2 text-lg";
  const input = el("input", "w-full rounded-lg px-2 outline-none " + size);
  input.type = "number";
  input.min = "0";
  input.step = step;
  input.inputMode = "decimal";
  input.value = value;
  if (prefix) box.append(el("span", "pl-3 text-slate-400 " + (big ? "text-2xl" : small ? "text-sm" : ""), prefix));
  box.append(input);
  if (suffix) box.append(el("span", "pr-3 text-slate-400 " + (small ? "text-sm" : ""), suffix));
  return { box, input };
}

// A rent and days-to-rent column in the top section.
function buildRent(defaults, color, inputs) {
  const col = el("div", "rounded-lg border border-slate-200 p-4");
  const head = el("p", "flex items-center gap-2 font-medium mb-3");
  inputs.rentLabel = el("span", "", defaults.name);
  head.append(colorDot(color), inputs.rentLabel);

  const rent = affixInput(defaults.rent, "25", { prefix: "$", big: true });
  rent.input.setAttribute("aria-label", "Monthly rent");
  const rentField = el("label", "block");
  rentField.append(el("span", "text-sm text-slate-600", "Monthly rent expected"), rent.box);

  const days = affixInput(defaults.days, "1", { suffix: "days" });
  days.input.setAttribute("aria-label", "Days to rent");
  const daysField = el("div", "mt-3");
  const daysLabel = el("label", "block");
  daysLabel.append(el("span", "text-sm text-slate-600", "Days on the market before it's rented"), days.box);
  const picks = el("div", "mt-2 flex flex-wrap gap-1.5");
  for (const d of SETTINGS.dayChoices) {
    picks.append(
      button(`${d} days`, "rounded-full border border-slate-300 px-2.5 py-0.5 text-xs text-slate-600 hover:bg-slate-100", () => {
        days.input.value = d;
        update();
      }),
    );
  }
  daysField.append(daysLabel, picks);

  col.append(head, rentField, daysField);
  col.addEventListener("input", update);
  $("rent-plans").append(col);
  inputs.rentCol = col;
  inputs.rent = rent.input;
  inputs.days = days.input;
}

function buildPlan(index) {
  const defaults = SETTINGS.plans[index];
  const card = $(index === 0 ? "plan-a" : "plan-b");
  const inputs = {};

  const head = el("div", "flex items-center gap-2 mb-4");
  inputs.name = el("input", "w-full rounded-lg border border-transparent px-2 py-1 text-lg font-semibold hover:border-slate-300 focus:border-slate-300 outline-none");
  inputs.name.value = defaults.name;
  inputs.name.setAttribute("aria-label", "Company name");
  head.append(colorDot(SETTINGS.colors[index]), inputs.name);
  card.append(head);

  buildRent(defaults, SETTINGS.colors[index], inputs);

  const body = el("div", "space-y-4");
  for (const fee of SWITCHABLE) {
    const row = el("div", "mt-1 flex gap-2");
    const type = el("select", "min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm");
    type.setAttribute("aria-label", fee.label + " type");
    for (const [value, text] of [["pct", fee.pct], ["flat", fee.flat]]) {
      const option = el("option", "", text);
      option.value = value;
      type.append(option);
    }
    type.value = defaults[fee.key].type;
    const value = numberInput(defaults[fee.key].value, "0.5");
    value.classList.replace("w-full", "w-28");
    value.classList.add("shrink-0");
    value.setAttribute("aria-label", fee.label + " amount");
    // Switching between % and $ converts the amount, using this plan's rent.
    type.addEventListener("change", () => {
      const rent = readNumber(inputs.rent);
      const v = readNumber(value);
      if (rent > 0 && v > 0) value.value = type.value === "flat" ? round2((rent * v) / 100) : round2((v / rent) * 100);
      update();
    });
    row.append(type, value);
    body.append(field(fee.label, fee.when, row));
    inputs[fee.key] = { type, value };
  }
  for (const fee of FLAT) {
    const box = el("div", "mt-1");
    const value = numberInput(defaults[fee.key], "25");
    value.setAttribute("aria-label", fee.label + " in dollars");
    box.append(value);
    body.append(field(fee.label + " ($)", fee.when, box));
    inputs[fee.key] = value;
  }
  card.append(body);
  card.addEventListener("input", update);
  planInputs[index] = inputs;
}

// The "I Don't Want A Property Manager" card: out-of-pocket costs, hours,
// and what an hour is worth.
let retired = false;
let activity = null; // [label, phrase] from ACTIVITIES

function buildSelf() {
  const defaults = SETTINGS.self;
  const color = SETTINGS.colors[2];
  const card = $("self-card");
  const head = el("div", "flex items-center gap-2 mb-1");
  head.append(colorDot(color), el("h2", "text-lg font-semibold", "Self-Managed"));
  card.append(head, el("p", "text-sm text-slate-500 mb-4", "No management fees, but you pay for it in time and a few out-of-pocket costs."));

  buildRent(defaults, color, selfInputs);

  // Out-of-pocket costs.
  const costs = el("div", "space-y-4");
  costs.append(el("h3", "font-semibold text-slate-800", "Out-Of-Pocket Costs"));
  const marketing = affixInput(defaults.marketing, "25", { prefix: "$", small: true });
  costs.append(field("Advertising, listing & screening", "Each time it's rented", marketing.box));
  const software = affixInput(defaults.software, "5", { prefix: "$", small: true });
  costs.append(field("Software, lease forms & bookkeeping", "Per month", software.box));
  selfInputs.marketing = marketing.input;
  selfInputs.software = software.input;
  card.append(costs);

  // Hours.
  const time = el("div", "mt-6 space-y-4");
  time.append(
    el("h3", "font-semibold text-slate-800", "Your Time"),
    el(
      "p",
      "rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600",
      "A self-managing landlord typically spends 5 to 20 hours per month managing a single-family rental property " +
        "(roughly 60 to 240+ hours per year), with industry averages placing routine single-property management at 8 to 15 hours per month.",
    ),
  );
  for (const group of HOUR_GROUPS) {
    const box = el("div", "rounded-lg border border-slate-200 p-3");
    const top = el("div", "flex flex-wrap items-baseline justify-between gap-x-2 mb-2");
    top.append(el("p", "text-sm font-semibold text-slate-700", group.title), el("span", "text-xs text-slate-400", group.hint));
    const grid = el("div", "grid gap-3 sm:grid-cols-2");
    for (const [key, label, unit = "hrs"] of group.fields) {
      const input = affixInput(defaults.hours[key], "0.5", { suffix: unit, small: true });
      input.input.setAttribute("aria-label", label);
      const f = el("label", "block");
      f.append(el("span", "text-xs text-slate-600", label), input.box);
      grid.append(f);
      selfInputs.hours[key] = input.input;
    }
    box.append(top, grid);
    time.append(box);
  }
  selfInputs.hoursSummary = el("p", "text-sm text-slate-700");
  time.append(selfInputs.hoursSummary);
  card.append(time);

  // What an hour is worth.
  const worth = el("div", "mt-6 space-y-3");
  worth.append(el("h3", "font-semibold text-slate-800", "What's Your Time Worth?"));
  // Pay as a yearly salary or an hourly rate; switching converts the amount.
  const payType = el("select", "min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm");
  payType.setAttribute("aria-label", "Pay type");
  for (const [value, text] of [["year", "Annual salary"], ["hour", "Per hour"]]) {
    const option = el("option", "", text);
    option.value = value;
    payType.append(option);
  }
  selfInputs.yearOption = payType.firstChild;
  const salary = affixInput(defaults.salary, "1000", { prefix: "$", suffix: "a year" });
  salary.box.classList.add("w-44", "shrink-0");
  const suffix = salary.box.lastChild;
  suffix.classList.add("whitespace-nowrap");
  payType.addEventListener("change", () => {
    const hourly = payType.value === "hour";
    const v = readNumber(salary.input);
    if (v > 0) salary.input.value = hourly ? round2(v / SETTINGS.workHoursPerYear) : Math.round(v * SETTINGS.workHoursPerYear);
    salary.input.step = hourly ? "0.5" : "1000";
    renderPayUnit();
    update();
  });
  selfInputs.suffix = suffix;
  const payRow = el("div", "mt-1 flex items-end gap-2");
  payRow.append(payType, salary.box);
  selfInputs.salaryField = field("What you earn", "Before taxes", payRow);
  const [payLabel, payHint] = selfInputs.salaryField.firstChild.children;
  selfInputs.payLabel = payLabel;
  selfInputs.payHint = payHint;
  selfInputs.salary = salary.input;
  selfInputs.payType = payType;
  selfInputs.retiredButton = button("", "w-full rounded-lg border px-3 py-2 text-sm font-medium", toggleRetired);
  selfInputs.rateSummary = el("p", "text-sm text-slate-700");
  worth.append(selfInputs.salaryField, selfInputs.retiredButton, selfInputs.rateSummary);
  card.append(worth);

  card.addEventListener("input", update);
  renderRetiredButton();
}

function renderRetiredButton() {
  const b = selfInputs.retiredButton;
  b.textContent = retired ? "✓ I Am Retired / I Don't Work" : "I Am Retired / I Don't Work";
  b.className = "w-full rounded-lg border px-3 py-2 text-sm font-medium " + (retired ? "border-self bg-self/10 text-slate-900" : "border-slate-300 bg-white hover:bg-slate-100");
  b.setAttribute("aria-pressed", retired);
  // Retired: the same box asks for yearly income instead of a salary.
  selfInputs.payLabel.textContent = retired ? "Your yearly income" : "What you earn";
  selfInputs.payHint.textContent = retired ? "Pension, Social Security, investments" : "Before taxes";
  selfInputs.yearOption.textContent = retired ? "Yearly income" : "Annual salary";
  selfInputs.salary.placeholder = retired ? "Enter amount" : "0";
}

function renderPayUnit() {
  const hourly = selfInputs.payType.value === "hour";
  selfInputs.salary.step = hourly ? "0.5" : "1000";
  selfInputs.suffix.textContent = hourly ? "an hour" : "a year";
}

// The salary and the retirement income are kept apart, so switching back
// and forth doesn't lose either.
const savedPay = { working: null, retired: { value: "", unit: "year" } };

function toggleRetired() {
  savedPay[retired ? "retired" : "working"] = { value: selfInputs.salary.value, unit: selfInputs.payType.value };
  retired = !retired;
  const next = savedPay[retired ? "retired" : "working"];
  selfInputs.salary.value = next.value;
  selfInputs.payType.value = next.unit;
  renderPayUnit();
  renderRetiredButton();
  update();
  if (retired) openActivityPrompt();
}

// The pop-up: "What would you rather be doing?"
function openActivityPrompt() {
  const modal = $("modal");
  const box = el("div", "w-full max-w-md rounded-2xl bg-white p-6 shadow-xl");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "What Would You Rather Be Doing?");
  box.append(
    el("p", "text-4xl", "🏖️"),
    el("h2", "mt-2 text-xl font-semibold", "What Would You Rather Be Doing?"),
    el("p", "mt-1 text-sm text-slate-600", "You earned your retirement. Is this really how you want to spend it, answering a 2 a.m. call about a leaky toilet?"),
  );
  const choices = el("div", "mt-4 grid gap-2 sm:grid-cols-2");
  for (const choice of ACTIVITIES) {
    choices.append(
      button(choice[0], "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:border-self hover:bg-self/10", () => {
        activity = choice;
        closeModal();
        update();
      }),
    );
  }
  box.append(choices, button("Honestly? I Love Fixing Toilets.", "mt-3 w-full text-center text-xs text-slate-500 hover:underline", () => {
    activity = null;
    closeModal();
    update();
  }));
  modal.replaceChildren(box);
  modal.hidden = false;
  choices.querySelector("button").focus();
}

function closeModal() {
  $("modal").hidden = true;
  $("modal").replaceChildren();
}

// ---------------------------------------------------------------- maths

function readShared() {
  return {
    increases: [0, readNumber($("increase2")), readNumber($("increase3"))],
    mortgage: readNumber($("mortgage")),
    otherFixed: readNumber($("other-fixed")),
    maintMethod: $("maint-method").value,
    maintPct: readNumber($("maint-pct")),
    propertyValue: readNumber($("property-value")),
  };
}

function readPlan(index) {
  const inputs = planInputs[index];
  const plan = {
    name: inputs.name.value.trim() || (index === 0 ? "Plan A" : "Plan B"),
    color: SETTINGS.colors[index],
    rent: readNumber(inputs.rent),
    days: Math.round(readNumber(inputs.days)),
  };
  for (const fee of SWITCHABLE) plan[fee.key] = { type: inputs[fee.key].type.value, value: readNumber(inputs[fee.key].value) };
  for (const fee of FLAT) plan[fee.key] = readNumber(inputs[fee.key]);
  return plan;
}

// Self-management as a plan with no fees, plus its costs and hours.
function readSelf() {
  const none = { type: "flat", value: 0 };
  const h = {};
  for (const [key, input] of Object.entries(selfInputs.hours)) h[key] = readNumber(input);
  return {
    name: SETTINGS.self.name,
    color: SETTINGS.colors[2],
    self: true,
    rent: readNumber(selfInputs.rent),
    days: Math.round(readNumber(selfInputs.days)),
    management: none,
    leasing: none,
    renewal: none,
    reserve: 0,
    inspection: 0,
    tax1099: 0,
    marketing: readNumber(selfInputs.marketing),
    software: readNumber(selfInputs.software),
    hours: h,
    hourlyRate:
      selfInputs.payType.value === "hour" ? readNumber(selfInputs.salary) : readNumber(selfInputs.salary) / SETTINGS.workHoursPerYear,
  };
}

const feeAmount = (fee, rent) => round2(fee.type === "pct" ? (rent * fee.value) / 100 : fee.value);

// Maintenance for one month: a share of the rent collected, or a twelfth
// of a share of the property's value.
function maintenanceFor(shared, rent) {
  if (shared.maintMethod === "value") return round2((shared.propertyValue * shared.maintPct) / 100 / 12);
  return round2((rent * shared.maintPct) / 100);
}

// Monthly rent for years 1–3.
function yearlyRents(shared, startRent) {
  const rents = [];
  let rent = startRent;
  for (let year = 0; year < 3; year++) {
    rent = round2(rent * (1 + shared.increases[year] / 100));
    rents.push(rent);
  }
  return rents;
}

// Self-management hours in one month. Getting it rented happens up front in
// month 1; routine hours scale with how much of the month it's rented;
// repairs are spread over the year.
function selfHours(h, index, share) {
  const m = index % 12;
  const year = Math.floor(index / 12);
  let total = (h.rentCollection + h.communication + h.upkeep) * share + (h.repairsPerYear * h.hoursPerRepair) / 12;
  if (index === 0) total += h.listing + h.showings + h.screening + h.moveIn;
  if (year > 0 && m === 0) total += h.renewal;
  if (m === 11) total += h.taxes;
  return total;
}

// 36 months for one plan. The property sits empty for `plan.days` days
// first: no rent comes in, the management fee (and maintenance, when it's a
// share of rent) is only charged on rent collected, and the leasing fee is
// charged in the month a tenant moves in. The mortgage is paid regardless.
function months(shared, plan) {
  const rows = [];
  const moveInMonth = Math.floor(plan.days / DAYS_PER_MONTH);
  yearlyRents(shared, plan.rent).forEach((fullRent, year) => {
    for (let m = 0; m < 12; m++) {
      const index = year * 12 + m;
      const rentedDays = Math.min(Math.max(DAYS_PER_MONTH * (index + 1) - plan.days, 0), DAYS_PER_MONTH);
      const share = rentedDays / DAYS_PER_MONTH;
      const rent = round2(fullRent * share);
      const row = {
        month: index + 1,
        fullRent,
        vacancy: round2(fullRent - rent),
        rent,
        management: round2(feeAmount(plan.management, fullRent) * share),
        leasing: index === moveInMonth ? feeAmount(plan.leasing, fullRent) : 0,
        renewal: year > 0 && m === 0 ? feeAmount(plan.renewal, fullRent) : 0,
        reserve: index === 0 ? plan.reserve : 0,
        inspection: m === 11 ? plan.inspection : 0,
        tax1099: m === 11 ? plan.tax1099 : 0,
        selfMarketing: plan.self && index === moveInMonth ? plan.marketing : 0,
        selfSoftware: plan.self ? plan.software : 0,
        maintenance: maintenanceFor(shared, rent),
        mortgage: shared.mortgage,
        otherFixed: shared.otherFixed,
        hours: plan.self ? selfHours(plan.hours, index, share) : 0,
      };
      row.timeCost = plan.self ? round2(row.hours * plan.hourlyRate) : 0;
      row.total = COST_ROWS.reduce((t, c) => t + row[c.key], 0);
      row.owner = row.rent - row.total;
      row.cash = row.owner - row.mortgage - row.otherFixed;
      row.cashAfterTime = row.cash - row.timeCost;
      rows.push(row);
    }
  });
  return rows;
}

const SUM_KEYS = [
  "fullRent", "vacancy", "rent", ...COST_ROWS.map((c) => c.key), "total", "owner",
  ...FIXED_ROWS.map((c) => c.key), "cash", "hours", "timeCost", "cashAfterTime",
];

// Sum of rows: year 0–2, or all 36 months when `year` is "all".
function totals(rows, year) {
  const pick = year === "all" ? rows : rows.slice(year * 12, year * 12 + 12);
  const out = {};
  for (const key of SUM_KEYS) out[key] = pick.reduce((t, r) => t + r[key], 0);
  return out;
}

// --------------------------------------------------------------- render

// "compare": two companies. "one": just the first company. "self": the
// first company against managing it yourself.
let mode = "compare";
let selectedYear = "all";
let chart = null;
let lastResult = null;

const MODES = [
  {
    value: "compare",
    label: "Compare Two Companies",
    rentIntro: "Each company may promise a different rent, and take a different number of days to find a tenant.",
  },
  {
    value: "one",
    label: "Look At One Company",
    rentIntro: "The rent this company expects, and how many days it may take to find a tenant.",
  },
  {
    value: "self",
    label: "I Don't Want A Property Manager",
    rentIntro: "A company may rent it faster or for more. Put in what you'd expect doing it yourself.",
  },
];

// On the self-managing tab, Plan A is "Professional Management". Each name
// is kept, so renaming it on one tab doesn't change the other.
const companyNames = { self: SETTINGS.self.companyName, other: null };

function swapCompanyName(from, to) {
  if ((from === "self") === (to === "self")) return;
  const input = planInputs[0].name;
  companyNames[from === "self" ? "self" : "other"] = input.value;
  input.value = companyNames[to === "self" ? "self" : "other"];
}

function renderMode() {
  $("mode-tabs").replaceChildren(
    ...MODES.map((m) => {
      const active = mode === m.value;
      const b = button(m.label, "px-4 py-2 " + (active ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"), () => {
        swapCompanyName(mode, m.value);
        mode = m.value;
        renderMode();
        update();
      });
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", active);
      return b;
    }),
  );
  const single = mode === "one";
  const self = mode === "self";
  $("rent-intro").textContent = MODES.find((m) => m.value === mode).rentIntro;
  $("plan-b").hidden = mode !== "compare";
  planInputs[1].rentCol.hidden = mode !== "compare";
  $("self-card").hidden = !self;
  selfInputs.rentCol.hidden = !self;
  $("time-cost").hidden = !self;
  $("plans-grid").classList.toggle("md:grid-cols-2", !single);
  $("rent-plans").classList.toggle("sm:grid-cols-2", !single);
  $("diff-note").hidden = single;
  $("month-plan").hidden = single;
  $("chart-note").textContent = self
    ? "Rent collected minus fees, maintenance, the mortgage and fixed costs, and the value of your time."
    : "Rent collected minus management fees, maintenance, the mortgage and other fixed costs.";
}

function renderRentSummary(shared, plans) {
  $("rent-summary").textContent = plans
    .map((plan) => `${plan.name}: ` + yearlyRents(shared, plan.rent).map((r) => money(r)).join(" → ") + " a month")
    .join("   ·   ");
  planInputs.forEach((inputs, i) => (inputs.rentLabel.textContent = inputs.name.value.trim() || SETTINGS.plans[i].name));
}

function renderMaintenance(shared, plans) {
  $("value-field").hidden = shared.maintMethod !== "value";
  const monthly = Math.max(...plans.map((p) => maintenanceFor(shared, p.rent)));
  let text;
  if (shared.maintMethod === "value" && !shared.propertyValue) text = "Enter the property's market value to work this out.";
  else if (shared.maintMethod === "value") text = `About ${money(monthly)} a month (${money((shared.propertyValue * shared.maintPct) / 100)} a year).`;
  else if (plans.length === 1) text = `About ${money(monthly)} a month in year 1 (${money(monthly * 12)} a year).`;
  else text = `About ${plans.map((p) => `${money(maintenanceFor(shared, p.rent))} a month with ${p.name}'s rent`).join(", ")}, in year 1.`;
  $("maint-summary").textContent = text;
}

// Cash on hand: 3 to 6 months of fixed operating expenses. It's money kept
// in the bank, so it isn't subtracted from cash flow. Maintenance uses the
// higher of the two rents, to be safe.
function renderCashOnHand(shared, plans) {
  const maintenance = Math.max(...plans.map((p) => maintenanceFor(shared, p.rent)));
  const parts = [
    ["Mortgage", shared.mortgage],
    ["Other fixed costs", shared.otherFixed],
    ["Maintenance & repairs", maintenance],
  ];
  const monthly = parts.reduce((t, [, v]) => t + v, 0);
  const card = $("cash-on-hand");
  card.replaceChildren();

  const head = el("div", "flex flex-wrap items-baseline justify-between gap-2");
  head.append(el("h2", "font-semibold", "Recommended Cash On Hand"), el("span", "text-xs text-slate-500", "Industry average: 3 to 6 months of fixed operating expenses"));
  card.append(head);

  const grid = el("div", "mt-4 grid gap-4 sm:grid-cols-3");
  const breakdown = el("div", "rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm");
  breakdown.append(el("p", "text-slate-500 mb-1", "Fixed Operating Expenses Per Month"));
  for (const [label, value] of parts) {
    const line = el("p", "flex justify-between gap-2");
    line.append(el("span", "text-slate-600", label), el("span", "tabular-nums", money(value)));
    breakdown.append(line);
  }
  const sumLine = el("p", "mt-1 pt-1 border-t border-slate-200 flex justify-between gap-2 font-semibold");
  sumLine.append(el("span", "", "Total"), el("span", "tabular-nums", money(monthly)));
  breakdown.append(sumLine);
  grid.append(breakdown);

  const [low, high] = SETTINGS.cashMonths;
  for (const [count, label] of [[low, "Minimum"], [high, "Comfortable"]]) {
    const tile = el("div", "rounded-lg border border-slate-200 p-3");
    tile.append(el("p", "text-sm text-slate-500", `${label}: ${count} Months`), el("p", "text-3xl font-semibold tabular-nums", money(monthly * count)));
    grid.append(tile);
  }
  card.append(grid);
  const note = shared.mortgage
    ? "This is money to keep in the bank for vacancies and surprises. It isn't a monthly cost, so it isn't taken out of the cash flow below."
    : "Add the mortgage payment above to include it here.";
  card.append(el("p", "mt-3 text-xs text-slate-500", note));
}

// Hours summary and hourly rate, inside the self-management card.
function renderSelfSummary(self, rows) {
  const [y1, y2] = [totals(rows, 0), totals(rows, 1)];
  selfInputs.hoursSummary.textContent =
    `Year 1: ${hours(y1.hours)} (about ${hours(y1.hours / 12)} a month, with the up-front work). ` +
    `After that: about ${hours(y2.hours)} a year (${hours(y2.hours / 12)} a month).`;
  const what = retired ? "yearly income" : "salary";
  selfInputs.rateSummary.textContent = !self.hourlyRate
    ? `Enter your ${what} to put a price on your time.`
    : selfInputs.payType.value === "hour"
      ? `Your time is valued at ${money(self.hourlyRate)} an hour (about ${money(Math.round(self.hourlyRate * SETTINGS.workHoursPerYear))} a year).`
      : `That's about ${money(self.hourlyRate)} an hour (your ${what} ÷ ${SETTINGS.workHoursPerYear.toLocaleString()} hours a year).`;
}

// The "Your Time" results section, when comparing against self-managing.
function renderTimeCost(plans, rows) {
  const card = $("time-cost");
  card.replaceChildren();
  if (!plans[1]?.self) return;
  const company = totals(rows[0], "all");
  const self = totals(rows[1], "all");
  card.append(el("h2", "font-semibold", "Your Time, If You Manage It Yourself"));
  card.append(el("p", "text-sm text-slate-500 mb-4", "More hours up front to get it rented, then a steady few hours a month, plus finding vendors when something breaks."));

  const grid = el("div", "grid gap-4 sm:grid-cols-4");
  for (let y = 0; y < 3; y++) {
    const t = totals(rows[1], y);
    const tile = el("div", "rounded-lg border border-slate-200 p-3");
    tile.append(el("p", "text-sm text-slate-500", `Year ${y + 1}`), el("p", "text-2xl font-semibold tabular-nums", hours(t.hours)), el("p", "text-xs text-slate-500", `Worth ${money(t.timeCost)}`));
    grid.append(tile);
  }
  const all = el("div", "rounded-lg border-2 border-self/40 p-3");
  all.append(el("p", "text-sm text-slate-500", "All 3 Years"), el("p", "text-2xl font-semibold tabular-nums", hours(self.hours)), el("p", "text-xs text-slate-500", `Worth ${money(self.timeCost)}`));
  grid.append(all);
  card.append(grid);

  // What self-managing pays per hour of work.
  const saved = self.cash - company.cash;
  let text;
  if (!self.hours) text = "Add your hours above to see what your time is worth.";
  else if (saved <= 0) text = `Self-managing doesn't save money here: ${plans[0].name} leaves you ${money(-saved)} more over 3 years, before even counting your ${hours(self.hours)}.`;
  else {
    const perHour = saved / self.hours;
    text =
      `Self-managing keeps ${money(saved)} more in your pocket over 3 years, for ${hours(self.hours)} of work. ` +
      `That's like paying yourself ${money(perHour)} an hour` +
      (perHour < plans[1].hourlyRate ? `, less than the ${money(plans[1].hourlyRate)} an hour your time is worth.` : `, more than the ${money(plans[1].hourlyRate)} an hour your time is worth.`);
  }
  card.append(el("p", "mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700", text));
  if (retired && activity && self.hours) {
    const days = Math.round(self.hours / 8);
    card.append(el("p", "mt-3 text-sm text-slate-700", `That's ${hours(self.hours)}, or about ${plural(days, "full day")}, you could spend ${activity[1]} instead.`));
  }
}

function headlineCard(title, value, sub, color, valueClass = "") {
  const card = el("div", "rounded-xl bg-white border border-slate-200 p-4");
  const top = el("p", "flex items-center gap-2 text-sm text-slate-500");
  if (color) top.append(colorDot(color, "h-2.5 w-2.5"));
  top.append(document.createTextNode(title));
  card.append(top, el("p", "text-3xl font-semibold" + valueClass, value), el("p", "text-xs text-slate-500", sub));
  return card;
}

function renderHeadline(plans, sums) {
  const cards = plans.map((plan, i) =>
    headlineCard(
      `${plan.name}: Owner's Cash Flow`,
      money(sums[i].cash),
      plan.self
        ? `Over 3 years, plus ${hours(sums[i].hours)} of your time (worth ${money(sums[i].timeCost)})`
        : `Over 3 years, after ${plural(plan.days, "day")} empty and ${money(sums[i].rent - sums[i].cash)} in costs`,
      plan.color,
      tone(sums[i].cash),
    ),
  );
  if (plans.length === 1) {
    const s = sums[0];
    cards.push(
      headlineCard("Average Cash Flow Per Month", money(s.cash / 36), "Over the 3 years, after every cost", null, tone(s.cash)),
      headlineCard("Paid To The Management Company", money(s.total - s.maintenance), `Over 3 years, about ${money((s.total - s.maintenance) / 36)} a month on average`),
    );
  } else if (plans[1].self) {
    // Counting the value of your time.
    const diff = round2(sums[1].cashAfterTime) - round2(sums[0].cashAfterTime);
    const winner = diff > 0 ? "Self-Managing" : plans[0].name;
    cards.push(
      headlineCard(
        round2(diff) === 0 ? "Counting Your Time, It's A Tie" : `Counting Your Time, ${winner} Comes Out Ahead`,
        money(Math.abs(diff)),
        `Over 3 years, after valuing your ${hours(sums[1].hours)} at ${money(plans[1].hourlyRate)} an hour.`,
      ),
    );
  } else {
    const diff = round2(sums[1].cash) - round2(sums[0].cash);
    let title = "Difference Over 3 Years";
    let sub = "Both plans leave the owner the same amount.";
    if (round2(diff) !== 0) {
      const better = diff > 0 ? plans[1].name : plans[0].name;
      title = `${better} Puts More In The Owner's Pocket`;
      sub = `${better} leaves the owner ${money(Math.abs(diff))} more over 3 years, counting rent, vacancy and fees.`;
    }
    cards.push(headlineCard(title, money(Math.abs(diff)), sub));
  }
  $("headline").replaceChildren(...cards);
}

// What the empty days cost each plan, and whether a higher rent makes up
// for a longer wait.
function renderVacancy(shared, plans, rows) {
  const card = $("vacancy");
  card.replaceChildren(el("h2", "font-semibold", "Cost Of Vacancy"));
  card.append(el("p", "text-sm text-slate-500 mb-4", "While the property sits empty, no rent comes in but the mortgage and fixed costs are still due."));

  const fixed = shared.mortgage + shared.otherFixed;
  const lost = rows.map((r) => totals(r, "all").vacancy);
  const grid = el("div", "grid gap-4 sm:grid-cols-2");
  plans.forEach((plan, i) => {
    const tile = el("div", "rounded-lg border border-slate-200 p-4");
    const head = el("p", "flex items-center gap-2 text-sm text-slate-500");
    head.append(colorDot(plan.color, "h-2.5 w-2.5"), document.createTextNode(`${plan.name}: ${plural(plan.days, "day")} empty at ${money(plan.rent)}/month`));
    tile.append(head, el("p", "text-3xl font-semibold tabular-nums", money(lost[i])), el("p", "text-sm text-slate-600", "in rent lost while it's empty"));
    if (fixed && plan.days) {
      const paid = (fixed * plan.days) / DAYS_PER_MONTH;
      tile.append(el("p", "mt-1 text-xs text-slate-500", `The owner also pays about ${money(paid)} in mortgage and fixed costs during that time.`));
    }
    grid.append(tile);
  });
  card.append(grid);

  // Does the higher rent make up for the longer wait?
  const [a, b] = plans;
  let text = null;
  if (b && a.rent !== b.rent && a.days !== b.days) {
    const hi = a.rent > b.rent ? 0 : 1;
    const lo = 1 - hi;
    const extraRent = plans[hi].rent - plans[lo].rent;
    if (plans[hi].days <= plans[lo].days) {
      text = `${plans[hi].name} expects more rent and a shorter wait, so it comes out ahead on both.`;
    } else {
      const extraDays = plans[hi].days - plans[lo].days;
      const extraLost = lost[hi] - lost[lo];
      // First month where the higher rent has collected as much in total,
      // counting the yearly increases.
      let gap = 0;
      let caughtUp = null;
      for (let m = 0; m < 36 && caughtUp === null; m++) {
        gap += rows[hi][m].rent - rows[lo][m].rent;
        if (m >= Math.floor(plans[hi].days / DAYS_PER_MONTH) && round2(gap) >= 0) caughtUp = m + 1;
      }
      text =
        `${plans[hi].name}'s rent is ${money(extraRent)} a month higher, but its extra ${plural(extraDays, "day")} empty cost about ${money(extraLost)} in rent. ` +
        (caughtUp === null
          ? "The higher rent doesn't make that up within 3 years."
          : `The higher rent makes that up by month ${caughtUp}` + (caughtUp > 12 ? " — longer than a typical 12-month lease." : "."));
    }
  }
  if (text) card.append(el("p", "mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700", text));
}

function renderTabs() {
  const tabs = [["0", "Year 1"], ["1", "Year 2"], ["2", "Year 3"], ["all", "All 3 Years"]];
  $("year-tabs").replaceChildren(
    ...tabs.map(([value, text]) => {
      const active = String(selectedYear) === value;
      const b = button(text, "px-3 py-1.5 " + (active ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-100"), () => {
        selectedYear = value === "all" ? "all" : Number(value);
        renderTabs();
        renderTotals();
      });
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", active);
      return b;
    }),
  );
}

// One row: a value per plan, plus the difference when there are two.
function totalsRow(label, values, { strong = false, hide = false, signed = false, format = money } = {}) {
  if (hide) return null;
  const tr = el("tr", "border-b border-slate-100" + (strong ? " font-semibold bg-slate-50" : ""));
  tr.append(el("td", "py-2 pr-4", label));
  for (const v of values) tr.append(el("td", "py-2 px-3 text-right tabular-nums" + (signed ? tone(v) : ""), format(v)));
  if (values.length === 2) {
    tr.append(el("td", "py-2 pl-3 text-right tabular-nums text-slate-600", format(round2(values[1]) - round2(values[0]), { sign: true })));
  }
  return tr;
}

function renderTotals() {
  const { plans, rows } = lastResult;
  const sums = rows.map((r) => totals(r, selectedYear));
  const head = el("tr", "text-left text-slate-500 border-b border-slate-200");
  head.append(el("th", "py-2 pr-4 font-medium", "Item"), ...plans.map((p) => el("th", "py-2 px-3 font-medium text-right", p.name)));
  if (plans.length === 2) head.append(el("th", "py-2 pl-3 font-medium text-right", "Difference"));
  $("totals-head").replaceChildren(head);

  const pick = (key, flip = 1) => sums.map((s) => flip * s[key]);
  // Rows that are zero for every plan are left out to keep it short.
  const allZero = (key) => sums.every((s) => round2(s[key]) === 0);
  const hasVacancy = !allZero("vacancy");
  const hasFixed = FIXED_ROWS.some((c) => !allZero(c.key));
  const lines = [];
  if (hasVacancy) {
    lines.push(totalsRow("Rent if never empty", pick("fullRent")), totalsRow("Rent lost while empty", pick("vacancy", -1)));
  }
  lines.push(
    totalsRow("Rent collected", pick("rent"), { strong: hasVacancy }),
    ...COST_ROWS.map((c) => totalsRow(c.label, pick(c.key), { hide: allZero(c.key) })),
    totalsRow("Management & maintenance costs", pick("total"), { strong: true }),
    totalsRow(hasFixed ? "Owner keeps before mortgage" : "Owner's cash flow", pick("owner"), { strong: true, signed: true }),
  );
  if (hasFixed) {
    lines.push(
      ...FIXED_ROWS.map((c) => totalsRow(c.label, pick(c.key), { hide: allZero(c.key) })),
      totalsRow("Owner's cash flow after mortgage", pick("cash"), { strong: true, signed: true }),
    );
  }
  if (!allZero("hours")) {
    lines.push(
      totalsRow("Hours of your time", pick("hours"), { format: hours }),
      totalsRow("Value of your time", pick("timeCost")),
      totalsRow("Cash flow after valuing your time", pick("cashAfterTime"), { strong: true, signed: true }),
    );
  }
  $("totals-body").replaceChildren(...lines.filter(Boolean));
}

function renderChart(plans, rows) {
  const data = plans.map((plan, i) => ({
    label: plan.name,
    data: [0, 1, 2].map((y) => round2(totals(rows[i], y).cashAfterTime)),
    backgroundColor: plan.color,
    borderRadius: 4,
    maxBarThickness: 48,
  }));
  if (chart) {
    chart.data.datasets = data;
    chart.options.plugins.legend.display = plans.length > 1;
    chart.update();
    return;
  }
  chart = new Chart($("chart-years"), {
    type: "bar",
    data: { labels: ["Year 1", "Year 2", "Year 3"], datasets: data },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: plans.length > 1, position: "top", align: "start" },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.parsed.y)}` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "#eef0f3" }, ticks: { callback: (v) => money(v) } },
      },
    },
  });
}

function renderMonthPlanPicker(plans) {
  const select = $("month-plan");
  const previous = select.value || "both";
  const options = [["both", "Both Side By Side"], ["0", plans[0].name], ["1", plans[1].name]];
  select.replaceChildren(
    ...options.map(([value, text]) => {
      const option = el("option", "", text);
      option.value = value;
      return option;
    }),
  );
  select.value = previous;
}

function th(text, align = "right") {
  return el("th", `py-2 px-3 font-medium text-${align}`, text);
}

function td(text, extra = "") {
  return el("td", "py-1.5 px-3 text-right tabular-nums " + extra, text);
}

function renderMonthly() {
  const { plans, rows } = lastResult;
  const year = Number($("month-year").value);
  const which = plans.length === 1 ? "0" : $("month-plan").value;
  const head = el("tr", "text-left text-slate-500 border-b border-slate-200");
  const body = [];
  const slice = (i) => rows[i].slice(year * 12, year * 12 + 12);
  const fixedOf = (r) => r.mortgage + r.otherFixed;
  const hasFixed = rows[0].some((r) => fixedOf(r) > 0);

  if (which === "both") {
    // Side by side: rent collected, costs and cash flow per plan; the
    // mortgage is the same for both.
    head.append(th("Month", "left"));
    if (hasFixed) head.append(th("Mortgage & Fixed"));
    for (const plan of plans) head.append(th(`${plan.name} Rent`), th(`${plan.name} Costs`), th(`${plan.name} Cash Flow`));
    const line = (label, pair, rowClass, cellClass) => {
      const tr = el("tr", rowClass);
      tr.append(el("td", cellClass, label));
      if (hasFixed) tr.append(td(money(fixedOf(pair[0]))));
      for (const r of pair) tr.append(td(money(r.rent), r.vacancy ? "text-amber-700" : ""), td(money(r.total)), td(money(r.cash), "font-medium" + tone(r.cash)));
      return tr;
    };
    const [a, b] = [slice(0), slice(1)];
    a.forEach((ra, m) => body.push(line(`Month ${ra.month}`, [ra, b[m]], "border-b border-slate-100", "py-1.5 pr-3")));
    body.push(line(`Year ${year + 1} Total`, [totals(rows[0], year), totals(rows[1], year)], "font-semibold bg-slate-50", "py-2 pr-3"));
  } else {
    // One plan, every cost in its own column (only costs that are used).
    const i = Number(which);
    const plan = slice(i);
    const used = [...COST_ROWS, ...FIXED_ROWS].filter((c) => plan.some((r) => round2(r[c.key]) !== 0));
    const hasVacancy = plan.some((r) => r.vacancy > 0);
    const hasHours = plan.some((r) => r.hours > 0);
    head.append(th("Month", "left"));
    if (hasVacancy) head.append(th("Lost While Empty"));
    head.append(th("Rent Collected"), ...used.map((c) => th(c.label.replace(/\b\w/g, (ch) => ch.toUpperCase()))), th("Total Costs"), th("Cash Flow"));
    if (hasHours) head.append(th("Your Hours"), th("Value Of Your Time"), th("After Your Time"));
    const line = (label, r, rowClass, cellClass) => {
      const tr = el("tr", rowClass);
      tr.append(el("td", cellClass, label));
      if (hasVacancy) tr.append(td(r.vacancy ? money(-r.vacancy) : "—", r.vacancy ? "text-amber-700" : "text-slate-300"));
      tr.append(
        td(money(r.rent)),
        ...used.map((c) => td(r[c.key] ? money(r[c.key]) : "—", r[c.key] ? "" : "text-slate-300")),
        td(money(r.rent - r.cash), "font-medium"),
        td(money(r.cash), "font-medium" + tone(r.cash)),
      );
      if (hasHours) tr.append(td(hours(r.hours)), td(money(r.timeCost)), td(money(r.cashAfterTime), "font-medium" + tone(r.cashAfterTime)));
      return tr;
    };
    for (const r of plan) body.push(line(`Month ${r.month}`, r, "border-b border-slate-100", "py-1.5 pr-3"));
    body.push(line(`Year ${year + 1} Total`, totals(rows[i], year), "font-semibold bg-slate-50", "py-2 pr-3"));
  }
  $("monthly-head").replaceChildren(head);
  $("monthly-body").replaceChildren(...body);
}

function update() {
  const shared = readShared();
  const plans = { compare: [readPlan(0), readPlan(1)], one: [readPlan(0)], self: [readPlan(0), readSelf()] }[mode];
  const rows = plans.map((plan) => months(shared, plan));
  lastResult = { plans, rows };
  renderRentSummary(shared, plans);
  renderMaintenance(shared, plans);
  renderCashOnHand(shared, plans);
  if (plans[1]?.self) renderSelfSummary(plans[1], rows[1]);
  renderHeadline(plans, rows.map((r) => totals(r, "all")));
  renderTimeCost(plans, rows);
  renderVacancy(shared, plans, rows);
  renderTotals();
  renderChart(plans, rows);
  if (plans.length === 2) renderMonthPlanPicker(plans);
  renderMonthly();
}

// ---------------------------------------------------------------- start

$("increase2").value = SETTINGS.increase2;
$("increase3").value = SETTINGS.increase3;
$("mortgage").value = SETTINGS.mortgage || "";
$("other-fixed").value = SETTINGS.otherFixed || "";
$("maint-method").value = SETTINGS.maintenance.method;
$("maint-pct").value = SETTINGS.maintenance.method === "value" ? SETTINGS.maintenance.valuePct : SETTINGS.maintenance.rentPct;
$("property-value").value = SETTINGS.maintenance.propertyValue || "";
for (const id of ["increase2", "increase3", "mortgage", "other-fixed", "maint-pct", "property-value"]) $(id).addEventListener("input", update);
// Switching how maintenance is worked out puts in that method's industry average.
$("maint-method").addEventListener("change", () => {
  $("maint-pct").value = $("maint-method").value === "value" ? SETTINGS.maintenance.valuePct : SETTINGS.maintenance.rentPct;
  update();
});
$("month-plan").addEventListener("change", renderMonthly);
$("month-year").addEventListener("change", renderMonthly);
// The pop-up closes with Escape or a click outside it.
$("modal").addEventListener("click", (event) => {
  if (event.target === $("modal")) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("modal").hidden) closeModal();
});
buildPlan(0);
buildPlan(1);
buildSelf();
renderMode();
renderTabs();
update();
