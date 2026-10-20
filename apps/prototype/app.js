(() => {
  "use strict";

  const STORAGE_KEY = "aldia-prototype-v2";
  const MAX_FILE_BYTES = 5000000;
  const NAV = [
    ["dashboard", "◫", "Inicio"],
    ["expenses", "▤", "Gastos"],
    ["projects", "▦", "Proyectos"],
    ["budgets", "▥", "Presupuestos"],
    ["petty", "▣", "Caja menor"],
    ["reports", "↗", "Reportes"],
    ["settings", "⚙", "Empresa"]
  ];
  const CATEGORIES = ["Operación", "Transporte", "Alimentación", "Tecnología", "Servicios", "Otros"];
  const PROJECTS = ["General", "Proyecto Aurora", "Tienda Norte"];
  const money = (value, currency = "COP") => new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: currency === "COP" ? 0 : 2 }).format(Number(value) || 0);
  const number = value => String(value);
  const bogotaDate = date => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const value = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  };
  const today = () => bogotaDate(new Date());
  const monthLabel = () => new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "America/Bogota" }).format(new Date());
  const dateLabel = value => value ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "—";
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const asDate = offset => bogotaDate(new Date(Date.now() - offset * 86400000));
  const seedExpense = (title, amount, category, project, account, days, vendor) => ({ id: uid(), title, originalAmount: amount, currency: "COP", rate: 1, rateSource: "Moneda base", amountCop: amount, category, project, account, date: asDate(days), vendor, note: "", attachmentName: "", status: "confirmed", createdAt: new Date().toISOString(), confirmedAt: new Date().toISOString(), source: "manual" });
  const seed = () => ({
    version: 2, onboarded: false, company: "Estudio Norte", country: "Colombia", currency: "COP", user: "Ana Rivera",
    projects: [...PROJECTS],
    expenses: [
      seedExpense("Licencia de diseño", 349000, "Tecnología", "General", "Banco principal", 1, "Adobe"),
      seedExpense("Insumos de oficina", 185000, "Operación", "Proyecto Aurora", "Banco principal", 2, "Papelería Central"),
      seedExpense("Transporte a cliente", 42000, "Transporte", "Proyecto Aurora", "Caja menor", 3, "Transporte urbano"),
      seedExpense("Almuerzo de equipo", 138000, "Alimentación", "Tienda Norte", "Caja menor", 5, "Restaurante Local"),
      seedExpense("Servicio de internet", 219000, "Servicios", "General", "Banco principal", 7, "Proveedor de internet")
    ],
    budgets: { total: 5000000, categories: { "Operación": 1200000, "Transporte": 500000, "Alimentación": 600000, "Tecnología": 900000, "Servicios": 1000000, "Otros": 800000 } },
    fund: { responsible: "María Gómez", balance: 1000000, countedExpenseIds: [], reconciliations: [] }
  });
  function readState() {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const parsed = JSON.parse(raw); if (parsed?.version === 2 && Array.isArray(parsed.expenses)) { parsed.projects ||= [...PROJECTS]; return parsed; } } } catch (_) { /* storage unavailable: in-memory demo */ }
    return seed();
  }
  let state = readState();
  let view = "dashboard";
  let modal = null;
  let pendingExpense = null;
  let expenseFilter = "all";
  let expenseSearch = "";
  let fundTab = "activity";
  let audioTimer = null;
  let renderedModal = false;
  let modalDirty = false;
  let modalReturnFocus = null;
  const app = document.querySelector("#app");
  const toastRegion = document.querySelector("#toast-region");
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { toast("Este navegador no pudo guardar los cambios locales."); } }
  function toast(message) { const el = document.createElement("div"); el.className = "toast"; el.textContent = message; toastRegion.append(el); setTimeout(() => el.remove(), 4100); }
  const confirmed = () => state.expenses.filter(e => e.status === "confirmed");
  const confirmedThisMonth = () => confirmed().filter(e => e.date?.slice(0, 7) === today().slice(0, 7));
  const total = expenses => expenses.reduce((sum, e) => sum + Number(e.amountCop || 0), 0);
  const spent = () => total(confirmedThisMonth());
  function currentFundExpenses() {
    const counted = new Set(state.fund.countedExpenseIds || []);
    return confirmed().filter(e => e.account === "Caja menor" && !counted.has(e.id));
  }
  const fundAvailable = () => Number(state.fund.balance) - total(currentFundExpenses());
  const pct = (part, whole) => whole ? Math.round(part / whole * 100) : 0;
  const widthPct = (part, whole) => Math.min(100, Math.max(0, pct(part, whole)));
  const progressClass = (part, whole) => pct(part, whole) >= 100 ? "over" : pct(part, whole) >= 80 ? "warn" : "";
  const budgetValue = (budget, value) => budget > 0 ? money(value) : "Sin definir";
  function iconFor(category) { return ({ "Tecnología": "◈", "Operación": "▤", "Transporte": "↗", "Alimentación": "☕", "Servicios": "✦", "Otros": "◌" })[category] || "◌"; }
  function statusBadge(status) { return `<span class="status ${status === "draft" ? "draft" : ""}">${status === "draft" ? "Borrador" : "Confirmado"}</span>`; }
  function demoBanner() { return `<div class="demo-banner"><strong>Prototipo de demostración · identidad visual temporal.</strong> Los datos son ficticios y los cambios se guardan solo en este navegador. Los datos de versiones anteriores de la demo no se migran. No hay cuentas reales, sincronización ni almacenamiento de comprobantes.</div>`; }

  function render() {
    const openingModal = !!modal && !renderedModal;
    const closingModal = !modal && renderedModal;
    if (openingModal) {
      const active = document.activeElement;
      modalReturnFocus = active?.dataset?.action || active?.dataset?.view ? { action: active.dataset.action, view: active.dataset.view, id: active.dataset.id } : null;
      modalDirty = false;
    }
    document.title = `AlDía APP · ${NAV.find(item => item[0] === view)?.[2] || "Control de gastos"}`;
    app.innerHTML = state.onboarded ? shell() : onboarding();
    if (modal) {
      app.querySelector(".app-shell")?.setAttribute("inert", "");
      app.insertAdjacentHTML("beforeend", renderModal());
      if (modal.type === "expense") updateRateField();
      app.querySelector("#expense-title, .modal input, .modal button")?.focus();
    } else if (closingModal) {
      const candidates = [...app.querySelectorAll("[data-action], [data-view]")];
      const target = candidates.find(el => modalReturnFocus && el.dataset.action === modalReturnFocus.action && el.dataset.view === modalReturnFocus.view && el.dataset.id === modalReturnFocus.id);
      if (target) target.focus();
      else { const heading = app.querySelector(".page-head h1"); if (heading) { heading.tabIndex = -1; heading.focus(); } }
      modalReturnFocus = null;
    }
    renderedModal = !!modal;
  }
  function dismissModal() {
    if (modalDirty && !window.confirm("¿Descartar los cambios sin guardar?")) return;
    modal = null; pendingExpense = null; modalDirty = false; render();
  }
  function shell() {
    const label = NAV.find(item => item[0] === view)?.[2] || "Inicio";
    return `<div class="app-shell">
      <aside class="sidebar" aria-label="Navegación principal">
        <div class="brand"><div class="brand-mark">a.</div><div><div class="brand-name">AlDía APP</div><small>CONTROL DE GASTOS</small></div></div>
        <div class="workspace-switch"><small>Empresa de prueba</small><strong>${escapeHtml(state.company)}</strong></div>
        <nav>${NAV.map(([key, icon, name], index) => `${index === 4 ? '<div class="nav-section">Más herramientas</div>' : ""}<button type="button" data-view="${key}" class="${view === key ? "active" : ""}" ${view === key ? 'aria-current="page"' : ""}><span class="nav-icon">${icon}</span>${name}</button>`).join("")}</nav>
        <div class="sidebar-footer"><small>PILOTO · COLOMBIA</small><strong>Tu negocio, cada gasto al día.</strong>Versión de demostración con datos ficticios.</div>
      </aside>
      <main class="main"><header class="topbar"><div class="topbar-left"><div class="mobile-brand"><span class="brand-mark">a.</span>AlDía APP</div><div class="breadcrumb">Espacio de trabajo&nbsp; / &nbsp;<strong>${label}</strong></div></div><div class="topbar-right"><span class="demo-pill">● DATOS DEMO</span><div class="avatar" title="${escapeHtml(state.user)}">${escapeHtml(state.user.split(" ").map(x => x[0]).slice(0, 2).join(""))}</div></div></header>
      <div class="content">${demoBanner()}${renderView()}</div></main></div>`;
  }
  function pageHead(eyebrow, title, subtitle, actions = "") { return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${actions ? `<div class="head-actions">${actions}</div>` : ""}</div>`; }
  function recentItem(e) { return `<div class="activity-item"><div class="activity-icon">${iconFor(e.category)}</div><div class="activity-main"><strong>${escapeHtml(e.title)}</strong><small>${escapeHtml(e.category)} · ${escapeHtml(e.project)} · ${dateLabel(e.date)}</small></div><div class="activity-amount">− ${money(e.amountCop)}<small>${statusBadge(e.status)}</small></div></div>`; }
  function dashboard() {
    const actual = spent(), budget = Number(state.budgets.total), draftCount = state.expenses.filter(e => e.status === "draft").length;
    return `${pageHead("Vista general · " + monthLabel(), "Tus gastos, en orden.", "Una vista clara para decidir con tranquilidad.", `<button class="btn" data-action="audio">◉ &nbsp;Probar audio simulado</button><button class="btn btn-primary" data-action="new-expense">＋ &nbsp;Nuevo gasto</button>`)}
      <div class="grid grid-four">
        ${metric("Gastos confirmados", money(actual), "◉", `${confirmedThisMonth().length} movimientos este mes`)}
        ${metric("Presupuesto disponible", budgetValue(budget, budget - actual), "◫", budget > 0 ? `${pct(actual, budget)}% usado del límite` : "Configura un límite mensual")}
        ${metric("Caja menor disponible", money(fundAvailable()), "▣", "El saldo puede ser negativo")}
        ${metric("Gastos por revisar", String(draftCount), "▤", "Borradores fuera de los totales")}
      </div>
      <div class="grid grid-two section-gap">
        <section class="card"><div class="card-head"><div><h2>Avance del presupuesto</h2><p>Solo gastos confirmados · valores en COP</p></div><button class="btn btn-sm btn-ghost" data-view="budgets">Ver detalle ↗</button></div><div class="card-body"><div class="budget-summary"><strong>${money(actual)} gastados</strong><span>${budget > 0 ? `de ${money(budget)}` : "Sin presupuesto definido"}</span></div>${budget > 0 ? `<div class="progress-track"><div class="progress-fill ${progressClass(actual,budget)}" style="width:${widthPct(actual,budget)}%"></div></div>` : ""}${categoryRows(3)}</div></section>
        <section class="card"><div class="card-head"><div><h2>Actividad reciente</h2><p>Últimos gastos registrados</p></div><button class="btn btn-sm btn-ghost" data-view="expenses">Ver todos ↗</button></div><div class="card-body activity-list">${state.expenses.slice().reverse().slice(0,5).map(recentItem).join("") || '<div class="empty">Todavía no hay gastos.</div>'}</div></section>
      </div><div class="section-gap alert-box"><span style="font-size:19px">✳</span><div><strong>Una cifra confiable para cada decisión</strong>Los borradores no se cuentan en el panel, los presupuestos ni el CSV. Los gastos en otra moneda conservan valor original, tasa y equivalente en pesos.</div></div>`;
  }
  function metric(label, value, icon, hint) { return `<div class="card metric"><div class="label"><span class="icon">${icon}</span>${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`; }
  function categoryRows(limit) {
    return CATEGORIES.slice(0, limit || CATEGORIES.length).map(cat => { const used = total(confirmedThisMonth().filter(e => e.category === cat)); const cap = Number(state.budgets.categories[cat] || 0); return `<div class="budget-row"><div class="row-top"><strong>${escapeHtml(cat)}</strong><span>${cap > 0 ? `${pct(used, cap)}%` : "Sin límite"}</span></div>${cap > 0 ? `<div class="progress-track"><div class="progress-fill ${progressClass(used,cap)}" style="width:${widthPct(used,cap)}%"></div></div>` : ""}<div class="row-bottom"><span>${money(used)} ejecutados</span><span>${cap > 0 ? `${money(cap)} presupuesto` : "Sin presupuesto definido"}</span></div></div>`; }).join("");
  }
  function filteredExpenses() {
    const term = expenseSearch.trim().toLocaleLowerCase("es-CO");
    return state.expenses.filter(e => (expenseFilter === "all" || e.status === expenseFilter) && (!term || [e.title, e.vendor, e.category, e.project].some(s => String(s).toLocaleLowerCase("es-CO").includes(term)))).slice().reverse();
  }
  function expensesView() {
    const list = filteredExpenses();
    return `${pageHead("Movimientos", "Gastos", "Registra, revisa y encuentra cada gasto en segundos.", `<button class="btn" data-action="audio">◉ &nbsp;Probar audio simulado</button><button class="btn btn-primary" data-action="new-expense">＋ &nbsp;Nuevo gasto</button>`)}
      <div class="card table-card"><div class="toolbar"><label class="search"><span class="visually-hidden">Buscar gastos</span><input id="expense-search" type="search" placeholder="Buscar gasto o proveedor…" value="${escapeHtml(expenseSearch)}" /></label><select id="expense-filter" class="btn" aria-label="Filtrar por estado"><option value="all" ${expenseFilter === "all" ? "selected" : ""}>Todos los estados</option><option value="confirmed" ${expenseFilter === "confirmed" ? "selected" : ""}>Confirmados</option><option value="draft" ${expenseFilter === "draft" ? "selected" : ""}>Borradores</option></select><button class="btn btn-soft" data-action="export" title="Exporta solo gastos confirmados de la búsqueda y el filtro actuales">↓ &nbsp;Exportar vista CSV</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Gasto</th><th>Fecha</th><th>Proyecto · categoría</th><th>Cuenta</th><th>Valor en COP</th><th>Estado</th><th></th></tr></thead><tbody>${list.map(e => `<tr><td>${escapeHtml(e.title)}<div class="muted tiny">${escapeHtml(e.vendor || "Sin proveedor")}${e.currency !== "COP" ? ` · ${money(e.originalAmount,e.currency)} original` : ""}</div></td><td>${dateLabel(e.date)}</td><td>${escapeHtml(e.project)}<div class="muted tiny">${escapeHtml(e.category)}</div></td><td>${escapeHtml(e.account)}</td><td><strong>${money(e.amountCop)}</strong></td><td>${statusBadge(e.status)}</td><td><button class="btn btn-sm btn-ghost" data-action="view-expense" data-id="${escapeHtml(e.id)}">Ver →</button></td></tr>`).join("")}</tbody></table>${list.length ? "" : '<div class="empty"><strong>Sin resultados</strong>Prueba otra búsqueda o crea un gasto.</div>'}</div></div>`;
  }
  function projectsView() {
    return `${pageHead("Organización", "Proyectos", "Agrupa los gastos para saber cuánto cuesta cada iniciativa.", `<button class="btn btn-primary" data-action="new-project">＋ &nbsp;Nuevo proyecto</button>`)}<section class="card"><div class="card-head"><div><h2>Proyectos de ${escapeHtml(state.company)}</h2><p>Los proyectos nuevos aparecen al crear un gasto.</p></div></div><div class="card-body activity-list">${state.projects.map(project => `<div class="activity-item"><div class="activity-icon">▦</div><div class="activity-main"><strong>${escapeHtml(project)}</strong><small>${confirmed().filter(e => e.project === project).length} gastos confirmados</small></div><div class="activity-amount">${money(total(confirmed().filter(e => e.project === project)))}</div></div>`).join("") || '<div class="empty">Crea tu primer proyecto para organizar los gastos.</div>'}</div></section>`;
  }
  function budgetsView() { const actual = spent(), cap = Number(state.budgets.total); return `${pageHead("Control mensual · " + monthLabel(), "Presupuestos", "Compara lo planeado con los gastos confirmados.", `<button class="btn btn-primary" data-action="edit-budget">✎ &nbsp;Ajustar presupuesto</button>`)}<div class="grid grid-four">${metric("Presupuesto mensual", budgetValue(cap, cap), "▥", "Moneda base: COP")}${metric("Ejecutado", money(actual), "◉", "Solo gastos confirmados")}${metric("Disponible", budgetValue(cap, cap-actual), "◫", cap > 0 ? "Puede ser negativo" : "Configura un límite mensual")}${metric("Uso del presupuesto", cap > 0 ? `${pct(actual,cap)}%` : "Sin definir", "↗", cap > 0 ? "Del límite total" : "Aún no hay presupuesto")}</div><section class="card section-gap"><div class="card-head"><div><h2>Detalle por categoría</h2><p>Los límites son editables para explorar escenarios.</p></div></div><div class="card-body">${categoryRows()}</div></section>`; }
  function fundEventItem(c) {
    const when = c.recordedAt ? new Date(c.recordedAt).toLocaleString("es-CO", { timeZone: "America/Bogota" }) : dateLabel(c.date);
    return `<div class="activity-item"><div class="activity-icon">${c.type === "adjustment" ? "✎" : "✓"}</div><div class="activity-main"><strong>${c.type === "adjustment" ? "Ajuste de fondo" : "Conciliación"} · ${escapeHtml(when)}</strong><small>${c.type === "adjustment" ? `Antes ${money(c.expected)} · después ${money(c.counted)}` : `Contado ${money(c.counted)} · esperado ${money(c.expected)} · ${(c.expenseIds || []).length} gastos (${money(c.expenseTotal || 0)})`}</small><small>${escapeHtml(c.actor || "Usuario de prueba")}${c.note ? ` · ${escapeHtml(c.note)}` : ""}</small></div><div class="activity-amount">${money(c.difference)}<small>Diferencia</small></div></div>`;
  }
  function pettyView() { const out = total(currentFundExpenses()); return `${pageHead("Control de efectivo", "Caja menor", "Un fondo sencillo para gastos cotidianos y conciliación.", `<button class="btn" data-action="edit-fund">✎ &nbsp;Configurar fondo</button><button class="btn btn-primary" data-action="reconcile">✓ &nbsp;Conciliar caja</button>`)}<div class="fund-balance"><div><span>Disponible estimado · ${escapeHtml(state.fund.responsible)}</span><strong>${money(fundAvailable())}</strong><small>Saldo del último corte menos gastos confirmados de caja menor.</small></div><button class="btn btn-soft" data-action="new-cash-expense">＋ &nbsp;Registrar gasto</button></div><div class="fund-stats"><div class="card"><span>Saldo al último corte</span><strong>${money(state.fund.balance)}</strong></div><div class="card"><span>Gastos desde el corte</span><strong>${money(out)}</strong></div><div class="card"><span>Conciliaciones</span><strong>${state.fund.reconciliations.filter(c => c.type !== "adjustment").length}</strong></div></div><section class="card section-gap"><div class="card-head"><div><h2>Movimiento del fondo</h2><p>Registro simple, sin aprobaciones previas.</p></div></div><div class="card-body"><div class="tabs"><button class="tab ${fundTab === "activity" ? "active" : ""}" data-fund-tab="activity">Gastos</button><button class="tab ${fundTab === "closes" ? "active" : ""}" data-fund-tab="closes">Cierres y ajustes</button></div>${fundTab === "activity" ? `<div class="activity-list">${currentFundExpenses().slice().reverse().map(recentItem).join("") || '<div class="empty">Sin gastos desde el último corte.</div>'}</div>` : `<div class="activity-list">${state.fund.reconciliations.slice().reverse().map(fundEventItem).join("") || '<div class="empty">Aún no hay cierres ni ajustes.</div>'}</div>`}</div></section>`; }
  function reportsView() { return `${pageHead("Datos para compartir", "Reportes", "Consulta y exporta gastos confirmados del piloto.", `<button class="btn btn-primary" data-action="export">↓ &nbsp;Descargar CSV</button>`)}<div class="grid grid-four">${metric("Gastos exportables", String(confirmed().length), "▤", "Se excluyen borradores")}${metric("Total en COP", money(total(confirmed())), "◉", "Conversión por movimiento")}${metric("Proyectos", String(new Set(confirmed().map(e => e.project)).size), "◫", "Con gastos confirmados")}${metric("Comprobantes", String(confirmed().filter(e => e.attachmentName).length), "▣", "Solo nombre en este prototipo")}</div><section class="card section-gap"><div class="card-head"><div><h2>Gastos por proyecto</h2><p>Resumen de los registros confirmados.</p></div></div><div class="card-body">${state.projects.map(project => `<div class="review-line"><span>${escapeHtml(project)}</span><strong>${money(total(confirmed().filter(e => e.project === project)))}</strong></div>`).join("")}<p class="note">El CSV se descarga en formato compatible con Excel. Los cálculos de esta demo son ilustrativos; la versión funcional usará precisión monetaria controlada. Los datos solo existen en el navegador.</p></div></section>`; }
  function settingsView() { return `${pageHead("Configuración", "Empresa", "Datos del espacio de trabajo para la prueba interna.", `<button class="btn" data-action="edit-company">✎ &nbsp;Editar empresa</button>`)}<section class="card"><div class="card-head"><div><h2>${escapeHtml(state.company)}</h2><p>Espacio de demostración</p></div><span class="small-pill">PILOTO</span></div><div class="card-body"><div class="review-line"><span>País inicial</span><strong>Colombia</strong></div><div class="review-line"><span>Moneda base</span><strong>Peso colombiano · COP</strong></div><div class="review-line"><span>Usuario de prueba</span><strong>${escapeHtml(state.user)}</strong></div><div class="review-line"><span>Almacenamiento</span><strong>Solo este navegador</strong></div><p class="note">El piloto real requerirá acceso, aislamiento entre empresas, almacenamiento privado de adjuntos y auditoría en servidor.</p></div></section>`; }
  function renderView() { return ({ dashboard, expenses: expensesView, projects: projectsView, budgets: budgetsView, petty: pettyView, reports: reportsView, settings: settingsView })[view](); }
  function onboarding() { return `<div class="onboarding"><section class="onboarding-story"><div class="brand"><div class="brand-mark">a.</div><div><div class="brand-name">AlDía APP</div><small>CONTROL DE GASTOS</small></div></div><div><div class="eyebrow" style="color:#c0e6b0">EL CONTROL EMPIEZA AQUÍ</div><h1>Cada gasto claro. Cada decisión, a tiempo.</h1><p>Controla gastos, presupuesto y caja menor en un espacio sencillo para tu equipo.</p><div class="story-art" aria-hidden="true"><div class="art-card"><strong>Resumen del mes</strong><div></div><div></div><div></div><strong style="font-size:30px">$ 4.260.000</strong></div><div class="art-badge">↗ &nbsp; Todo al día</div></div></div><div class="tiny" style="color:#a4c7ad">PROTOTIPO NAVEGABLE · DATOS FICTICIOS</div></section><section class="onboarding-form-wrap"><form id="onboarding-form" class="onboarding-form"><div class="step">Paso 01 / Empezar</div><h2>Bienvenido a AlDía APP.</h2><p>Configura una empresa de prueba o entra a la demo con datos de ejemplo.</p><div class="field"><label for="company-name">Nombre de tu empresa</label><input id="company-name" name="company" placeholder="Ej. Mi empresa" required maxlength="70" /></div><div class="form-grid"><div class="field"><label for="country">País</label><select id="country" name="country"><option>Colombia</option></select></div><div class="field"><label for="currency">Moneda base</label><select id="currency" name="currency"><option value="COP">COP · Peso colombiano</option></select></div></div><button class="btn btn-primary" type="submit">Crear espacio de prueba →</button><button class="btn demo-link" type="button" data-action="enter-demo">Explorar con datos de ejemplo</button><p class="note">Esta pantalla no crea una cuenta real. Tus cambios se guardan localmente para facilitar las pruebas internas.</p></form></section></div>`; }

  function renderModal() {
    let title = "", subtitle = "", body = "", footer = "";
    const m = modal;
    if (m.type === "expense") {
      const e = m.expense || {};
      title = m.audio ? "Revisar gasto por audio" : e.id ? "Editar borrador" : "Nuevo gasto";
      subtitle = m.audio ? "SIMULACIÓN · Revisa cada dato antes de confirmar." : "Completa los datos y decide cuándo confirmarlo.";
      body = `${m.audio ? '<div class="alert-box" style="margin-bottom:20px"><span>◉</span><div><strong>Audio simulado</strong>Esta sugerencia usa datos de ejemplo. No se ha grabado ni transcrito ningún audio.</div></div>' : ""}<form id="expense-form">
        <div class="field"><label for="expense-title">Descripción del gasto *</label><input id="expense-title" name="title" value="${escapeHtml(e.title || "")}" maxlength="100" required placeholder="Ej. Compra de insumos" /></div>
        <div class="form-grid"><div class="field"><label for="expense-amount">Valor original *</label><input id="expense-amount" name="originalAmount" type="number" min="1" step="1" value="${escapeHtml(e.originalAmount ?? "")}" required placeholder="0" /></div><div class="field"><label for="expense-currency">Moneda *</label><select id="expense-currency" name="currency">${["COP","USD","EUR"].map(c => `<option value="${c}" ${e.currency === c ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
        <div id="rate-fields"><div class="form-grid"><div class="field"><label for="expense-rate">Tasa manual a COP *</label><input id="expense-rate" name="rate" type="number" min="0.000001" step="any" value="${escapeHtml(e.rate && e.currency !== "COP" ? e.rate : "")}" placeholder="Ej. 4050" /></div><div class="field"><label for="rate-reason">Motivo o referencia *</label><input id="rate-reason" name="rateReason" value="${escapeHtml(e.rateReason || "")}" maxlength="120" placeholder="Ej. Tasa acordada con proveedor" /></div></div><div class="note">Fuente: Manual. Se guardarán motivo, usuario, fecha y hora. El equivalente en COP se redondea al peso más cercano. Cálculo ilustrativo de esta demo.</div></div>
        <div class="form-grid"><div class="field"><label for="expense-date">Fecha *</label><input id="expense-date" name="date" type="date" value="${escapeHtml(e.date || today())}" required /></div><div class="field"><label for="expense-vendor">Proveedor</label><input id="expense-vendor" name="vendor" value="${escapeHtml(e.vendor || "")}" maxlength="80" placeholder="Opcional" /></div></div>
        <div class="form-grid"><div class="field"><label for="expense-project">Proyecto *</label><select id="expense-project" name="project" required>${state.projects.map(p => `<option value="${escapeHtml(p)}" ${e.project === p ? "selected" : ""}>${escapeHtml(p)}</option>`).join("")}</select></div><div class="field"><label for="expense-category">Categoría *</label><select id="expense-category" name="category">${CATEGORIES.map(c => `<option ${e.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
        <div class="field"><label for="expense-account">Cuenta *</label><select id="expense-account" name="account"><option ${e.account === "Banco principal" ? "selected" : ""}>Banco principal</option><option ${e.account === "Caja menor" || m.cash ? "selected" : ""}>Caja menor</option></select><div class="field-help">Se permiten saldos negativos.</div></div>
        <div class="field"><label for="expense-file">Comprobante opcional</label><input id="expense-file" name="attachment" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" /><div class="field-help">PDF, JPG o PNG · máximo 5 MB (5.000.000 bytes). En esta demo solo se guarda el nombre del archivo.</div>${e.attachmentName ? `<div class="field-help">Adjunto indicado: ${escapeHtml(e.attachmentName)}</div>` : ""}<div id="file-error" class="field-error" role="alert"></div></div>
        <div class="field"><label for="expense-note">Nota</label><textarea id="expense-note" name="note" maxlength="400" placeholder="Contexto opcional">${escapeHtml(e.note || "")}</textarea></div></form>`;
      footer = `<button class="btn" data-action="save-draft">Guardar borrador</button><button class="btn btn-primary" data-action="review-form">Revisar gasto →</button>`;
    } else if (m.type === "review") {
      const e = pendingExpense;
      title = "Revisar antes de confirmar"; subtitle = "La confirmación incorpora este gasto a los totales y al CSV.";
      body = `<div class="review-line"><span>Descripción</span><strong>${escapeHtml(e.title)}</strong></div><div class="review-line"><span>Valor original</span><strong>${money(e.originalAmount,e.currency)}</strong></div>${e.currency !== "COP" ? `<div class="review-line"><span>Tasa manual a COP</span><strong>${number(e.rate)}</strong></div><div class="review-line"><span>Motivo de tasa</span><strong>${escapeHtml(e.rateReason)}</strong></div><div class="review-line"><span>Registrada por</span><strong>${escapeHtml(e.rateActor)} · ${new Date(e.rateCapturedAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</strong></div>` : ""}<div class="review-line"><span>Fecha</span><strong>${dateLabel(e.date)}</strong></div><div class="review-line"><span>Proyecto · categoría</span><strong>${escapeHtml(e.project)} · ${escapeHtml(e.category)}</strong></div><div class="review-line"><span>Cuenta</span><strong>${escapeHtml(e.account)}</strong></div><div class="review-line"><span>Proveedor</span><strong>${escapeHtml(e.vendor || "—")}</strong></div><div class="review-line"><span>Comprobante</span><strong>${escapeHtml(e.attachmentName || "Sin adjunto")}</strong></div><div class="review-total"><span>Equivalente en COP</span><strong>${money(e.amountCop)}</strong></div><p class="note">No hay aprobación previa. La conversión se redondeó al peso. Cálculo ilustrativo del prototipo; la versión funcional validará las reglas monetarias con precisión controlada.</p>`;
      footer = `<button class="btn" data-action="back-to-form">Volver a editar</button><button class="btn btn-primary" data-action="confirm-expense">Confirmar gasto ✓</button>`;
    } else if (m.type === "detail") {
      const e = state.expenses.find(item => item.id === m.id); if (!e) { modal = null; return ""; }
      title = escapeHtml(e.title); subtitle = `${statusBadge(e.status)} · ${dateLabel(e.date)}`;
      body = `<div class="review-line"><span>Valor original</span><strong>${money(e.originalAmount,e.currency)}</strong></div><div class="review-line"><span>Equivalente en COP</span><strong>${money(e.amountCop)}</strong></div><div class="review-line"><span>Tasa · fuente</span><strong>${number(e.rate)} · ${escapeHtml(e.rateSource)}</strong></div>${e.currency !== "COP" ? `<div class="review-line"><span>Motivo de tasa</span><strong>${escapeHtml(e.rateReason || "—")}</strong></div><div class="review-line"><span>Tasa registrada por</span><strong>${escapeHtml(e.rateActor || "—")} · ${e.rateCapturedAt ? new Date(e.rateCapturedAt).toLocaleString("es-CO", { timeZone: "America/Bogota" }) : "—"}</strong></div>` : ""}<div class="review-line"><span>Proyecto</span><strong>${escapeHtml(e.project)}</strong></div><div class="review-line"><span>Categoría</span><strong>${escapeHtml(e.category)}</strong></div><div class="review-line"><span>Cuenta</span><strong>${escapeHtml(e.account)}</strong></div><div class="review-line"><span>Proveedor</span><strong>${escapeHtml(e.vendor || "—")}</strong></div><div class="review-line"><span>Comprobante</span><strong>${escapeHtml(e.attachmentName || "Sin adjunto")}</strong></div><div class="review-line"><span>Origen</span><strong>${e.source === "audio-demo" ? "Audio simulado" : "Ingreso manual"}</strong></div><div class="review-line"><span>Creado</span><strong>${new Date(e.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</strong></div>${e.note ? `<p class="note">${escapeHtml(e.note)}</p>` : ""}`;
      footer = e.status === "draft" ? `<button class="btn btn-primary" data-action="edit-draft" data-id="${escapeHtml(e.id)}">Editar borrador →</button>` : `<button class="btn" data-action="close-modal">Cerrar</button>`;
    } else if (m.type === "project") {
      title = "Nuevo proyecto"; subtitle = "Podrás seleccionarlo al registrar un gasto.";
      body = `<form id="project-form"><div class="field"><label for="project-name">Nombre del proyecto *</label><input id="project-name" name="name" maxlength="70" required placeholder="Ej. Nueva sede" /></div><p class="note">Este proyecto solo se guarda en tu navegador durante la prueba.</p></form>`;
      footer = `<button class="btn btn-primary" data-action="save-project">Crear proyecto</button>`;
    } else if (m.type === "budget") {
      title = "Ajustar presupuesto"; subtitle = "Los cambios se reflejan en el panel de esta demo.";
      body = `<form id="budget-form"><div class="field"><label for="budget-total">Presupuesto mensual en COP *</label><input id="budget-total" name="total" type="number" min="0" step="1" required value="${escapeHtml(state.budgets.total)}" /></div>${CATEGORIES.map(cat => `<div class="field"><label for="budget-${cat}">${cat} · COP</label><input id="budget-${cat}" name="${cat}" type="number" min="0" step="1" required value="${escapeHtml(state.budgets.categories[cat])}" /></div>`).join("")}</form>`;
      footer = `<button class="btn btn-primary" data-action="save-budget">Guardar presupuesto</button>`;
    } else if (m.type === "fund") {
      title = "Configurar caja menor"; subtitle = "Define el responsable y saldo inicial de un nuevo corte.";
      body = `<form id="fund-form"><div class="field"><label for="fund-responsible">Responsable *</label><input id="fund-responsible" name="responsible" required maxlength="80" value="${escapeHtml(state.fund.responsible)}" /></div><div class="field"><label for="fund-balance">Saldo nuevo en COP *</label><input id="fund-balance" name="balance" type="number" step="1" required value="${escapeHtml(state.fund.balance)}" /></div><div class="field"><label for="fund-reason">Motivo del ajuste *</label><input id="fund-reason" name="reason" maxlength="160" required placeholder="Ej. Apertura o reposición de caja" /></div><div class="alert-box">Solo puedes abrir un nuevo corte cuando no quedan gastos por conciliar. El ajuste conserva saldo anterior, nuevo saldo, motivo y responsable.</div></form>`;
      footer = `<button class="btn btn-primary" data-action="save-fund">Guardar fondo</button>`;
    } else if (m.type === "reconcile") {
      title = "Conciliar caja menor"; subtitle = "Compara el efectivo contado con el saldo esperado.";
      body = `<div class="review-line"><span>Saldo último corte</span><strong>${money(state.fund.balance)}</strong></div><div class="review-line"><span>Gastos confirmados</span><strong>− ${money(total(currentFundExpenses()))}</strong></div><div class="review-total"><span>Esperado</span><strong>${money(fundAvailable())}</strong></div><form id="reconcile-form"><div class="field" style="margin-top:20px"><label for="counted-cash">Efectivo contado en COP *</label><input id="counted-cash" name="counted" type="number" step="1" value="${escapeHtml(fundAvailable())}" required /></div><div class="field"><label for="reconcile-note">Nota de diferencia</label><textarea id="reconcile-note" name="note" maxlength="300" placeholder="Si hay diferencia, explica qué ocurrió"></textarea></div></form><p class="note">El cierre guarda el esperado, el contado y la diferencia. El siguiente período parte del monto contado.</p>`;
      footer = `<button class="btn btn-primary" data-action="save-reconciliation">Guardar conciliación</button>`;
    } else if (m.type === "company") {
      title = "Editar empresa"; subtitle = "Nombre visible en este espacio de prueba.";
      body = `<form id="company-form"><div class="field"><label for="edit-company">Nombre de empresa *</label><input id="edit-company" name="company" maxlength="70" required value="${escapeHtml(state.company)}" /></div></form>`;
      footer = `<button class="btn btn-primary" data-action="save-company">Guardar cambios</button>`;
    }
    return `<div class="modal-backdrop" data-action="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${title}</h2><p>${subtitle}</p></div><button class="close" type="button" data-action="close-modal" aria-label="Cerrar">×</button></div><div class="modal-body">${body}</div><div class="modal-footer">${footer}</div></section></div>`;
  }

  function updateRateField() {
    const currency = document.querySelector("#expense-currency")?.value;
    const fields = document.querySelector("#rate-fields");
    if (fields) fields.hidden = currency === "COP";
    const amount = document.querySelector("#expense-amount");
    if (amount) { amount.step = currency === "COP" ? "1" : "0.01"; amount.min = currency === "COP" ? "1" : "0.01"; }
  }
  function collectExpense() {
    const form = document.querySelector("#expense-form"); if (!form?.reportValidity()) return null;
    const fd = new FormData(form), currency = String(fd.get("currency")), originalAmount = Number(fd.get("originalAmount"));
    const rate = currency === "COP" ? 1 : Number(fd.get("rate"));
    const rateSource = currency === "COP" ? "Moneda base" : "Manual";
    const rateReason = currency === "COP" ? "" : String(fd.get("rateReason") || "").trim();
    if (!Number.isFinite(originalAmount) || !Number.isFinite(rate) || !Number.isSafeInteger(Math.round(originalAmount * rate)) || !(originalAmount > 0) || !(rate > 0) || (currency !== "COP" && !rateReason)) { toast("Revisa el valor, la tasa y el motivo de la tasa manual."); return null; }
    if (Math.round(originalAmount * rate) < 1) { toast("El equivalente del gasto debe ser al menos COP 1."); form.querySelector("#expense-rate")?.focus(); return null; }
    if (!String(fd.get("title") || "").trim()) { toast("Escribe una descripción para el gasto."); form.querySelector("#expense-title").focus(); return null; }
    if (currency === "COP" && !Number.isInteger(originalAmount)) { toast("Los gastos en COP deben registrarse en pesos enteros."); form.querySelector("#expense-amount").focus(); return null; }
    if (currency !== "COP" && Math.abs(Math.round(originalAmount * 100) - originalAmount * 100) > 1e-7) { toast("USD y EUR admiten hasta dos decimales."); form.querySelector("#expense-amount").focus(); return null; }
    const file = form.querySelector("#expense-file").files[0];
    if (file) {
      const validType = /\.(pdf|jpe?g|png)$/i.test(file.name) && (!file.type || ["application/pdf", "image/jpeg", "image/png"].includes(file.type));
      if (!validType || file.size > MAX_FILE_BYTES) { const message = !validType ? "Solo se permite PDF, JPG o PNG." : "El comprobante no puede superar 5 MB."; form.querySelector("#file-error").textContent = message; toast(message); return null; }
    }
    const previous = modal.expense || {};
    const rateChanged = previous.currency !== currency || previous.rate !== rate || previous.rateReason !== rateReason;
    return { id: previous.id || uid(), title: String(fd.get("title")).trim(), originalAmount, currency, rate, rateSource, rateReason, rateActor: currency === "COP" ? "" : rateChanged ? state.user : previous.rateActor, rateCapturedAt: currency === "COP" ? null : rateChanged ? new Date().toISOString() : previous.rateCapturedAt, amountCop: Math.round(originalAmount * rate), date: String(fd.get("date")), vendor: String(fd.get("vendor") || "").trim(), project: String(fd.get("project")), category: String(fd.get("category")), account: String(fd.get("account")), attachmentName: file?.name || previous.attachmentName || "", note: String(fd.get("note") || "").trim(), status: previous.status || "draft", createdAt: previous.createdAt || new Date().toISOString(), confirmedAt: previous.confirmedAt || null, source: modal.audio || previous.source === "audio-demo" ? "audio-demo" : "manual" };
  }
  function saveExpense(expense, status) {
    expense.status = status;
    if (status === "confirmed" && !expense.confirmedAt) expense.confirmedAt = new Date().toISOString();
    const index = state.expenses.findIndex(e => e.id === expense.id);
    if (index >= 0) state.expenses[index] = expense; else state.expenses.push(expense);
    persist(); modal = null; pendingExpense = null; view = "expenses"; render();
  }
  function csvCell(value) {
    let string = String(value ?? "");
    if (typeof value !== "number" && /^\s*[=+\-@]/.test(string)) string = `'${string}`;
    return `"${string.replace(/"/g, '""')}"`;
  }
  function exportCsv(scope = "all") {
    const header = ["ID", "Fecha", "Descripción", "Proveedor", "Proyecto", "Categoría", "Cuenta", "Valor original", "Moneda original", "Tasa a COP", "Fuente de tasa", "Motivo de tasa", "Usuario de tasa", "Hora de tasa", "Valor COP", "Estado", "Comprobante indicado", "Origen", "Empresa de prueba"];
    const selected = scope === "visible" ? filteredExpenses().filter(e => e.status === "confirmed") : confirmed();
    const rows = selected.map(e => [e.id,e.date,e.title,e.vendor,e.project,e.category,e.account,e.originalAmount,e.currency,e.rate,e.rateSource,e.rateReason || "",e.rateActor || "",e.rateCapturedAt || "",e.amountCop,"Confirmado",e.attachmentName,e.source,state.company]);
    const csv = "\uFEFF" + [header, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const companySlug = state.company.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "empresa";
    const a = document.createElement("a"); a.href = url; a.download = `aldia-${companySlug}-gastos-${scope === "visible" ? "vista" : "todos"}-demo-${today()}.csv`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(rows.length ? `CSV descargado con ${rows.length} gastos confirmados.` : "CSV sin gastos: ningún confirmado coincide con la vista. Incluye solo encabezados.");
  }
  function openExpense({ expense = null, cash = false, audio = false } = {}) { clearTimeout(audioTimer); modal = { type: "expense", expense, cash, audio }; render(); document.querySelector("#expense-title")?.focus(); }
  function beginAudio() {
    toast("SIMULACIÓN: preparando un ejemplo para que lo revises.");
    clearTimeout(audioTimer);
    audioTimer = setTimeout(() => openExpense({ audio: true, expense: { title: "Taxi a reunión con cliente", originalAmount: 28500, currency: "COP", date: today(), vendor: "Transporte urbano", project: "Proyecto Aurora", category: "Transporte", account: "Caja menor", note: "Ejemplo generado para probar la revisión de un gasto por audio." } }), 650);
  }
  app.addEventListener("click", event => {
    const target = event.target.closest("[data-action], [data-view], [data-fund-tab]"); if (!target) return;
    if (target.dataset.view) { clearTimeout(audioTimer); view = target.dataset.view; modal = null; render(); window.scrollTo(0,0); return; }
    if (target.dataset.fundTab) { fundTab = target.dataset.fundTab; render(); return; }
    const action = target.dataset.action;
    if (action === "backdrop" && event.target !== target) return;
    if (action === "close-modal" || action === "backdrop") { dismissModal(); return; }
    if (action === "enter-demo") { state.onboarded = true; persist(); render(); return; }
    if (action === "new-expense") return openExpense();
    if (action === "new-cash-expense") return openExpense({ cash: true });
    if (action === "audio") return beginAudio();
    if (action === "export") return exportCsv(view === "expenses" ? "visible" : "all");
    if (action === "view-expense") { modal = { type: "detail", id: target.dataset.id }; render(); return; }
    if (action === "edit-draft") { const expense = state.expenses.find(e => e.id === target.dataset.id && e.status === "draft"); if (expense) openExpense({ expense }); return; }
    if (action === "new-project") { modal = { type: "project" }; render(); document.querySelector("#project-name")?.focus(); return; }
    if (action === "save-project") { const form = document.querySelector("#project-form"); if (!form.reportValidity()) return; const name = String(new FormData(form).get("name")).trim(); if (!name) { toast("Escribe un nombre para el proyecto."); return; } if (state.projects.some(project => project.toLocaleLowerCase("es-CO") === name.toLocaleLowerCase("es-CO"))) { toast("Ya existe un proyecto con ese nombre."); return; } state.projects.push(name); persist(); modal = null; view = "projects"; render(); toast("Proyecto creado y disponible para nuevos gastos."); return; }
    if (action === "save-draft") { const e = collectExpense(); if (e) { saveExpense(e, "draft"); toast("Borrador guardado. No aparece en los totales ni en el CSV."); } return; }
    if (action === "review-form") { const e = collectExpense(); if (e) { pendingExpense = e; modal = { type: "review", origin: modal }; render(); } return; }
    if (action === "back-to-form") { modal = { ...modal.origin, expense: pendingExpense }; render(); return; }
    if (action === "confirm-expense") { if (pendingExpense) { saveExpense(pendingExpense, "confirmed"); toast("Gasto confirmado y agregado a los totales."); } return; }
    if (action === "edit-budget") { modal = { type: "budget" }; render(); return; }
    if (action === "save-budget") { const form = document.querySelector("#budget-form"); if (!form.reportValidity()) return; const fd = new FormData(form); state.budgets.total = Number(fd.get("total")); CATEGORIES.forEach(cat => state.budgets.categories[cat] = Number(fd.get(cat))); persist(); modal = null; render(); toast("Presupuesto actualizado."); return; }
    if (action === "edit-fund") { if (currentFundExpenses().length) { toast("Concilia los gastos pendientes antes de configurar el fondo."); return; } modal = { type: "fund" }; render(); return; }
    if (action === "save-fund") { if (currentFundExpenses().length) { toast("Concilia los gastos pendientes antes de configurar el fondo."); return; } const form = document.querySelector("#fund-form"); if (!form.reportValidity()) return; const fd = new FormData(form), oldBalance = Number(state.fund.balance), newBalance = Number(fd.get("balance")), reason = String(fd.get("reason")).trim(); if (!Number.isFinite(newBalance) || !Number.isInteger(newBalance) || !reason) { toast("Indica un saldo entero y el motivo del ajuste."); return; } state.fund.responsible = String(fd.get("responsible")).trim(); state.fund.reconciliations.push({ id: uid(), type: "adjustment", date: today(), expected: oldBalance, counted: newBalance, difference: newBalance - oldBalance, note: reason, actor: state.user, recordedAt: new Date().toISOString() }); state.fund.balance = newBalance; persist(); modal = null; fundTab = "closes"; render(); toast("Ajuste de caja menor registrado."); return; }
    if (action === "reconcile") { modal = { type: "reconcile" }; render(); return; }
    if (action === "save-reconciliation") { const form = document.querySelector("#reconcile-form"); if (!form.reportValidity()) return; const fd = new FormData(form), included = currentFundExpenses(), expected = fundAvailable(), counted = Number(fd.get("counted")), note = String(fd.get("note") || "").trim(); if (counted !== expected && !note) { toast("Explica la diferencia antes de guardar la conciliación."); form.querySelector("#reconcile-note").focus(); return; } state.fund.reconciliations.push({ id: uid(), type: "close", date: today(), expected, counted, difference: counted - expected, expenseIds: included.map(e => e.id), expenseTotal: total(included), note, actor: state.user, recordedAt: new Date().toISOString() }); state.fund.balance = counted; state.fund.countedExpenseIds = confirmed().filter(e => e.account === "Caja menor").map(e => e.id); persist(); modal = null; fundTab = "closes"; render(); toast("Conciliación guardada."); return; }
    if (action === "edit-company") { modal = { type: "company" }; render(); return; }
    if (action === "save-company") { const form = document.querySelector("#company-form"); if (!form.reportValidity()) return; state.company = String(new FormData(form).get("company")).trim(); persist(); modal = null; render(); toast("Empresa actualizada."); }
  });
  app.addEventListener("submit", event => {
    event.preventDefault();
    if (event.target.id !== "onboarding-form") {
      const action = { "expense-form": "review-form", "project-form": "save-project", "budget-form": "save-budget", "fund-form": "save-fund", "reconcile-form": "save-reconciliation", "company-form": "save-company" }[event.target.id];
      if (action) app.querySelector(`.modal-footer [data-action="${action}"]`)?.click();
      return;
    }
    const company = String(new FormData(event.target).get("company")).trim();
    if (!company) { toast("Escribe el nombre de tu empresa de prueba."); return; }
    state.company = company;
    state.expenses = [];
    state.projects = ["General"];
    state.budgets = { total: 0, categories: Object.fromEntries(CATEGORIES.map(category => [category, 0])) };
    state.fund = { responsible: state.user, balance: 0, countedExpenseIds: [], reconciliations: [] };
    state.onboarded = true; persist(); render();
  });
  app.addEventListener("change", event => {
    if (event.target.closest(".modal")) modalDirty = true;
    if (event.target.id === "expense-currency") updateRateField();
    if (event.target.id === "expense-filter") { expenseFilter = event.target.value; render(); }
    if (event.target.id === "expense-file") { const error = document.querySelector("#file-error"); if (error) error.textContent = ""; }
  });
  app.addEventListener("input", event => {
    if (event.target.closest(".modal")) modalDirty = true;
    if (event.target.id === "expense-search") { expenseSearch = event.target.value; const start = event.target.selectionStart; render(); const search = document.querySelector("#expense-search"); search.focus(); search.setSelectionRange(start,start); }
  });
  document.addEventListener("keydown", event => {
    if (!modal) return;
    if (event.key === "Escape") { event.preventDefault(); dismissModal(); return; }
    if (event.key !== "Tab") return;
    const dialog = app.querySelector(".modal");
    const focusable = [...dialog.querySelectorAll("button, input, select, textarea, a[href]")].filter(el => !el.disabled && el.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!dialog.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  render();
})();
