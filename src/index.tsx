
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type SideCode = "R" | "P";
type StateType = "g" | "aq" | "l" | "s" | "";
type IncludeMode = "Auto" | "Sí" | "No";
type ConstantType = "Kc" | "Kp";
type WorkMode =
  | "Resolver equilibrio con K"
  | "Calcular K desde equilibrio conocido"
  | "Hallar una especie en equilibrio"
  | "Calcular Q y predecir sentido";
type Thermal = "No especificada" | "Endotérmica" | "Exotérmica";
type Perturbation =
  | "No aplica"
  | "Aumenta concentración de reactivo"
  | "Disminuye concentración de reactivo"
  | "Aumenta concentración de producto"
  | "Disminuye concentración de producto"
  | "Aumenta presión"
  | "Disminuye presión"
  | "Aumenta volumen"
  | "Disminuye volumen"
  | "Aumenta temperatura"
  | "Disminuye temperatura"
  | "Agrega catalizador"
  | "Gas inerte (volumen constante)";
type DisplayMode = "Estudiante" | "Profesor";
type CalculatorView = "datos" | "motor" | "laboratorio";

type SpeciesRow = {
  id: string;
  sideCode: SideCode;
  order: number;
  name: string;
  state: StateType;
  coeff: number | string | null;
  initial: number | string | null;
  eqKnown: number | string | null;
  includeMode: IncludeMode;
};

type ComputedRow = SpeciesRow & {
  includeInK: boolean;
  jSign: number | null;
  deltaNg: number | null;
  eqCalc: number | null;
  selectedValue: number | null;
  numFactor: number;
  denFactor: number;
  unknownFlag: number;
  resolvedUnknown: number | null;
  status: string;
};

type SolverResult = {
  xi: number | null;
  Kcalc: number | null;
  error: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  direction: string;
  status: string;
};

type Exercise = {
  id: string;
  title: string;
  goal: string;
  reaction: string;
  workMode: WorkMode;
  constantType: ConstantType;
  kInput: string;
  temperature: string;
  pressure: string;
  tolerance: string;
  thermal: Thermal;
  perturbation: Perturbation;
  rows: SpeciesRow[];
  expected: string[];
};

const R_CONST = 0.082057;
const EPS = 1e-12;

const CSS = `
:root{
  --bg:#eef7fc; --surface:#ffffff; --surface-2:#f6fbff; --line:#cfdeec; --line-strong:#9fd7e7;
  --text:#142038; --muted:#60728b; --soft:#eef9fc; --teal:#10bfd1; --teal-dark:#067b91;
  --blue:#276fe6; --violet:#7560e8; --violet-soft:#f0edff; --ink:#0b1830;
  --shadow:0 18px 38px rgba(14,45,82,.12); --shadow-soft:0 8px 20px rgba(14,45,82,.08);
  font-family: Inter, ui-sans-serif, system-ui, Arial, sans-serif; color:var(--text);
}
*{box-sizing:border-box} body{margin:0;background:var(--bg)} button,input,select{font:inherit}
.app-shell{min-height:100vh;padding:14px;position:relative;background:
  linear-gradient(180deg,#f8fcff 0%,#edf7fc 48%,#e8f2fb 100%),
  linear-gradient(90deg,rgba(16,191,209,.08) 1px,transparent 1px),
  linear-gradient(0deg,rgba(39,111,230,.06) 1px,transparent 1px);background-size:auto,28px 28px,28px 28px}
.lab-overlay{position:fixed;inset:0;pointer-events:none;opacity:.22;background-image:
  linear-gradient(30deg,transparent 48%,rgba(16,191,209,.24) 49%,transparent 51%),
  linear-gradient(150deg,transparent 48%,rgba(117,96,232,.18) 49%,transparent 51%);
  background-size:220px 220px,260px 260px}
.layout{max-width:1580px;margin:0 auto;display:grid;grid-template-columns:250px 1fr;gap:18px;position:relative;z-index:1}
.sidebar,.panel,.card,.exercise-card{background:rgba(255,255,255,.96);border:1px solid var(--line);box-shadow:var(--shadow)}
.sidebar{position:sticky;top:14px;height:calc(100vh - 28px);overflow:auto;border-radius:26px;padding:14px;display:flex;flex-direction:column;gap:8px;background:linear-gradient(180deg,#0d2444 0%,#0d3654 54%,#123154 100%);border-color:rgba(143,225,238,.36);color:white}
.side-top{font-size:20px;padding:10px 10px 14px;color:#9eeaf2;border-bottom:1px solid rgba(255,255,255,.12);margin-bottom:4px}
.nav{border:1px solid transparent;background:rgba(255,255,255,.04);padding:11px 12px;border-radius:12px;text-align:left;cursor:pointer;color:#d5eafd;transition:.16s ease;font-weight:700}
.nav:hover{background:rgba(16,191,209,.16);border-color:rgba(16,191,209,.28);color:white}.nav.active{background:linear-gradient(135deg,rgba(16,191,209,.24),rgba(117,96,232,.20));color:white;border-color:rgba(136,232,244,.70);box-shadow:inset 4px 0 0 var(--teal)}
.doctor-card{margin-top:auto;border:1px solid rgba(143,225,238,.28);background:rgba(255,255,255,.08);border-radius:20px;padding:16px;text-align:center;color:#dff8fb}
.doctor-avatar{width:78px;height:78px;margin:0 auto 10px;display:grid;place-items:center;border-radius:22px;background:linear-gradient(135deg,#e9fcff,#f4f0ff);font-size:42px;box-shadow:var(--shadow-soft)}
.doctor-card h3{margin:0;color:white;font-size:26px}.doctor-card p{line-height:1.45}.doctor-sub{margin:8px 0 6px;color:#91f1fb;font-weight:800}
.creators-mini{margin-top:10px;padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(255,255,255,.06)}
.mini-title{font-weight:800;color:#9eeaf2;margin-bottom:9px}.creator-pill{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.10);margin-bottom:7px;font-size:13px;color:#e6f7ff}
.content{display:flex;flex-direction:column;gap:14px}.panel{border-radius:24px;padding:16px;background:rgba(255,255,255,.94)}
.topbar{padding:18px 20px;display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#102a4b 0%,#145778 54%,#6255c7 100%);color:white;border-color:rgba(255,255,255,.24);overflow:hidden}
.brand-wrap{display:flex;align-items:center;gap:14px}.brand-icon{width:58px;height:58px;border-radius:18px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.30);color:white;display:grid;place-items:center;font-size:30px;box-shadow:0 14px 28px rgba(0,0,0,.16)}
.brand-title{margin:0;font-size:38px;line-height:1;letter-spacing:0}.brand-title span{color:#97f4ff}.brand-subtitle{margin:8px 0 0;color:#d9f4ff}
.top-icons{display:flex;gap:10px;align-items:center}.circle,.avatar{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(8px)}
.avatar{background:white;color:#175a8c;font-weight:800}
.highlight-row{display:flex;justify-content:space-between;gap:16px;align-items:center}.highlight-row h2{margin:0 0 5px;font-size:24px}.highlight-row p{margin:0;color:#5d718b;line-height:1.5}
.sync-note{margin-top:12px;padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,#ecfbff,#f5f2ff);border:1px solid #c9edf4;color:var(--teal-dark);font-size:14px;font-weight:700}
.btn-row{display:flex;gap:10px;flex-wrap:wrap}.btn{border-radius:12px;padding:11px 15px;border:0;cursor:pointer;font-weight:800;transition:.15s ease;white-space:nowrap}
.btn:hover{transform:translateY(-1px);box-shadow:var(--shadow-soft)}.btn-primary{background:linear-gradient(135deg,var(--teal),var(--teal-dark));color:white}.btn-outline{background:#ffffff;border:1px solid #bfe7ef;color:var(--teal-dark)}.btn.small{padding:8px 12px;border-radius:10px}
.main-grid{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:14px}.tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.tab{padding:11px 16px;border-radius:12px;background:#f1f6fb;border:1px solid #d7e7f1;font-weight:900;color:#42546d;cursor:pointer;box-shadow:0 1px 0 rgba(255,255,255,.8)}
.tab.active{background:#fff;color:var(--teal-dark);border-color:#83ddea;box-shadow:inset 0 -3px 0 var(--teal),var(--shadow-soft)}
.card{border-radius:18px;padding:17px;margin-bottom:14px;background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%)}.card-title,.card h3,.species-block h4{margin:0 0 10px;color:var(--ink)}.card-title,.card h3{font-size:20px}.subtext{margin:4px 0 0;color:var(--muted);line-height:1.5}
.reaction-row{display:grid;grid-template-columns:1fr 280px 134px;gap:10px}
input,select{width:100%;padding:11px 13px;border-radius:12px;border:1px solid #d7e4ef;background:#fbfdff;color:var(--text);outline:none}
input:focus,select:focus{border-color:#6ad9e8;box-shadow:0 0 0 3px rgba(16,191,209,.14);background:white}
.select-grid,.mini-grid,.summary-grid{display:grid;gap:11px;margin-top:14px;grid-template-columns:repeat(4,minmax(0,1fr))}
.mini-card{border:1px solid #d7e7f1;background:linear-gradient(180deg,#ffffff 0%,#f3fbff 100%);border-radius:14px;padding:12px 13px;box-shadow:var(--shadow-soft)}.mini-label{color:#627791;font-size:13px;margin-bottom:7px;font-weight:800}.expression{font-weight:900;line-height:1.45;word-break:break-word;color:#15253c}
.field{display:flex;flex-direction:column;gap:7px}.field label{font-size:12px;color:#657891;text-transform:uppercase;font-weight:900;letter-spacing:.04em}
.summary-card{border:1px solid #d5e5ef;border-radius:16px;padding:14px;display:flex;gap:12px;align-items:flex-start;background:linear-gradient(180deg,#fff 0%,#f7fbff 100%);box-shadow:var(--shadow-soft);min-height:126px}
.summary-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#e8fbff,#eeeaff);color:var(--teal-dark);font-weight:900;flex:0 0 auto}
.summary-label{color:#657891;font-size:12px;text-transform:uppercase;font-weight:900;letter-spacing:.04em}.summary-value{font-size:21px;font-weight:900;margin-top:4px;word-break:break-word;color:#0f2036}.summary-sub{color:var(--muted);font-size:13px;margin-top:5px;line-height:1.4}
.species-block{margin-top:18px}.species-block h4{padding-left:10px;border-left:4px solid var(--teal)}.species-list{display:grid;gap:10px}.species-row{display:grid;grid-template-columns:2fr .85fr .75fr 1fr 1fr .9fr;gap:10px;border:1px solid #dbe8f1;border-radius:14px;padding:12px;background:#fcfeff;box-shadow:0 1px 0 rgba(255,255,255,.8)}
.species-row:hover{border-color:#aee5ef;background:#f8fdff}.field.secondary{opacity:.60}.field.secondary input{background:#f1f5f9;color:#6f7f92}.field .field-note{font-size:12px;color:#7b8da3;margin-top:-3px;line-height:1.25;text-transform:none;font-weight:600;letter-spacing:0}
.sidepanels{display:flex;flex-direction:column;gap:14px}.side-title{font-weight:900;color:var(--violet);margin-bottom:12px;font-size:18px}.guide-list{display:grid;gap:10px}.guide-item{color:#37475f;line-height:1.5;padding:10px 11px;border:1px solid #e1edf5;border-radius:12px;background:#fbfdff}.help-inline{margin-top:10px;padding:13px;border-radius:14px;background:#f5f2ff;border:1px solid #ded8ff;color:#5547a9;font-weight:800;line-height:1.45}
.table-wrap{overflow:auto;border:1px solid #cfdeec;border-radius:14px;background:white} table{width:100%;border-collapse:separate;border-spacing:0;font-size:14px} th,td{padding:10px 12px;border-top:1px solid #e8f0f7;text-align:left;vertical-align:top} thead th{position:sticky;top:0;z-index:1;border-top:0;background:linear-gradient(180deg,#edf8ff,#e6f0fb);color:#40566f;font-weight:900;white-space:nowrap} tbody tr:nth-child(even){background:#fbfdff} tbody tr:hover{background:#f0fbff}
.step-box{margin-top:12px;border:1px solid #d8e6f1;border-radius:14px;padding:13px;background:#fbfdff}.step-box pre{margin:0;white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.65;color:#334155}
.dev-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.dev-card{border:1px solid #d5e5ef;border-radius:15px;padding:14px;background:linear-gradient(180deg,#fff 0%,#f7fbff 100%);box-shadow:var(--shadow-soft)}.dev-label{font-size:12px;color:#657891;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.dev-value{margin-top:8px;font-weight:900;line-height:1.5;color:#14233b}.dev-wide{grid-column:1/-1}
.mode-panel{border:1px solid #b7e9ef;background:linear-gradient(90deg,#ecfbff,#f8f5ff);border-radius:14px;padding:13px;margin-top:12px;color:#0b7184;line-height:1.45}.mode-panel strong{display:block;color:#07596a;margin-bottom:4px;text-transform:uppercase;font-size:12px;letter-spacing:.05em}
.module-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.module-tile{border:1px solid #d7e7f1;border-radius:14px;background:linear-gradient(180deg,#fff,#f6fbff);padding:14px;min-height:116px;box-shadow:var(--shadow-soft);line-height:1.45}.module-tile strong{display:block;margin-bottom:7px;color:var(--ink);font-size:13px;text-transform:uppercase;letter-spacing:.04em}
.dual-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:14px}.viz-card{border:1px solid #d5e5ef;border-radius:20px;background:linear-gradient(180deg,#f9fdff,#f2f7ff);padding:16px}
.beakers{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:24px}.beaker-wrap{text-align:center}
.beaker{position:relative;width:88px;height:104px;margin:0 auto;border:3px solid #8da3ba;border-top:0;border-radius:0 0 18px 18px;background:white;overflow:hidden;box-shadow:inset 0 0 18px rgba(39,111,230,.08)}
.beaker::before{content:"";position:absolute;left:50%;top:0;transform:translate(-50%,-14px);width:32px;height:18px;border:3px solid #8da3ba;border-bottom:0;border-radius:12px 12px 0 0;background:white}
.liquid{position:absolute;left:0;right:0;bottom:0;border-radius:12px 12px 0 0}.liquid.reactants{background:linear-gradient(180deg,#81d9ff,#276fe6)}.liquid.middle{background:linear-gradient(180deg,#dbe4ef,#95a5ba)}.liquid.products{background:linear-gradient(180deg,#d8c7ff,#7560e8)}
.beaker-label{margin-top:9px;color:var(--muted);font-size:13px;font-weight:800}.balance-wrap{position:relative;height:76px}
.balance-bar{position:absolute;left:50%;top:8px;transform-origin:center;width:250px;height:8px;border-radius:999px;background:#4f5d73}.balance-pivot{position:absolute;left:50%;top:24px;transform:translateX(-50%);width:0;height:0;border-left:25px solid transparent;border-right:25px solid transparent;border-top:40px solid #6b7b90}
.legend-row{display:flex;justify-content:space-between;gap:12px;align-items:center;color:var(--muted);font-size:13px}.legend-center{max-width:330px;text-align:center}.legend-center strong{display:block;color:var(--text);margin-bottom:6px}
.steps-grid{display:grid;gap:14px}.student-step{display:grid;grid-template-columns:54px 1fr;gap:14px;align-items:start;padding:16px;border:1px solid var(--line);border-radius:18px;background:#fcfeff}.step-number{width:44px;height:44px;border-radius:999px;display:grid;place-items:center;background:linear-gradient(135deg,var(--teal),var(--violet));color:white;font-weight:800}.step-text{line-height:1.65}
.section-header-inline{display:flex;justify-content:space-between;align-items:center;gap:10px}.mode-pill{padding:8px 13px;border-radius:999px;background:#eefcff;color:var(--teal-dark);font-weight:900;border:1px solid #c3edf3}
.exercise-list{display:grid;gap:12px}.exercise-card{border-radius:18px;padding:16px;background:linear-gradient(180deg,#fff 0%,#fbfdff 100%);box-shadow:var(--shadow-soft)}.exercise-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.exercise-head h4{margin:0 0 6px;font-size:18px}.exercise-head p{margin:0;color:var(--muted);line-height:1.45}.exercise-reaction{margin-top:12px;padding:10px 12px;border-radius:12px;background:#f2f6ff;border:1px solid #dfe7ff;font-weight:900}.exercise-expected{margin-top:12px;color:#31445d}.exercise-expected ul{margin:8px 0 0 18px}
.creators-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:16px}.creator-card{border:1px solid #d7e7f1;border-radius:18px;padding:18px;text-align:center;background:linear-gradient(180deg,#fff 0%,#f7fbff 100%);box-shadow:var(--shadow-soft)}.creator-icon{font-size:32px;margin-bottom:8px}.creator-name{font-weight:800}
.footer-note{text-align:center;color:var(--muted);padding:12px 0 4px;font-size:13px}
@media (max-width:1280px){.layout{grid-template-columns:220px 1fr}.main-grid,.dual-grid,.dev-grid,.module-grid{grid-template-columns:1fr}.summary-grid,.select-grid,.mini-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sidepanels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:900px){.app-shell{padding:8px}.layout,.creators-grid{grid-template-columns:1fr}.sidebar{position:relative;height:auto}.reaction-row,.select-grid,.mini-grid,.summary-grid,.species-row{grid-template-columns:1fr}.highlight-row,.topbar,.exercise-head,.section-header-inline{flex-direction:column;align-items:flex-start}.sidepanels{grid-template-columns:1fr}.brand-title{font-size:32px}}
`;

