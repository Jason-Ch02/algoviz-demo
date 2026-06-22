/* AlgoViz — pathfinding + sorting visualizer.
   Loads data.json (grid size, start/end, preset mazes — built by presets.py),
   then animates the algorithms step by step. Pure vanilla JS. */

const $ = id => document.getElementById(id);
let DATA = null;

/* ===================== TABS ===================== */
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  t.classList.add("active");
  $("view-path").classList.toggle("hidden", t.dataset.tab !== "path");
  $("view-sort").classList.toggle("hidden", t.dataset.tab !== "sort");
}));

/* ===================== PATHFINDING ===================== */
let ROWS, COLS, start, end;
const walls = new Set();
const cellEls = {};
let pdown = false, mode = "wall", drawAdd = true, running = false;
let timers = [];

const key = (r, c) => r + "," + c;
const parseKey = k => k.split(",").map(Number);

function buildGrid() {
  const grid = $("grid");
  grid.style.gridTemplateColumns = `repeat(${COLS}, 22px)`;
  grid.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = document.createElement("div");
      el.className = "cell";
      el.dataset.r = r; el.dataset.c = c;
      grid.appendChild(el);
      cellEls[key(r, c)] = el;
    }
  }
  paint();
}

function paint() {
  for (const k in cellEls) {
    const el = cellEls[k];
    el.classList.remove("wall", "start", "end", "visited", "path");
    if (walls.has(k)) el.classList.add("wall");
  }
  cellEls[key(start.r, start.c)].classList.add("start");
  cellEls[key(end.r, end.c)].classList.add("end");
}

function clearPathClasses() {
  for (const k in cellEls) cellEls[k].classList.remove("visited", "path");
  $("pathStat").textContent = "";
}

function cellAt(target) {
  if (!target.classList || !target.classList.contains("cell")) return null;
  return { r: +target.dataset.r, c: +target.dataset.c };
}

function gridDown(e) {
  if (running) return;
  const cell = cellAt(e.target);
  if (!cell) return;
  const k = key(cell.r, cell.c);
  pdown = true;
  if (k === key(start.r, start.c)) mode = "start";
  else if (k === key(end.r, end.c)) mode = "end";
  else { mode = "wall"; drawAdd = !walls.has(k); applyWall(cell, drawAdd); }
}

function gridMove(e) {
  if (!pdown || running) return;
  const cell = cellAt(e.target);
  if (!cell) return;
  const k = key(cell.r, cell.c);
  if (mode === "wall") applyWall(cell, drawAdd);
  else if (mode === "start" && k !== key(end.r, end.c) && !walls.has(k)) { start = cell; clearPathClasses(); paint(); }
  else if (mode === "end" && k !== key(start.r, start.c) && !walls.has(k)) { end = cell; clearPathClasses(); paint(); }
}

function applyWall(cell, add) {
  const k = key(cell.r, cell.c);
  if (k === key(start.r, start.c) || k === key(end.r, end.c)) return;
  if (add) { walls.add(k); cellEls[k].classList.add("wall"); }
  else { walls.delete(k); cellEls[k].classList.remove("wall"); }
}

function loadPreset(name) {
  walls.clear();
  clearPathClasses();
  if (name === "Random") {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const k = key(r, c);
      if (k !== key(start.r, start.c) && k !== key(end.r, end.c) && Math.random() < 0.28) walls.add(k);
    }
  } else if (DATA.presets[name]) {
    DATA.presets[name].forEach(([r, c]) => walls.add(key(r, c)));
  }
  paint();
}

/* ---- search: bfs / dijkstra / a* ---- */
function neighbors(r, c) {
  return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
    .filter(([nr, nc]) => nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !walls.has(key(nr, nc)));
}

function search(algo) {
  const sK = key(start.r, start.c), eK = key(end.r, end.c);
  const dist = { [sK]: 0 }, prev = {}, order = [], visited = new Set();
  const h = (r, c) => Math.abs(r - end.r) + Math.abs(c - end.c);
  let frontier = [{ k: sK, r: start.r, c: start.c, f: 0 }];

  while (frontier.length) {
    let idx = 0;
    if (algo !== "bfs") for (let i = 1; i < frontier.length; i++) if (frontier[i].f < frontier[idx].f) idx = i;
    const cur = frontier.splice(idx, 1)[0];
    if (visited.has(cur.k)) continue;
    visited.add(cur.k);
    if (cur.k !== sK && cur.k !== eK) order.push(cur.k);
    if (cur.k === eK) return { order, path: reconstruct(prev, sK, eK) };

    for (const [nr, nc] of neighbors(cur.r, cur.c)) {
      const nk = key(nr, nc);
      if (visited.has(nk)) continue;
      const nd = dist[cur.k] + 1;
      if (dist[nk] === undefined || nd < dist[nk]) {
        dist[nk] = nd; prev[nk] = cur.k;
        const f = algo === "astar" ? nd + h(nr, nc) : algo === "dijkstra" ? nd : 0;
        frontier.push({ k: nk, r: nr, c: nc, f });
      }
    }
  }
  return { order, path: [] };
}

function reconstruct(prev, sK, eK) {
  const path = []; let k = eK;
  while (k && k !== sK) { path.push(k); k = prev[k]; }
  if (k === sK) { path.push(sK); return path.reverse(); }
  return [];
}

function setPathControls(on) {
  ["runPath", "clearPathBtn", "clearWalls", "pathAlgo", "preset", "pathSpeed"].forEach(id => $(id).disabled = !on);
  running = !on;
}

function visualize() {
  clearPathClasses();
  const speed = +$("pathSpeed").value;
  const { order, path } = search($("pathAlgo").value);
  setPathControls(false);
  timers.forEach(clearTimeout); timers = [];

  order.forEach((k, i) => timers.push(setTimeout(() => cellEls[k].classList.add("visited"), i * speed)));

  const after = order.length * speed;
  if (!path.length) {
    timers.push(setTimeout(() => { $("pathStat").textContent = "no path — blocked!"; setPathControls(true); }, after));
    return;
  }
  const pstep = Math.max(22, speed);
  path.forEach((k, i) => {
    if (k === key(start.r, start.c) || k === key(end.r, end.c)) return;
    timers.push(setTimeout(() => cellEls[k].classList.add("path"), after + i * pstep));
  });
  timers.push(setTimeout(() => {
    $("pathStat").textContent = `visited ${order.length} · path ${path.length - 1} steps`;
    setPathControls(true);
  }, after + path.length * pstep));
}

/* ===================== SORTING ===================== */
let arr = [], barEls = [], sorting = false, sortTimers = [];

function newArray() {
  const size = +$("sortSize").value;
  arr = Array.from({ length: size }, () => 5 + Math.floor(Math.random() * 96));
  renderBars();
  $("sortStat").textContent = "";
}

function renderBars() {
  const wrap = $("bars");
  wrap.innerHTML = "";
  barEls = arr.map(v => {
    const b = document.createElement("div");
    b.className = "bar";
    b.style.height = v + "%";
    wrap.appendChild(b);
    return b;
  });
}

// each algorithm returns a list of steps replayed on a copy of the array
function genSteps(algo, a) {
  const steps = [];
  const cmp = (i, j) => steps.push({ t: "compare", i, j });
  const swap = (i, j) => { steps.push({ t: "swap", i, j }); [a[i], a[j]] = [a[j], a[i]]; };
  const set = (i, v) => { steps.push({ t: "set", i, v }); a[i] = v; };
  const done = i => steps.push({ t: "sorted", i });
  const n = a.length;

  if (algo === "bubble") {
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1 - i; j++) { cmp(j, j + 1); if (a[j] > a[j + 1]) swap(j, j + 1); }
      done(n - 1 - i);
    }
    done(0);
  } else if (algo === "selection") {
    for (let i = 0; i < n; i++) {
      let m = i;
      for (let j = i + 1; j < n; j++) { cmp(m, j); if (a[j] < a[m]) m = j; }
      if (m !== i) swap(i, m);
      done(i);
    }
  } else if (algo === "insertion") {
    done(0);
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) { cmp(j - 1, j); if (a[j - 1] > a[j]) { swap(j - 1, j); j--; } else break; }
    }
    for (let i = 0; i < n; i++) done(i);
  } else if (algo === "quick") {
    const qs = (lo, hi) => {
      if (lo > hi) return;
      if (lo === hi) { done(lo); return; }
      const pivot = a[hi]; let i = lo;
      for (let j = lo; j < hi; j++) { cmp(j, hi); if (a[j] < pivot) { if (i !== j) swap(i, j); i++; } }
      swap(i, hi); done(i);
      qs(lo, i - 1); qs(i + 1, hi);
    };
    qs(0, n - 1);
  } else if (algo === "merge") {
    const tmp = a.slice();
    const ms = (lo, hi) => {
      if (hi - lo < 1) return;
      const mid = (lo + hi) >> 1;
      ms(lo, mid); ms(mid + 1, hi);
      let i = lo, j = mid + 1, k = lo;
      while (i <= mid && j <= hi) { cmp(i, j); tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++]; }
      while (i <= mid) tmp[k++] = a[i++];
      while (j <= hi) tmp[k++] = a[j++];
      for (let x = lo; x <= hi; x++) set(x, tmp[x]);
    };
    ms(0, n - 1);
    for (let i = 0; i < n; i++) done(i);
  }
  return steps;
}