const workModes: WorkMode[] = [
  "Resolver equilibrio con K",
  "Calcular K desde equilibrio conocido",
  "Hallar una especie en equilibrio",
  "Calcular Q y predecir sentido",
];

const perturbations: Perturbation[] = [
  "No aplica","Aumenta concentración de reactivo","Disminuye concentración de reactivo","Aumenta concentración de producto","Disminuye concentración de producto","Aumenta presión","Disminuye presión","Aumenta volumen","Disminuye volumen","Aumenta temperatura","Disminuye temperatura","Agrega catalizador","Gas inerte (volumen constante)"
];

const creators = ["Moisés Silva","Felipe Barriga","Pablo Herrera","Hugo Morales","Álvaro Correa","Fabián Rojas"];

const emptyRows: SpeciesRow[] = [
  { id: "r1", sideCode: "R", order: 1, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
  { id: "r2", sideCode: "R", order: 2, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
  { id: "r3", sideCode: "R", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
  { id: "r4", sideCode: "R", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
  { id: "r5", sideCode: "R", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
  { id: "p1", sideCode: "P", order: 1, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
  { id: "p2", sideCode: "P", order: 2, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
  { id: "p3", sideCode: "P", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
  { id: "p4", sideCode: "P", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
  { id: "p5", sideCode: "P", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
];

const exercises: Exercise[] = [
  {
    id: "ex-k-known", title: "QA — K desde equilibrio conocido", goal: "Comprobar el cálculo de K a partir de concentraciones de equilibrio conocidas.",
    reaction: "N2(g) + 3 H2(g) ⇌ 2 NH3(g)", workMode: "Calcular K desde equilibrio conocido", constantType: "Kc",
    kInput: "1", temperature: "298.15", pressure: "1", tolerance: "0.000001", thermal: "No especificada", perturbation: "No aplica",
    rows: [
      { id: "r1", sideCode: "R", order: 1, name: "N2", state: "g", coeff: 1, initial: 0, eqKnown: 0.2, includeMode: "Auto" },
      { id: "r2", sideCode: "R", order: 2, name: "H2", state: "g", coeff: 3, initial: 0, eqKnown: 0.6, includeMode: "Auto" },
      { id: "r3", sideCode: "R", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r4", sideCode: "R", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r5", sideCode: "R", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p1", sideCode: "P", order: 1, name: "NH3", state: "g", coeff: 2, initial: 0, eqKnown: 0.8, includeMode: "Auto" },
      { id: "p2", sideCode: "P", order: 2, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p3", sideCode: "P", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p4", sideCode: "P", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p5", sideCode: "P", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
    ],
    expected: ["K ≈ 14,8148","Error relativo = 0","Estado del motor OK"],
  },
  {
    id: "ex-qgt", title: "QA — Caso Q > K", goal: "Verificar que el motor indique desplazamiento hacia reactivos cuando Q es mayor que K.",
    reaction: "H2(g) + I2(g) ⇌ 2 HI(g)", workMode: "Calcular Q y predecir sentido", constantType: "Kc",
    kInput: "20", temperature: "298.15", pressure: "1", tolerance: "0.000001", thermal: "No especificada", perturbation: "No aplica",
    rows: [
      { id: "r1", sideCode: "R", order: 1, name: "H2", state: "g", coeff: 1, initial: 0.2, eqKnown: null, includeMode: "Auto" },
      { id: "r2", sideCode: "R", order: 2, name: "I2", state: "g", coeff: 1, initial: 0.2, eqKnown: null, includeMode: "Auto" },
      { id: "r3", sideCode: "R", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r4", sideCode: "R", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r5", sideCode: "R", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p1", sideCode: "P", order: 1, name: "HI", state: "g", coeff: 2, initial: 5, eqKnown: null, includeMode: "Auto" },
      { id: "p2", sideCode: "P", order: 2, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p3", sideCode: "P", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p4", sideCode: "P", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p5", sideCode: "P", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
    ],
    expected: ["Q = 625","Q > K","Dirección: Hacia reactivos"],
  },
  {
    id: "ex-qlt", title: "Haber-Bosch — Caso Q < K", goal: "Comprobar avance hacia productos cuando Q es menor que K.",
    reaction: "N2(g) + 3 H2(g) ⇌ 2 NH3(g)", workMode: "Calcular Q y predecir sentido", constantType: "Kc",
    kInput: "15.73", temperature: "500", pressure: "1", tolerance: "0.000001", thermal: "Exotérmica", perturbation: "No aplica",
    rows: [
      { id: "r1", sideCode: "R", order: 1, name: "N2", state: "g", coeff: 1, initial: 1, eqKnown: null, includeMode: "Auto" },
      { id: "r2", sideCode: "R", order: 2, name: "H2", state: "g", coeff: 3, initial: 3, eqKnown: null, includeMode: "Auto" },
      { id: "r3", sideCode: "R", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r4", sideCode: "R", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r5", sideCode: "R", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p1", sideCode: "P", order: 1, name: "NH3", state: "g", coeff: 2, initial: 0, eqKnown: null, includeMode: "Auto" },
      { id: "p2", sideCode: "P", order: 2, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p3", sideCode: "P", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p4", sideCode: "P", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p5", sideCode: "P", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
    ],
    expected: ["Q = 0","Q < K","Dirección: Hacia productos"],
  },
  {
    id: "ex-solids", title: "Sólidos fuera de K", goal: "Verificar que los sólidos no entren en la expresión cuando En K está en Auto.",
    reaction: "CaCO3(s) ⇌ CaO(s) + CO2(g)", workMode: "Calcular Q y predecir sentido", constantType: "Kc",
    kInput: "3.2", temperature: "298.15", pressure: "1", tolerance: "0.000001", thermal: "No especificada", perturbation: "Aumenta presión",
    rows: [
      { id: "r1", sideCode: "R", order: 1, name: "CaCO3", state: "s", coeff: 1, initial: 1, eqKnown: null, includeMode: "Auto" },
      { id: "r2", sideCode: "R", order: 2, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r3", sideCode: "R", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r4", sideCode: "R", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r5", sideCode: "R", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p1", sideCode: "P", order: 1, name: "CaO", state: "s", coeff: 1, initial: 1, eqKnown: null, includeMode: "Auto" },
      { id: "p2", sideCode: "P", order: 2, name: "CO2", state: "g", coeff: 1, initial: 0.4, eqKnown: null, includeMode: "Auto" },
      { id: "p3", sideCode: "P", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p4", sideCode: "P", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p5", sideCode: "P", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
    ],
    expected: ["CaCO3(s) y CaO(s) quedan fuera de K en modo Auto","Solo entra CO2(g)"],
  },
  {
    id: "ex-no2", title: "Dimerización de NO2", goal: "Verificar exponentes estequiométricos y decimales en 2 NO2(g) ⇌ N2O4(g).",
    reaction: "2 NO2(g) ⇌ N2O4(g)", workMode: "Calcular Q y predecir sentido", constantType: "Kc",
    kInput: "5.0", temperature: "298.15", pressure: "1", tolerance: "0.000001", thermal: "No especificada", perturbation: "Aumenta presión",
    rows: [
      { id: "r1", sideCode: "R", order: 1, name: "NO2", state: "g", coeff: 2, initial: 0.8, eqKnown: null, includeMode: "Auto" },
      { id: "r2", sideCode: "R", order: 2, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r3", sideCode: "R", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r4", sideCode: "R", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "r5", sideCode: "R", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p1", sideCode: "P", order: 1, name: "N2O4", state: "g", coeff: 1, initial: 0.6, eqKnown: null, includeMode: "Auto" },
      { id: "p2", sideCode: "P", order: 2, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p3", sideCode: "P", order: 3, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p4", sideCode: "P", order: 4, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
      { id: "p5", sideCode: "P", order: 5, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" },
    ],
    expected: ["Qc = 0,9375","Q < K","Dirección: Hacia productos","Aumentar presión favorece productos"],
  },
];

function nfmt(value: number | null | undefined, digits = 6, min = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("es-CL", { maximumFractionDigits: digits, minimumFractionDigits: Math.min(min, digits) });
}
function sfmt(value: number | null | undefined, digits = 6) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("es-CL", { maximumFractionDigits: digits });
}
function numericValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
function positiveCoeff(row: SpeciesRow) {
  const coeff = numericValue(row.coeff);
  return coeff !== null && coeff > 0 ? coeff : null;
}
function cloneRows(source: SpeciesRow[]) {
  return source.map((row) => ({ ...row }));
}
function rowLabel(row: SpeciesRow) { return row.name.trim() ? `${row.name}${row.state ? `(${row.state})` : ""}` : ""; }
function normalizeReactionInput(input: string) { return input.replace(/<=>|\u21cc|\u21c4|\u2194|\u2192|\u00e2\u2021\u0152|\u00e2\u2021\u201E|\u00e2\u2020\u201D|\u00e2\u2020\u2019|=>|=/g, "\u21cc").replace(/\s+/g, " ").trim(); }
function inferState(text: string): StateType { const m = text.match(/\((g|aq|l|s)\)$/i); return m ? (m[1].toLowerCase() as StateType) : ""; }
function cleanName(text: string) { return text.replace(/\((g|aq|l|s)\)$/i, "").trim(); }
function parseReactionToRows(reaction: string, previousRows: SpeciesRow[]) {
  const normalized = normalizeReactionInput(reaction);
  const parts = normalized.split("\u21cc");
  if (parts.length !== 2) return null;
  const prevMap = new Map(previousRows.map((r) => [rowLabel(r), r]));
  const parseSide = (segment: string, sideCode: SideCode) =>
    segment.split("+").map((s) => s.trim()).filter(Boolean).map((term, index) => {
      const m = term.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
      const coeff = m ? Number(m[1].replace(",", ".")) : 1;
      const rawName = (m ? m[2] : term).trim();
      const state = inferState(rawName);
      const name = cleanName(rawName);
      const full = `${name}${state ? `(${state})` : ""}`;
      const prev = prevMap.get(full);
      return {
        id: `${sideCode.toLowerCase()}${index + 1}`, sideCode, order: index + 1, name, state, coeff,
        initial: prev ? prev.initial : null, eqKnown: prev ? prev.eqKnown : null, includeMode: prev ? prev.includeMode : "Auto",
      } as SpeciesRow;
    });
  const reactivos = parseSide(parts[0], "R");
  const productos = parseSide(parts[1], "P");
  while (reactivos.length < 5) reactivos.push({ id: `r${reactivos.length + 1}`, sideCode: "R", order: reactivos.length + 1, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" });
  while (productos.length < 5) productos.push({ id: `p${productos.length + 1}`, sideCode: "P", order: productos.length + 1, name: "", state: "", coeff: null, initial: null, eqKnown: null, includeMode: "Auto" });
  return [...reactivos, ...productos];
}
function includeInK(row: SpeciesRow, constantType: ConstantType = "Kc") {
  if (!row.name.trim() || positiveCoeff(row) === null) return false;
  if (constantType === "Kp" && row.state !== "g") return false;
  if (row.includeMode === "Sí") return true;
  if (row.includeMode === "No") return false;
  if (constantType === "Kp") return row.state === "g";
  return row.state === "g" || row.state === "aq";
}
function rowStatus(row: SpeciesRow, included: boolean, constantType: ConstantType = "Kc") {
  if (!row.name.trim()) return "";
  if (positiveCoeff(row) === null) return "Revisar coef.";
  if (constantType === "Kp" && row.state && row.state !== "g") return "Fuera de Kp";
  if (!included) return "Fuera de K";
  return "OK";
}
function exprToken(row: SpeciesRow, constantType: ConstantType) {
  const coeff = positiveCoeff(row);
  if (!row.name.trim() || coeff === null || !includeInK(row, constantType)) return "";
  const base = constantType === "Kp" ? `P(${row.name})` : `[${row.name}]`;
  return coeff === 1 ? base : `${base}^${coeff}`;
}
function buildReactionText(rows: SpeciesRow[]) {
  const left = rows.filter((r) => r.sideCode === "R" && r.name.trim()).map((r) => {
    const coeff = positiveCoeff(r);
    return `${coeff !== null && coeff !== 1 ? `${coeff} ` : ""}${rowLabel(r)}`;
  }).join(" + ");
  const right = rows.filter((r) => r.sideCode === "P" && r.name.trim()).map((r) => {
    const coeff = positiveCoeff(r);
    return `${coeff !== null && coeff !== 1 ? `${coeff} ` : ""}${rowLabel(r)}`;
  }).join(" + ");
  return left || right ? `${left} \u21cc ${right}` : "";
}
function buildKExpression(rows: SpeciesRow[], constantType: ConstantType) {
  const numerator = rows.filter((r) => r.sideCode === "P").map((r) => exprToken(r, constantType)).filter(Boolean);
  const denominator = rows.filter((r) => r.sideCode === "R").map((r) => exprToken(r, constantType)).filter(Boolean);
  if (!numerator.length && !denominator.length) return "K = 1";
  if (!denominator.length) return `K = ${numerator.join(" · ")}`;
  if (!numerator.length) return `K = 1 / (${denominator.join(" · ")})`;
  return `K = (${numerator.join(" · ")}) / (${denominator.join(" · ")})`;
}
function validateRows(rows: SpeciesRow[], workMode: WorkMode, constantType: ConstantType, Kinput: number | null) {
  const messages: string[] = [];
  const named = rows.filter((r) => r.name.trim());
  if (!named.length) messages.push("Ingresa o sincroniza una reacción con al menos una especie.");
  if (!rows.some((r) => r.sideCode === "R" && r.name.trim())) messages.push("Faltan reactivos.");
  if (!rows.some((r) => r.sideCode === "P" && r.name.trim())) messages.push("Faltan productos.");
  for (const row of named) {
    if (!row.state) messages.push(`${row.name}: falta estado físico (g, aq, l o s).`);
    if (positiveCoeff(row) === null) messages.push(`${row.name}: coeficiente inválido.`);
  }
  const included = named.filter((r) => includeInK(r, constantType));
  if (!included.length) messages.push(`${constantType}: no hay especies incluidas en la expresión.`);
  if (constantType === "Kp" && named.some((r) => (r.state === "aq" || r.state === "l" || r.state === "s") && r.includeMode !== "Auto" && r.includeMode !== "No")) {
    messages.push("Kp solo puede usar presiones parciales de gases; no se incluyen especies aq, l ni s.");
  }
  if (workMode !== "Calcular K desde equilibrio conocido" && (Kinput === null || Kinput <= 0)) messages.push("K debe ser mayor que cero para este modo.");
  if (workMode === "Calcular Q y predecir sentido" || workMode === "Resolver equilibrio con K") {
    for (const row of included) if (numericValue(row.initial) === null) messages.push(`${row.name}: falta valor inicial.`);
  }
  if (workMode === "Calcular K desde equilibrio conocido") {
    for (const row of included) if (numericValue(row.eqKnown) === null) messages.push(`${row.name}: falta equilibrio conocido.`);
  }
  const unknowns = included.filter((r) => numericValue(r.eqKnown) === null);
  if (workMode === "Hallar una especie en equilibrio" && unknowns.length !== 1) messages.push("Debe existir exactamente una especie incluida en K sin Eq. conocido.");
  return messages;
}
function buildSubstitution(rows: SpeciesRow[], field: "initial" | "eqKnown", constantType: ConstantType) {
  const token = (row: SpeciesRow) => {
    const coeff = positiveCoeff(row);
    const value = field === "initial" ? numericValue(row.initial) : numericValue(row.eqKnown);
    if (coeff === null || value === null) return "";
    return coeff === 1 ? sfmt(value) : `${sfmt(value)}^${coeff}`;
  };
  const numerator = rows.filter((r) => r.sideCode === "P" && includeInK(r, constantType)).map(token).filter(Boolean);
  const denominator = rows.filter((r) => r.sideCode === "R" && includeInK(r, constantType)).map(token).filter(Boolean);
  if (!numerator.length && !denominator.length) return "No aplica";
  if (!denominator.length) return numerator.join(" · ");
  if (!numerator.length) return `1 / (${denominator.join(" · ")})`;
  return `(${numerator.join(" · ")}) / (${denominator.join(" · ")})`;
}
function productSafe(values: number[]) { return values.reduce((acc, val) => acc * val, 1); }
function calcQFromInitial(rows: SpeciesRow[], constantType: ConstantType = "Kc") {
  const included = rows.filter((r) => includeInK(r, constantType) && r.name.trim() && positiveCoeff(r) !== null);
  if (!included.length || included.some((r) => numericValue(r.initial) === null)) return null;
  const numerator = productSafe(included.filter((r) => r.sideCode === "P").map((r) => Math.pow(Math.max(numericValue(r.initial) ?? 0, 0), positiveCoeff(r) ?? 1)));
  const denominator = productSafe(included.filter((r) => r.sideCode === "R").map((r) => Math.pow(Math.max(numericValue(r.initial) ?? 0, 0), positiveCoeff(r) ?? 1)));
  if (denominator === 0) return numerator === 0 ? null : 1e99;
  return numerator / denominator;
}
function calcKFromKnownEq(rows: SpeciesRow[], constantType: ConstantType = "Kc") {
  const valid = rows.filter((r) => includeInK(r, constantType) && r.name.trim() && positiveCoeff(r) !== null);
  if (!valid.length || valid.some((r) => numericValue(r.eqKnown) === null)) return null;
  const numFactors = valid.filter((r) => r.sideCode === "P").map((r) => Math.pow(Math.max(numericValue(r.eqKnown) ?? 0, EPS), positiveCoeff(r) ?? 1));
  const denFactors = valid.filter((r) => r.sideCode === "R").map((r) => Math.pow(Math.max(numericValue(r.eqKnown) ?? 0, EPS), positiveCoeff(r) ?? 1));
  const denominator = productSafe(denFactors);
  if (denominator === 0) return null;
  return productSafe(numFactors) / denominator;
}
function deltaNG(row: SpeciesRow) {
  const coeff = positiveCoeff(row);
  if (!row.name.trim() || coeff === null) return null;
  const sign = row.sideCode === "R" ? -1 : 1;
  if (row.state === "g") return sign * coeff;
  return 0;
}
function canConvertKcKp(rows: SpeciesRow[]) {
  return rows.filter((r) => includeInK(r, "Kc")).every((r) => r.state === "g");
}
function convertConstant(K: number | null, type: ConstantType, target: ConstantType, temperature: number, deltaN: number) {
  if (K === null || !Number.isFinite(K) || K <= 0) return null;
  if (type === target) return K;
  const factor = Math.pow(R_CONST * temperature, deltaN);
  if (!Number.isFinite(factor) || factor === 0) return null;
  return type === "Kc" ? K * factor : K / factor;
}
function directionText(Q: number | null, K: number | null, tolerance: number) {
  if (Q === null || K === null || !Number.isFinite(Q) || !Number.isFinite(K) || K <= 0) return "";
  if (Math.abs(Q - K) / K <= tolerance) return "En equilibrio";
  return Q < K ? "Hacia productos" : "Hacia reactivos";
}
function directionSummary(direction: string, Q: number | null, K: number | null) {
  if (direction === "Hacia productos") return `Como Q (${sfmt(Q)}) es menor que K (${sfmt(K)}), la reacción avanza hacia los productos.`;
  if (direction === "Hacia reactivos") return `Como Q (${sfmt(Q)}) es mayor que K (${sfmt(K)}), la reacción retrocede hacia los reactivos.`;
  if (direction === "En equilibrio") return `Q (${sfmt(Q)}) es prácticamente igual a K (${sfmt(K)}), por lo que el sistema ya está en equilibrio.`;
  return "Faltan datos suficientes para determinar el sentido.";
}
function qVsKText(Q: number | null, K: number | null, tolerance: number) {
  if (Q === null || K === null || !Number.isFinite(Q) || !Number.isFinite(K) || K <= 0) return "";
  if (Math.abs(Q - K) / K <= tolerance) return "Q = K";
  return Q < K ? "Q < K" : "Q > K";
}
function minForwardLimit(rows: SpeciesRow[]) {
  const values = rows.filter((r) => r.sideCode === "R" && r.name.trim() && positiveCoeff(r) !== null && numericValue(r.initial) !== null).map((r) => (numericValue(r.initial) ?? 0) / (positiveCoeff(r) ?? 1));
  if (!values.length) return 1e99;
  return Math.min(...values);
}
function minReverseLimit(rows: SpeciesRow[]) {
  const values = rows.filter((r) => r.sideCode === "P" && r.name.trim() && positiveCoeff(r) !== null && numericValue(r.initial) !== null).map((r) => (numericValue(r.initial) ?? 0) / (positiveCoeff(r) ?? 1));
  if (!values.length) return 1e99;
  return Math.min(...values);
}
function calcQAtXi(rows: SpeciesRow[], xi: number, constantType: ConstantType, pressure: number) {
  let numerator = 1;
  let denominator = 1;
  const gasRows = rows.filter((r) => includeInK(r, constantType) && r.name.trim() && r.state === "g" && positiveCoeff(r) !== null)
    .map((r) => ({ ...r, conc: (numericValue(r.initial) ?? 0) + (r.sideCode === "R" ? -1 : 1) * (positiveCoeff(r) ?? 1) * xi }));
  if (gasRows.some((r) => r.conc < 0)) return null;
  const totalGas = gasRows.reduce((acc, r) => acc + r.conc, 0);
  for (const row of rows) {
    const coeff = positiveCoeff(row);
    if (!includeInK(row, constantType) || !row.name.trim() || coeff === null) continue;
    let value: number;
    value = (numericValue(row.initial) ?? 0) + (row.sideCode === "R" ? -1 : 1) * coeff * xi;
    if (value < 0) return null;
    const factor = Math.pow(Math.max(value, EPS), coeff);
    if (row.sideCode === "P") numerator *= factor;
    else denominator *= factor;
  }
  if (denominator === 0) return null;
  return numerator / denominator;
}
function solveXi(rows: SpeciesRow[], Ktarget: number | null, tolerance: number, constantType: ConstantType, pressure: number) {
  const qInitial = calcQFromInitial(rows, constantType);
  const direction = directionText(qInitial, Ktarget, tolerance);
  const forwardLimit = minForwardLimit(rows);
  const reverseLimit = minReverseLimit(rows);
  const epsilon = 1e-12;
  const lowerBound = direction === "Hacia reactivos" ? -reverseLimit + epsilon : 0;
  const upperBound = direction === "Hacia productos" ? forwardLimit - epsilon : 0;
  if (direction === "En equilibrio") return { xi: 0, Kcalc: Ktarget, error: 0, lowerBound, upperBound, direction, status: "OK: Q inicial ya coincide con K." };
  if (!Ktarget || !Number.isFinite(Ktarget) || Ktarget <= 0) return { xi: null, Kcalc: null, error: null, lowerBound, upperBound, direction, status: "K debe ser mayor que cero." };
  if (qInitial === null) return { xi: null, Kcalc: null, error: null, lowerBound, upperBound, direction, status: "No se puede resolver ξ: Q inicial no está definido." };
  if (!direction) return { xi: null, Kcalc: null, error: null, lowerBound, upperBound, direction, status: "No se puede determinar el sentido con los datos ingresados." };
  if (!Number.isFinite(lowerBound) || !Number.isFinite(upperBound) || upperBound <= lowerBound) return { xi: null, Kcalc: null, error: null, lowerBound, upperBound, direction, status: "No hay intervalo físico válido para ξ." };

  const f = (xi: number) => {
    const q = calcQAtXi(rows, xi, constantType, pressure);
    return q === null || !Number.isFinite(q) ? null : q - Ktarget;
  };
  let lo = lowerBound;
  let hi = upperBound;
  let flo = f(lo);
  let fhi = f(hi);
  if (flo === null || fhi === null) return { xi: null, Kcalc: null, error: null, lowerBound, upperBound, direction, status: "No se puede evaluar Q dentro del intervalo físico." };
  if (Math.abs(flo) < Math.abs(fhi) && Math.abs(flo) / Ktarget <= tolerance) {
    const kval = calcQAtXi(rows, lo, constantType, pressure);
    return { xi: lo, Kcalc: kval, error: kval === null ? null : Math.abs(kval - Ktarget) / Ktarget, lowerBound, upperBound, direction, status: "OK: equilibrio resuelto en el borde físico." };
  }
  if (Math.abs(fhi) / Ktarget <= tolerance) {
    const kval = calcQAtXi(rows, hi, constantType, pressure);
    return { xi: hi, Kcalc: kval, error: kval === null ? null : Math.abs(kval - Ktarget) / Ktarget, lowerBound, upperBound, direction, status: "OK: equilibrio resuelto en el borde físico." };
  }
  if (flo * fhi > 0) return { xi: null, Kcalc: null, error: null, lowerBound, upperBound, direction, status: "No se encontró cambio de signo para resolver ξ." };

  let mid = 0;
  let kmid: number | null = null;
  for (let i = 0; i < 120; i++) {
    mid = (lo + hi) / 2;
    kmid = calcQAtXi(rows, mid, constantType, pressure);
    if (kmid === null || !Number.isFinite(kmid)) return { xi: null, Kcalc: null, error: null, lowerBound, upperBound, direction, status: "El solver encontró un valor no físico durante la iteración." };
    const fmid = kmid - Ktarget;
    if (Math.abs(fmid) / Ktarget <= tolerance) break;
    if (flo * fmid <= 0) {
      hi = mid;
      fhi = fmid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  const error = kmid === null ? null : Math.abs(kmid - Ktarget) / Ktarget;
  return { xi: mid, Kcalc: kmid, error, lowerBound, upperBound, direction, status: error !== null && error <= tolerance ? "OK: equilibrio resuelto por bisección." : "Revisar: error mayor que tolerancia." };
}
function getLeChatelierMessage(perturbation: Perturbation, deltaN: number, thermal: Thermal) {
  switch (perturbation) {
    case "Aumenta concentración de reactivo": return "El equilibrio se desplaza hacia los productos para consumir parte del reactivo añadido.";
    case "Disminuye concentración de reactivo": return "El equilibrio se desplaza hacia los reactivos para reponer la especie removida.";
    case "Aumenta concentración de producto": return "El equilibrio se desplaza hacia los reactivos para contrarrestar el exceso de producto.";
    case "Disminuye concentración de producto": return "El equilibrio se desplaza hacia los productos para reponer el producto disminuido.";
    case "Aumenta presión":
    case "Disminuye volumen":
      if (deltaN < 0) return "Se favorece el lado con menos moles gaseosos: productos.";
      if (deltaN > 0) return "Se favorece el lado con menos moles gaseosos: reactivos.";
      return "Como Δn(g)=0, la presión no genera desplazamiento apreciable.";
    case "Disminuye presión":
    case "Aumenta volumen":
      if (deltaN < 0) return "Se favorece el lado con más moles gaseosos: reactivos.";
      if (deltaN > 0) return "Se favorece el lado con más moles gaseosos: productos.";
      return "Como Δn(g)=0, la presión no genera desplazamiento apreciable.";
    case "Aumenta temperatura":
      if (thermal === "Endotérmica") return "Aumentar la temperatura favorece la reacción endotérmica: productos.";
      if (thermal === "Exotérmica") return "Aumentar la temperatura favorece la reacción endotérmica inversa: reactivos.";
      return "Solo la temperatura puede cambiar K; especifica si la reacción es endotérmica o exotérmica.";
    case "Disminuye temperatura":
      if (thermal === "Endotérmica") return "Disminuir la temperatura favorece la reacción exotérmica inversa: reactivos.";
      if (thermal === "Exotérmica") return "Disminuir la temperatura favorece la reacción exotérmica directa: productos.";
      return "Solo la temperatura puede cambiar K; especifica si la reacción es endotérmica o exotérmica.";
    case "Agrega catalizador": return "El catalizador no cambia K ni la posición del equilibrio; solo acelera la llegada al equilibrio.";
    case "Gas inerte (volumen constante)": return "En volumen constante, un gas inerte no altera las presiones parciales relativas en el modelo ideal.";
    default: return "Sin perturbación seleccionada.";
  }
}

function App() {
  const [reaction, setReaction] = useState("");
  const [rows, setRows] = useState<SpeciesRow[]>(emptyRows);
  const [workMode, setWorkMode] = useState<WorkMode>("Resolver equilibrio con K");
  const [constantType, setConstantType] = useState<ConstantType>("Kc");
  const [kInput, setKInput] = useState("");
  const [temperature, setTemperature] = useState("298.15");
  const [pressure, setPressure] = useState("1");
  const [tolerance, setTolerance] = useState("0.000001");
  const [thermal, setThermal] = useState<Thermal>("No especificada");
  const [perturbation, setPerturbation] = useState<Perturbation>("No aplica");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("Estudiante");
  const [activeTab, setActiveTab] = useState<"calculadora"|"resultado"|"desarrollo"|"lechatelier"|"ejercicios"|"qa"|"creditos">("calculadora");
  const [calculatorView, setCalculatorView] = useState<CalculatorView>("datos");
  const [message, setMessage] = useState("Versión química mejorada. Motor basado en tu Excel y lista para pruebas.");

  const computed = useMemo(() => {
    const T = numericValue(temperature) ?? 298.15;
    const P = numericValue(pressure) ?? 1;
    const tol = numericValue(tolerance) ?? 0.000001;
    const Kinput = numericValue(kInput);

    const rowsComputed: ComputedRow[] = rows.map((row) => {
      const included = includeInK(row, constantType);
      return { ...row, includeInK: included, jSign: row.name.trim() && positiveCoeff(row) !== null ? (row.sideCode === "R" ? -1 : 1) : null, deltaNg: deltaNG(row), eqCalc: null, selectedValue: null, numFactor: 1, denFactor: 1, unknownFlag: 0, resolvedUnknown: null, status: rowStatus(row, included, constantType) };
    });

    const deltaN = rowsComputed.reduce((acc, r) => acc + (r.deltaNg ?? 0), 0);
    const factor = Number.isFinite(T) ? Math.pow(R_CONST * T, deltaN) : null;
    const qInitial = calcQFromInitial(rows, constantType);
    const kFromKnown = calcKFromKnownEq(rows, constantType);
    const effectiveK = workMode === "Calcular K desde equilibrio conocido" ? kFromKnown : Kinput;
    const validationMessages = validateRows(rows, workMode, constantType, Kinput);
    const qForComparison = workMode === "Calcular K desde equilibrio conocido" ? null : qInitial;
    const qvsK = qVsKText(qForComparison, effectiveK, tol);
    const direction = directionText(qForComparison, effectiveK, tol);
    const solver = validationMessages.length
      ? { xi: null, Kcalc: null, error: null, lowerBound: null, upperBound: null, direction: "", status: validationMessages[0] }
      : workMode === "Calcular K desde equilibrio conocido"
      ? { xi: null, Kcalc: null, error: null, lowerBound: null, upperBound: null, direction: "", status: "No aplica" }
      : solveXi(rows, effectiveK, tol, constantType, P);

    let unknownCount = 0;
    for (const row of rowsComputed) {
      if (workMode === "Hallar una especie en equilibrio" && row.includeInK && row.name.trim() && numericValue(row.eqKnown) === null) {
        row.unknownFlag = 1;
        unknownCount += 1;
      }
    }

    let knownNum = 1;
    let knownDen = 1;
    for (const row of rowsComputed) {
      const coeff = positiveCoeff(row);
      if (!row.includeInK || !row.name.trim() || coeff === null) continue;
      const rawValue = workMode === "Resolver equilibrio con K" ? row.initial : workMode === "Calcular K desde equilibrio conocido" ? row.eqKnown : workMode === "Hallar una especie en equilibrio" ? row.eqKnown : row.initial;
      const v = numericValue(rawValue);
      if (workMode === "Hallar una especie en equilibrio" && row.unknownFlag === 1) continue;
      if (v === null || !Number.isFinite(v)) continue;
      const factorValue = Math.pow(Math.max(v, EPS), coeff);
      if (row.sideCode === "P") knownNum *= factorValue; else knownDen *= factorValue;
    }

    for (const row of rowsComputed) {
      const coeff = positiveCoeff(row);
      const initial = numericValue(row.initial);
      const eqKnown = numericValue(row.eqKnown);
      if (workMode === "Resolver equilibrio con K" && solver.xi !== null && coeff !== null && initial !== null) row.eqCalc = initial + (row.sideCode === "R" ? -1 : 1) * coeff * solver.xi;
      if (workMode === "Calcular K desde equilibrio conocido") row.eqCalc = eqKnown;
      if (workMode === "Calcular Q y predecir sentido") row.eqCalc = initial;

      row.selectedValue =
        workMode === "Resolver equilibrio con K" ? row.eqCalc
        : workMode === "Calcular K desde equilibrio conocido" ? eqKnown
        : workMode === "Hallar una especie en equilibrio" ? (row.unknownFlag === 1 ? row.resolvedUnknown : eqKnown)
        : initial;

      if (row.includeInK && row.name.trim() && coeff !== null && row.selectedValue !== null) {
        const factorVal = Math.pow(Math.max(row.selectedValue, EPS), coeff);
        row.numFactor = row.sideCode === "P" ? factorVal : 1;
        row.denFactor = row.sideCode === "R" ? factorVal : 1;
      }
    }

    if (workMode === "Hallar una especie en equilibrio" && unknownCount === 1 && effectiveK && effectiveK > 0) {
      const unknown = rowsComputed.find((r) => r.unknownFlag === 1 && positiveCoeff(r) !== null);
      if (unknown) {
        const coeff = positiveCoeff(unknown) ?? 1;
        if (unknown.sideCode === "P") unknown.resolvedUnknown = Math.pow((effectiveK * knownDen) / knownNum, 1 / coeff);
        else unknown.resolvedUnknown = Math.pow(knownNum / (effectiveK * knownDen), 1 / coeff);
        unknown.selectedValue = unknown.resolvedUnknown;
        const f = Math.pow(Math.max(unknown.resolvedUnknown ?? EPS, EPS), coeff);
        unknown.numFactor = unknown.sideCode === "P" ? f : 1;
        unknown.denFactor = unknown.sideCode === "R" ? f : 1;
      }
    }

    const aggregateValue =
      workMode === "Resolver equilibrio con K"
        ? productSafe(rowsComputed.map((r) => r.numFactor)) / productSafe(rowsComputed.map((r) => r.denFactor))
        : workMode === "Calcular K desde equilibrio conocido" || workMode === "Hallar una especie en equilibrio"
        ? productSafe(rowsComputed.map((r) => r.numFactor)) / productSafe(rowsComputed.map((r) => r.denFactor))
        : qInitial;

    const relativeError = workMode === "Calcular Q y predecir sentido" ? null : effectiveK && effectiveK > 0 && aggregateValue && Number.isFinite(aggregateValue) ? Math.abs(aggregateValue - effectiveK) / effectiveK : null;

    const stateMotor = (() => {
      if (validationMessages.length) return validationMessages[0];
      const filledNames = rowsComputed.filter((r) => r.name.trim()).length;
      if (filledNames === 0) return "Falta ingresar especies.";
      if (["Resolver equilibrio con K", "Hallar una especie en equilibrio", "Calcular Q y predecir sentido"].includes(workMode)) {
        if (effectiveK === null || effectiveK <= 0) return "K debe ser mayor que cero.";
        if (workMode === "Resolver equilibrio con K") {
          if (solver.status) return solver.status;
          if (direction === "En equilibrio") return "OK: Q inicial ya coincide con K.";
          if ((solver.upperBound ?? 0) < (solver.lowerBound ?? 0) || minForwardLimit(rows) === 1e99) return "Revisar iniciales/coeficientes: no hay intervalo químico válido.";
          if (relativeError !== null && relativeError <= tol) return "OK: equilibrio resuelto por iteración interna.";
          return "Revisar: error mayor que tolerancia.";
        }
        if (workMode === "Hallar una especie en equilibrio") return unknownCount === 1 ? "OK: una incógnita resuelta desde la expresión de K." : "Debe existir exactamente una especie incluida en K sin Eq. conocido.";
        return "OK: Q calculado y sentido estimado.";
      }
      return "OK: K calculada desde valores de equilibrio conocidos.";
    })();

    const conversionAllowed = canConvertKcKp(rows);
    const kcEq = conversionAllowed ? convertConstant(effectiveK, constantType, "Kc", T, deltaN) : null;
    const kpEq = conversionAllowed ? convertConstant(effectiveK, constantType, "Kp", T, deltaN) : null;
    const substitutionText = workMode === "Calcular K desde equilibrio conocido" ? buildSubstitution(rows, "eqKnown", constantType) : buildSubstitution(rows, "initial", constantType);
    const card4Label = workMode === "Calcular Q y predecir sentido" ? "Sentido previsto" : workMode === "Calcular K desde equilibrio conocido" ? "No aplica" : "Dirección";
    const card5Label = workMode === "Calcular Q y predecir sentido" || workMode === "Calcular K desde equilibrio conocido" ? "No aplica" : "ξ solución";
    const unknownResolved = rowsComputed.find((r) => r.unknownFlag === 1)?.resolvedUnknown ?? null;
    const card6Label = workMode === "Calcular Q y predecir sentido" ? "Q calculado" : workMode === "Hallar una especie en equilibrio" ? "Especie hallada" : "K calculada";
    const card5Value = workMode === "Calcular Q y predecir sentido" || workMode === "Calcular K desde equilibrio conocido" ? "No aplica" : sfmt(solver.xi);
    const card6Value = workMode === "Hallar una especie en equilibrio" ? sfmt(unknownResolved) : sfmt(aggregateValue);

    return { temperature: T, pressure: P, toleranceValue: tol, deltaN, factor, qInitial, kFromKnown, effectiveK, qvsK, direction, solver, aggregateValue, relativeError, stateMotor, reactionText: buildReactionText(rows), exprText: buildKExpression(rows, constantType), rows: rowsComputed, kcEq, kpEq, conversionAllowed, validationMessages, substitutionText, card4Label, card5Label, card5Value, card6Label, card6Value };
  }, [rows, workMode, constantType, kInput, temperature, pressure, tolerance]);

  const updateRow = (id: string, patch: Partial<SpeciesRow>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const syncReaction = () => {
    const parsed = parseReactionToRows(reaction, rows);
    if (!parsed) { setMessage("No pude interpretar la reacción. Usa un formato como N2(g) + 3 H2(g) ⇌ 2 NH3(g)."); return; }
    setRows(parsed); setMessage("Reacción sincronizada según la lógica del Excel.");
  };
  const loadExercise = (exercise: Exercise) => {
    setReaction(exercise.reaction); setRows(cloneRows(exercise.rows)); setWorkMode(exercise.workMode); setConstantType(exercise.constantType); setKInput(exercise.kInput);
    setTemperature(exercise.temperature); setPressure(exercise.pressure); setTolerance(exercise.tolerance); setThermal(exercise.thermal); setPerturbation(exercise.perturbation); setActiveTab("resultado"); setMessage(`Ejercicio cargado: ${exercise.title}`);
  };

  const reactTotal = computed.rows.filter((r) => r.sideCode === "R").reduce((acc, r) => acc + Math.max(0, r.selectedValue ?? 0), 0);
  const prodTotal = computed.rows.filter((r) => r.sideCode === "P").reduce((acc, r) => acc + Math.max(0, r.selectedValue ?? 0), 0);
  const total = Math.max(reactTotal + prodTotal, 1e-9);
  const reactPct = Math.min(80, Math.max(14, (reactTotal / total) * 100));
  const prodPct = Math.min(80, Math.max(14, (prodTotal / total) * 100));
  const eqPct = Math.min(80, Math.max(14, ((reactTotal + prodTotal) / 2 / total) * 100));
  const balanceRotation = computed.direction === "Hacia productos" ? "-6deg" : computed.direction === "Hacia reactivos" ? "6deg" : "0deg";
  const qInitialText = workMode === "Calcular K desde equilibrio conocido" ? "No aplica" : sfmt(computed.qInitial);
  const relativeErrorText = computed.relativeError === null ? "No aplica" : sfmt(computed.relativeError, 8);
  const participatingText = computed.rows.filter((r) => r.includeInK && r.name.trim()).map(rowLabel).join(", ") || "No aplica";
  const excludedText = computed.rows.filter((r) => !r.includeInK && r.name.trim()).map((r) => `${rowLabel(r)} (${r.status})`).join(", ") || "No aplica";
  const leChatelierText = perturbation === "No aplica" ? "No aplica" : getLeChatelierMessage(perturbation, computed.deltaN, thermal);

  const studentSteps = [
    `1. La reaccion interpretada es: ${computed.reactionText || "No aplica"}.`,
    `2. La expresion construida es: ${computed.exprText}.`,
    `3. Sustitucion numerica: ${computed.substitutionText}.`,
    `4. Calculo principal: ${workMode === "Calcular K desde equilibrio conocido" ? `K = ${sfmt(computed.kFromKnown)}` : `Q = ${qInitialText}`}.`,
    `5. Comparacion Q vs K: ${computed.qvsK || "No aplica"}.`,
    `6. Conclusion Q/K: ${computed.direction || "No aplica"}.`,
    `7. Le Chatelier separado: ${leChatelierText}.`,
    `8. Diagnostico: ${computed.stateMotor}.`,
  ];
  const professorSteps = [
    `Modo: ${workMode}`, `Tipo de constante: ${constantType}`, `Reaccion formal = ${computed.reactionText || "No aplica"}`,
    `Participan en ${constantType}: ${participatingText}`, `Excluidas: ${excludedText}`,
    `R = ${R_CONST}`, `Delta n(g) = ${sfmt(computed.deltaN)}`, `(RT)^Delta n = ${sfmt(computed.factor)}`,
    `Conversion Kc/Kp = ${computed.conversionAllowed ? "permitida" : "No aplica"}`, `Kc equivalente = ${sfmt(computed.kcEq)}`, `Kp equivalente = ${sfmt(computed.kpEq)}`,
    `Q inicial = ${qInitialText}`, `Sustitucion = ${computed.substitutionText}`, `Comparacion Q/K = ${computed.qvsK || "No aplica"}`,
    `Direccion = ${computed.direction || "No determinada"}`, `Cota inferior xi = ${sfmt(computed.solver.lowerBound)}`, `Cota superior xi = ${sfmt(computed.solver.upperBound)}`,
    `xi solucion = ${sfmt(computed.solver.xi)}`, `Estado del solver = ${computed.solver.status}`, `${computed.card6Label} = ${computed.card6Value}`,
    `Error relativo = ${relativeErrorText}`, `Validaciones = ${computed.validationMessages.length ? computed.validationMessages.join(" | ") : "OK"}`, `Estado del motor = ${computed.stateMotor}`,
  ];

  return (
    <div className="app-shell">
      <style>{CSS}</style>
      <div className="lab-overlay" />
      <div className="layout">
        <aside className="sidebar">
          <div className="side-top">☰</div>
          <button className={`nav ${activeTab === "calculadora" ? "active" : ""}`} onClick={() => setActiveTab("calculadora")}>🧪 Calculadora</button>
          <button className={`nav ${activeTab === "resultado" ? "active" : ""}`} onClick={() => setActiveTab("resultado")}>📊 Resultado</button>
          <button className={`nav ${activeTab === "desarrollo" ? "active" : ""}`} onClick={() => setActiveTab("desarrollo")}>🧮 Desarrollo</button>
          <button className={`nav ${activeTab === "lechatelier" ? "active" : ""}`} onClick={() => setActiveTab("lechatelier")}>⚖️ Le Chatelier</button>
          <button className={`nav ${activeTab === "ejercicios" ? "active" : ""}`} onClick={() => setActiveTab("ejercicios")}>📚 Ejercicios</button>
          <button className={`nav ${activeTab === "qa" ? "active" : ""}`} onClick={() => setActiveTab("qa")}>✅ QA</button>
          <button className={`nav ${activeTab === "creditos" ? "active" : ""}`} onClick={() => setActiveTab("creditos")}>👥 Créditos</button>
          <div className="doctor-card">
            <div className="doctor-avatar">⚗️</div>
            <h3>Dr. Chemi</h3>
            <p className="doctor-sub">Asistente de equilibrio químico</p>
            <p>Motor basado en el Excel, diseño químico y listo para probar ejercicios reales.</p>
          </div>
          <div className="creators-mini">
            <div className="mini-title">Creadores</div>
            {creators.map((name) => <div key={name} className="creator-pill">{name}</div>)}
          </div>
        </aside>

        <main className="content">
          <section className="topbar panel">
            <div className="brand-wrap">
              <div className="brand-icon">⚛️</div>
              <div>
                <h1 className="brand-title">Chem<span>Balance</span> Lab</h1>
                <p className="brand-subtitle">Equilibrio químico • desarrollo guiado • validación con ejercicios</p>
              </div>
            </div>
            <div className="top-icons">
              <div className="circle">🧪</div><div className="circle">🔥</div><div className="circle">❄️</div><div className="avatar">MS</div>
            </div>
          </section>

          <section className="panel">
            <div className="highlight-row">
              <div>
                <h2>Motor químico + modo estudiante/profesor</h2>
                <p>Se corrigieron etiquetas por modo, se añadieron créditos, estética química y un apartado para probar la app con ejercicios reales.</p>
              </div>
              <div className="btn-row">
                <button className="btn btn-outline" onClick={syncReaction}>🔁 Sincronizar</button>
                <button className="btn btn-outline" onClick={() => setDisplayMode(displayMode === "Estudiante" ? "Profesor" : "Estudiante")}>{displayMode === "Estudiante" ? "Modo profesor" : "Modo estudiante"}</button>
              </div>
            </div>
            <div className="sync-note">{message}</div>
          </section>

          {activeTab === "calculadora" && (
            <section className="main-grid">
              <div className="panel">
                <div className="tabs" role="tablist" aria-label="Secciones de calculadora">
                  <button className={`tab ${calculatorView === "datos" ? "active" : ""}`} onClick={() => setCalculatorView("datos")}>Datos del sistema</button>
                  <button className={`tab ${calculatorView === "motor" ? "active" : ""}`} onClick={() => setCalculatorView("motor")}>Motor</button>
                  <button className={`tab ${calculatorView === "laboratorio" ? "active" : ""}`} onClick={() => setCalculatorView("laboratorio")}>Laboratorio</button>
                </div>
                {calculatorView === "datos" && (
                <div className="card">
                  <div className="card-title">Datos del sistema</div>
                  <div className="reaction-row">
                    <input value={reaction} onChange={(e) => setReaction(e.target.value)} placeholder="Ej.: N2(g) + 3 H2(g) ⇌ 2 NH3(g)" />
                    <select value={workMode} onChange={(e) => setWorkMode(e.target.value as WorkMode)}>{workModes.map((m) => <option key={m} value={m}>{m}</option>)}</select>
                    <button className="btn btn-outline" onClick={syncReaction}>Sincronizar</button>
                  </div>
                  <div className="mode-panel"><strong>Modo activo</strong>{modeHelp(workMode)}</div>
                  <div className="select-grid">
                    <Field label="Tipo de constante"><select value={constantType} onChange={(e) => setConstantType(e.target.value as ConstantType)}><option value="Kc">Kc</option><option value="Kp">Kp</option></select></Field>
                    <Field label="K ingresada" secondary={workMode === "Calcular K desde equilibrio conocido"} note={workMode === "Calcular K desde equilibrio conocido" ? "No aplica: se calcula desde Eq. conocido" : undefined}><input value={kInput} onChange={(e) => setKInput(e.target.value)} /></Field>
                    <Field label="Temperatura (K)" note="Necesaria para conversion Kc/Kp"><input value={temperature} onChange={(e) => setTemperature(e.target.value)} /></Field>
                    <Field label="Presion (atm)" secondary note="Referencia del sistema; no reemplaza presiones parciales"><input value={pressure} onChange={(e) => setPressure(e.target.value)} /></Field>
                    <Field label="Tolerancia"><input value={tolerance} onChange={(e) => setTolerance(e.target.value)} /></Field>
                    <Field label="Naturaleza térmica"><select value={thermal} onChange={(e) => setThermal(e.target.value as Thermal)}><option>No especificada</option><option>Endotérmica</option><option>Exotérmica</option></select></Field>
                    <Field label="Perturbación"><select value={perturbation} onChange={(e) => setPerturbation(e.target.value as Perturbation)}>{perturbations.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
                    <Field label="Modo de explicación"><select value={displayMode} onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}><option>Estudiante</option><option>Profesor</option></select></Field>
                  </div>
                  <div className="mini-grid">
                    <MiniCard icon="🧪" label="Texto de reacción" value={computed.reactionText || "—"} />
                    <MiniCard icon="K" label="Expresión de K" value={computed.exprText} />
                    <MiniCard icon="Δn" label="Δn(g)" value={sfmt(computed.deltaN)} />
                    <MiniCard icon="RT" label="(RT)^Δn" value={sfmt(computed.factor)} />
                  </div>
                </div>
                )}
                {calculatorView === "motor" && (
                <div className="card">
                  <h3>Motor: especies y tabla ICE</h3>
                  <p className="subtext">Auto incluye (g) y (aq), y excluye (s) y (l). Los campos secundarios muestran No aplica cuando el modo no los usa.</p>
                  <SpeciesSection title="Reactivos" rows={computed.rows.filter((r) => r.sideCode === "R")} onChange={updateRow} workMode={workMode} />
                  <SpeciesSection title="Productos" rows={computed.rows.filter((r) => r.sideCode === "P")} onChange={updateRow} workMode={workMode} />
                </div>
                )}
                {calculatorView === "laboratorio" && (
                <div className="card">
                  <h3>Laboratorio de diagnostico</h3>
                  <p className="subtext">Vista compacta para revisar que el motor y la interpretacion quimica esten alineados antes de leer el resultado.</p>
                  <div className="module-grid">
                    <div className="module-tile"><strong>Reaccion en estudio</strong>{computed.reactionText || "No aplica"}</div>
                    <div className="module-tile"><strong>Expresion activa</strong>{computed.exprText}</div>
                    <div className="module-tile"><strong>Estado del motor</strong>{computed.stateMotor}</div>
                    <div className="module-tile"><strong>Incluidas en K/Q</strong>{participatingText}</div>
                    <div className="module-tile"><strong>Excluidas</strong>{excludedText}</div>
                    <div className="module-tile"><strong>Le Chatelier</strong>{leChatelierText}</div>
                  </div>
                </div>
                )}
              </div>
              <aside className="sidepanels">
                <div className="card">
                  <div className="side-title">⚗️ Guía rápida</div>
                  <div className="guide-list">
                    <GuideItem text="Q < K → el sistema avanza a productos." />
                    <GuideItem text="Q > K → el sistema retrocede a reactivos." />
                    <GuideItem text="Q = K → el sistema está en equilibrio." />
                    <GuideItem text="Kp trabaja con presiones parciales gaseosas." />
                    <GuideItem text="La temperatura puede alterar el valor de K." />
                  </div>
                </div>
                <div className="card">
                  <div className="side-title">🧬 Motor activo</div>
                  <div className="help-inline">{computed.stateMotor}</div>
                </div>
              </aside>
            </section>
          )}

          {activeTab === "resultado" && (
            <section className="panel">
              <div className="card">
                <h3>Resumen de resultados</h3>
                <div className="summary-grid">
                  <SummaryCard icon="K" label="K objetivo" value={sfmt(computed.effectiveK)} subtitle="K efectiva usada por el motor" />
                  <SummaryCard icon="Q" label="Q inicial" value={workMode === "Calcular K desde equilibrio conocido" ? "No aplica" : sfmt(computed.qInitial)} subtitle={workMode === "Calcular K desde equilibrio conocido" ? "No aplica en este modo" : "Cociente de reacción inicial"} />
                  <SummaryCard icon="Q/K" label="Comparación" value={computed.qvsK || "No aplica"} subtitle={workMode === "Calcular K desde equilibrio conocido" ? "No se compara Q en este modo" : "Relación entre Q y K"} />
                  <SummaryCard icon="↗" label={computed.card4Label} value={computed.direction || "No aplica"} subtitle={workMode === "Calcular K desde equilibrio conocido" ? "En este modo la app calcula K desde equilibrio conocido." : directionSummary(computed.direction, computed.qInitial, computed.effectiveK)} />
                </div>
                <div className="summary-grid">
                  <SummaryCard icon="ξ" label={computed.card5Label} value={computed.card5Value} subtitle={workMode === "Calcular Q y predecir sentido" ? "Este modo no necesita resolver ξ." : "Resultado interno del motor"} />
                  <SummaryCard icon="Σ" label={computed.card6Label} value={computed.card6Value} subtitle={workMode === "Calcular Q y predecir sentido" ? "En este modo se reporta Q y no una K iterada." : "Valor agregado calculado por el motor"} />
                  <SummaryCard icon="ε" label="Error relativo" value={computed.relativeError === null ? "No aplica" : sfmt(computed.relativeError, 8)} subtitle={workMode === "Calcular Q y predecir sentido" ? "No es el foco principal de este modo." : "Comparación con la K objetivo"} />
                  <SummaryCard icon="OK" label="Estado del motor" value={computed.stateMotor} subtitle="Diagnóstico general" />
                </div>
              </div>

              <div className="dual-grid">
                <div className="card">
                  <h3>Motor de tabla (filas 40:49)</h3>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Lado</th><th>Especie</th><th>Estado</th><th>Coef.</th><th>Inicial</th><th>Eq. conocido</th><th>En K</th><th>J</th><th>Δn(g)</th><th>Seleccionado</th><th>Estado</th></tr></thead>
                      <tbody>
                        {computed.rows.map((r) => (
                          <tr key={r.id}>
                            <td>{r.sideCode}</td><td>{r.name || "—"}</td><td>{r.state || "—"}</td><td>{r.coeff ?? "—"}</td><td>{nfmt(numericValue(r.initial))}</td><td>{nfmt(numericValue(r.eqKnown))}</td><td>{r.includeInK ? "1" : "0"}</td><td>{r.jSign ?? "—"}</td><td>{r.deltaNg ?? "—"}</td><td>{nfmt(r.selectedValue)}</td><td>{r.status || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <h3>Interpretación visual</h3>
                  <div className="viz-card">
                    <div className="beakers">
                      <BeakerView label="Reactivos" height={`${reactPct}%`} tone="reactants" />
                      <BeakerView label="Equilibrio" height={`${eqPct}%`} tone="middle" />
                      <BeakerView label="Productos" height={`${prodPct}%`} tone="products" />
                    </div>
                    <div className="balance-wrap"><div className="balance-bar" style={{ transform: `translateX(-50%) rotate(${balanceRotation})` }} /><div className="balance-pivot" /></div>
                    <div className="legend-row">
                      <div>🔵 Reactivos</div>
                      <div className="legend-center">
                        <strong>{computed.direction === "Hacia productos" ? "El equilibrio favorece productos." : computed.direction === "Hacia reactivos" ? "El equilibrio favorece reactivos." : "El sistema está en equilibrio."}</strong>
                        <span>{directionSummary(computed.direction, computed.qInitial, computed.effectiveK)}</span>
                      </div>
                      <div>🟣 Productos</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "desarrollo" && (
            <section className="panel">
              <div className="card">
                <div className="section-header-inline"><h3>Desarrollo paso a paso</h3><div className="mode-pill">{displayMode}</div></div>
                <div className="dev-grid">
                  <DevCard label="Reaccion interpretada" value={computed.reactionText || "No aplica"} />
                  <DevCard label="Expresion activa" value={computed.exprText} />
                  <DevCard label="Especies incluidas" value={participatingText} />
                  <DevCard label="Especies excluidas" value={excludedText} />
                  <DevCard label="Sustitucion numerica" value={computed.substitutionText} wide />
                  <DevCard label="Calculo principal" value={workMode === "Calcular K desde equilibrio conocido" ? `K = ${sfmt(computed.kFromKnown)}` : `Q = ${qInitialText}`} />
                  <DevCard label="Comparacion Q vs K" value={computed.qvsK || "No aplica"} />
                  <DevCard label="Direccion del equilibrio" value={computed.direction || "No aplica"} />
                  <DevCard label="Xi y limites" value={`xi = ${sfmt(computed.solver.xi)} | limite inferior = ${sfmt(computed.solver.lowerBound)} | limite superior = ${sfmt(computed.solver.upperBound)}`} />
                  <DevCard label="Verificacion" value={`Estado: ${computed.stateMotor}. Error relativo: ${relativeErrorText}. ${computed.card6Label}: ${computed.card6Value}.`} />
                  <DevCard label="Le Chatelier separado" value={leChatelierText} wide />
                </div>
                {displayMode === "Profesor" && (
                  <div>{professorSteps.map((step, index) => <div key={index} className="step-box"><pre>{step}</pre></div>)}</div>
                )}
              </div>
            </section>
          )}

          {activeTab === "lechatelier" && (
            <section className="panel">
              <div className="card">
                <h3>Le Chatelier</h3>
                <div className="summary-grid">
                  <SummaryCard icon="⚙️" label="Perturbación" value={perturbation} subtitle="Escenario elegido" />
                  <SummaryCard icon="Δn" label="Δn(g)" value={sfmt(computed.deltaN)} subtitle="Solo especies gaseosas" />
                  <SummaryCard icon="🌡️" label="Naturaleza térmica" value={thermal} subtitle="Para cambios de temperatura" />
                  <SummaryCard icon="📌" label="Conclusión" value={getLeChatelierMessage(perturbation, computed.deltaN, thermal)} subtitle="Regla cualitativa aplicada" />
                </div>
              </div>
            </section>
          )}

          {activeTab === "ejercicios" && (
            <section className="panel">
              <div className="card">
                <h3>Ejercicios para probar la app</h3>
                <p className="subtext">Aquí puedes cargar ejercicios reales y comparar si el motor responde correctamente.</p>
                <div className="exercise-list">
                  {exercises.map((exercise) => (
                    <div key={exercise.id} className="exercise-card">
                      <div className="exercise-head">
                        <div><h4>{exercise.title}</h4><p>{exercise.goal}</p></div>
                        <button className="btn btn-outline" onClick={() => loadExercise(exercise)}>Cargar ejercicio</button>
                      </div>
                      <div className="exercise-reaction">{exercise.reaction}</div>
                      <div className="exercise-expected"><strong>Esperado:</strong><ul>{exercise.expected.map((item) => <li key={item}>{item}</li>)}</ul></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === "qa" && (
            <section className="panel">
              <div className="card">
                <h3>QA / Validación rápida</h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Caso</th><th>Esperado</th><th>Resultado actual</th><th>Acción</th></tr></thead>
                    <tbody>
                      <tr><td>K desde equilibrio conocido</td><td>K ≈ 14.8148</td><td>{sfmt(calcKFromKnownEq(exercises[0].rows))}</td><td><button className="btn btn-outline small" onClick={() => loadExercise(exercises[0])}>Probar</button></td></tr>
                      <tr><td>Q &gt; K</td><td>Dirección: Hacia reactivos</td><td>{sfmt(calcQFromInitial(exercises[1].rows))} / {directionText(calcQFromInitial(exercises[1].rows), 20, 0.000001)}</td><td><button className="btn btn-outline small" onClick={() => loadExercise(exercises[1])}>Probar</button></td></tr>
                      <tr><td>Q &lt; K</td><td>Dirección: Hacia productos</td><td>{sfmt(calcQFromInitial(exercises[2].rows))} / {directionText(calcQFromInitial(exercises[2].rows), 15.73, 0.000001)}</td><td><button className="btn btn-outline small" onClick={() => loadExercise(exercises[2])}>Probar</button></td></tr>
                      <tr><td>Sólidos fuera de K</td><td>Solo entra CO2(g)</td><td>{buildKExpression(exercises[3].rows, "Kc")}</td><td><button className="btn btn-outline small" onClick={() => loadExercise(exercises[3])}>Probar</button></td></tr>
                      <tr><td>Dimerización de NO2</td><td>Q = 0,9375 / Hacia productos</td><td>{sfmt(calcQFromInitial(exercises[4].rows))} / {directionText(calcQFromInitial(exercises[4].rows), 5, 0.000001)}</td><td><button className="btn btn-outline small" onClick={() => loadExercise(exercises[4])}>Probar</button></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === "creditos" && (
            <section className="panel">
              <div className="card">
                <h3>Créditos de la aplicación</h3>
                <p className="subtext">Desarrollo del proyecto académico y funcional de equilibrio químico y Le Chatelier.</p>
                <div className="creators-grid">{creators.map((name) => <div key={name} className="creator-card"><div className="creator-icon">🧫</div><div className="creator-name">{name}</div></div>)}</div>
              </div>
            </section>
          )}

          <div className="footer-note">ChemBalance Lab · Creadores: {creators.join(", ")} · La química está llena de equilibrio, y en ese balance está la magia. ⚗️</div>
        </main>
      </div>
    </div>
  );
}

function modeHelp(mode: WorkMode) {
  switch (mode) {
    case "Calcular Q y predecir sentido":
      return "Usa valores iniciales para calcular Q, compara con K ingresada y predice el sentido. Eq. conocido: No aplica.";
    case "Calcular K desde equilibrio conocido":
      return "Usa Eq. conocido para construir K. K ingresada e Inicial: No aplica para el calculo principal.";
    case "Hallar una especie en equilibrio":
      return "Usa K ingresada y Eq. conocido; deja una sola especie incluida en K sin valor para resolverla.";
    case "Resolver equilibrio con K":
      return "Usa valores iniciales, K ingresada y el solver de xi para encontrar la composicion de equilibrio.";
    default:
      return "Selecciona un modo de trabajo.";
  }
}

function Field({ label, children, secondary = false, note }: { label: string; children: React.ReactNode; secondary?: boolean; note?: string }) {
  return <div className={`field ${secondary ? "secondary" : ""}`}><label>{label}</label>{children}{note ? <div className="field-note">{note}</div> : null}</div>;
}
function MiniCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="mini-card"><div className="mini-label">{icon} {label}</div><div className="expression">{value}</div></div>;
}
function SummaryCard({ icon, label, value, subtitle }: { icon: string; label: string; value: string; subtitle: string }) {
  return <div className="summary-card"><div className="summary-icon">{icon}</div><div className="summary-body"><div className="summary-label">{label}</div><div className="summary-value">{value}</div><div className="summary-sub">{subtitle}</div></div></div>;
}
function DevCard({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={`dev-card ${wide ? "dev-wide" : ""}`}><div className="dev-label">{label}</div><div className="dev-value">{value}</div></div>;
}
function GuideItem({ text }: { text: string }) { return <div className="guide-item">{text}</div>; }
function SpeciesSection({ title, rows, onChange, workMode }: { title: string; rows: ComputedRow[]; onChange: (id: string, patch: Partial<SpeciesRow>) => void; workMode: WorkMode }) {
  const initialSecondary = workMode === "Calcular K desde equilibrio conocido" || workMode === "Hallar una especie en equilibrio";
  const eqSecondary = workMode === "Calcular Q y predecir sentido" || workMode === "Resolver equilibrio con K";
  const eqNote = workMode === "Hallar una especie en equilibrio" ? "Deja una sola especie incluida vacia" : eqSecondary ? "No aplica en este modo" : undefined;
  return (
    <div className="species-block">
      <h4>{title}</h4>
      <div className="species-list">
        {rows.map((row) => (
          <div key={row.id} className="species-row">
            <Field label="Especie"><input value={row.name} onChange={(e) => onChange(row.id, { name: e.target.value })} /></Field>
            <Field label="Estado"><select value={row.state} onChange={(e) => onChange(row.id, { state: e.target.value as StateType })}><option value="">—</option><option value="g">g</option><option value="aq">aq</option><option value="l">l</option><option value="s">s</option></select></Field>
            <Field label="Coef."><input value={row.coeff ?? ""} onChange={(e) => onChange(row.id, { coeff: e.target.value === "" ? null : e.target.value })} /></Field>
            <Field label="Inicial" secondary={initialSecondary} note={initialSecondary ? "No aplica en este modo" : undefined}><input value={row.initial ?? ""} onChange={(e) => onChange(row.id, { initial: e.target.value === "" ? null : e.target.value })} /></Field>
            <Field label="Eq. conocido" secondary={eqSecondary} note={eqNote}><input value={row.eqKnown ?? ""} onChange={(e) => onChange(row.id, { eqKnown: e.target.value === "" ? null : e.target.value })} /></Field>
            <Field label="En K"><select value={row.includeMode} onChange={(e) => onChange(row.id, { includeMode: e.target.value as IncludeMode })}><option value="Auto">Auto</option><option value="Sí">Sí</option><option value="No">No</option></select></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
function BeakerView({ label, height, tone }: { label: string; height: string; tone: "reactants" | "middle" | "products" }) {
  return <div className="beaker-wrap"><div className="beaker"><div className={`liquid ${tone}`} style={{ height }} /></div><div className="beaker-label">{label}</div></div>;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("No se encontró el elemento root");

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