function setSortControls(on) {
  ["runSort", "newArray", "sortAlgo", "sortSize", "sortSpeed"].forEach(id => $(id).disabled = !on);
  sorting = !on;
}

function runSort() {
  const speed = +$("sortSpeed").value;
  const steps = genSteps($("sortAlgo").value, arr.slice());
  setSortControls(false);
  sortTimers.forEach(clearTimeout); sortTimers = [];
  let comparisons = 0, swaps = 0;
  let prev = [];

  steps.forEach((s, idx) => {
    sortTimers.push(setTimeout(() => {
      prev.forEach(b => b.classList.remove("compare", "swap"));
      prev = [];
      if (s.t === "compare") { comparisons++; barEls[s.i].classList.add("compare"); barEls[s.j].classList.add("compare"); prev = [barEls[s.i], barEls[s.j]]; }
      else if (s.t === "swap") {
        swaps++;
        const hi = barEls[s.i].style.height, hj = barEls[s.j].style.height;
        barEls[s.i].style.height = hj; barEls[s.j].style.height = hi;
        barEls[s.i].classList.add("swap"); barEls[s.j].classList.add("swap");
        prev = [barEls[s.i], barEls[s.j]];
      } else if (s.t === "set") { barEls[s.i].style.height = s.v + "%"; barEls[s.i].classList.add("swap"); prev = [barEls[s.i]]; }
      else if (s.t === "sorted") { barEls[s.i].classList.add("sorted"); }
      $("sortStat").textContent = `${comparisons} comparisons · ${swaps} swaps`;
    }, idx * speed));
  });

  sortTimers.push(setTimeout(() => {
    barEls.forEach(b => { b.classList.remove("compare", "swap"); b.classList.add("sorted"); });
    setSortControls(true);
  }, steps.length * speed + 50));
}

/* ===================== INIT ===================== */
async function init() {
  DATA = await (await fetch("data.json")).json();
  ROWS = DATA.grid.rows; COLS = DATA.grid.cols;
  start = { r: DATA.start[0], c: DATA.start[1] };
  end = { r: DATA.end[0], c: DATA.end[1] };
  buildGrid();

  const preset = $("preset");
  Object.keys(DATA.presets).forEach(name => {
    const o = document.createElement("option"); o.value = name; o.textContent = name; preset.appendChild(o);
  });

  const grid = $("grid");
  grid.addEventListener("pointerdown", e => { e.preventDefault(); gridDown(e); });
  grid.addEventListener("pointermove", gridMove);
  document.addEventListener("pointerup", () => { pdown = false; });

  $("runPath").addEventListener("click", visualize);
  $("clearPathBtn").addEventListener("click", clearPathClasses);
  $("clearWalls").addEventListener("click", () => { walls.clear(); clearPathClasses(); paint(); });
  $("preset").addEventListener("change", e => loadPreset(e.target.value));

  $("newArray").addEventListener("click", newArray);
  $("runSort").addEventListener("click", runSort);
  $("sortSize").addEventListener("input", newArray);

  newArray();
  $("foot").innerHTML = `Vanilla JS · preset mazes generated by <code>presets.py</code>. Drag on the grid to draw walls.`;
}

init();
