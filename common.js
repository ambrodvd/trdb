/* ====== CONFIGURAZIONE ====== */
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbx_lF3IYT9nodUiVCQNoFbxYkut6Kge2MZ8eGD_uWMbwZD1G1xzovR7BJeic5seGy_n/exec",                       // incolla l'URL della Web App (finisce con /exec). Vuoto = dati di esempio
  NOME_SITO: "TRAIL RACE DATABASE"
};

const VOCI = [["org","Organizzazione"],["bel","Bellezza percorso"],["seg","Balisaggio"],
              ["ris","Ristori"],["loc","Bellezza località"],["atm","Atmosfera"]];
const TERRENI = ["Trail","Strada","Misto"];
const MESI = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

/* ====== UTILITÀ ====== */
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function stelle(v) {
  if (v == null || isNaN(v)) return "-";
  const n = Math.round(v);
  return `<span class="stelle">${"★".repeat(n)}</span><span class="vuote">${"☆".repeat(5 - n)}</span> <small>${v.toFixed(1)}</small>`;
}
function fmtData(iso) { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; }
function media(a) { const v = a.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; }
function linkGara(r) { return `<a href="gara.html?id=${encodeURIComponent(r.id)}">${esc(r.nome)}</a>`; }
function errore(e) {
  const el = document.getElementById("conta");
  if (el) el.innerHTML = `<span class="ko">Errore nel caricamento dei dati. Riprova più tardi.</span>`;
  console.error(e);
}

/* ====== TESTATA E PIEDE ====== */
function pagina(attiva) {
  const voci = [["index.html","Home"],["elenco.html","Elenco gare"],["mappa.html","Mappa"],["calendario.html","Calendario"],
                ["invia.html","Invia una gara"],["privacy.html","Privacy"]];
  const nav = voci.map(([h, t]) => {
    const nuovo = h === "invia.html" ? ` <span class="lampeggia">NEW!</span>` : "";
    return (h === attiva ? `<b>[ ${t} ]</b>` : `<a href="${h}">${t}</a>`) + nuovo;
  }).join(" | ");
  document.getElementById("testa").innerHTML = `
    <h1>~*~ ${esc(CONFIG.NOME_SITO)} ~*~</h1>
    <div class="sottotitolo">Le gare trail di tutto il mondo, recensite da chi le ha corse</div>
    <marquee scrollamount="4">+++ Benvenuto! +++ Hai corso una gara? Recensiscila nella pagina INVIA UNA GARA +++
      ${CONFIG.API_URL ? "" : "ATTENZIONE: stai vedendo DATI DI ESEMPIO +++"}</marquee>
    <div class="nav">${nav}</div>`;
  document.getElementById("piede").innerHTML = `
    <hr><div class="piede">© ${new Date().getFullYear()} ${esc(CONFIG.NOME_SITO)} ·
    Ottimizzato per Netscape Navigator 4.0 a 800x600 · <a href="privacy.html">Privacy</a>
    <br><span id="agg"></span></div>`;
}

/* ====== DATI ====== */
async function caricaDati() {
  let dati;
  if (!CONFIG.API_URL) dati = DEMO;
  else { const r = await fetch(CONFIG.API_URL); dati = await r.json(); }
  const el = document.getElementById("agg");
  if (el && dati.aggiornato) el.textContent = "Dati aggiornati al " + fmtData(dati.aggiornato);
  return dati.gare.map(g => {
    const m = {};
    VOCI.forEach(([k]) => m[k] = media(g.recensioni.map(r => r[k])));
    m.gen = media(VOCI.map(([k]) => m[k]));
    return Object.assign({}, g, { medie: m, n: g.recensioni.length });
  }).sort((a, b) => a.data.localeCompare(b.data));
}

/* ====== FILTRI (uguali su elenco, mappa, calendario) ====== */
function disegnaFiltri(onChange) {
  const sel = name => `<select name="${name}"><option value="">-</option>${[1,2,3,4,5].map(i => `<option value="${i}">≥ ${i}</option>`).join("")}</select>`;
  const campo = (lab, html) => `<label class="campo"><span>${lab}</span>${html}</label>`;
  const box = document.getElementById("filtri");
  box.innerHTML = `
  <form id="ff" class="filtri"><details ${window.innerWidth > 700 ? "open" : ""}>
  <summary>FILTRI (tocca per aprire/chiudere)</summary>
  <div class="riga">
    ${campo("Cerca (nome o luogo)", `<input name="q">`)}
    ${campo("Terreno", `<select name="terreno"><option value="">Tutti</option>${TERRENI.map(t => `<option>${t}</option>`).join("")}</select>`)}
    ${campo("Dal", `<input type="date" name="dal">`)}
    ${campo("Al", `<input type="date" name="al">`)}
    ${campo("Km da", `<input type="number" name="kmMin" min="0">`)}
    ${campo("Km a", `<input type="number" name="kmMax" min="0">`)}
    ${campo("D+ da (m)", `<input type="number" name="dpMin" min="0">`)}
    ${campo("D+ a (m)", `<input type="number" name="dpMax" min="0">`)}
  </div>
  <div class="riga">
    ${campo("Media generale", sel("gen"))}
    ${VOCI.map(([k, t]) => campo(t, sel(k))).join("")}
  </div>
  <p><input type="reset" value="Azzera filtri"></p>
  </details></form>`;
  const f = document.getElementById("ff");
  f.addEventListener("input", onChange);
  f.addEventListener("change", onChange);
  f.addEventListener("reset", () => setTimeout(onChange, 0));
}

function filtra(rows) {
  const f = Object.fromEntries(new FormData(document.getElementById("ff")));
  const num = v => (v === "" || v == null) ? null : Number(v);
  const q = (f.q || "").toLowerCase().trim();
  return rows.filter(r => {
    if (q && !(r.nome + " " + r.luogo).toLowerCase().includes(q)) return false;
    if (f.dal && r.data < f.dal) return false;
    if (f.al && r.data > f.al) return false;
    if (num(f.kmMin) != null && r.km < num(f.kmMin)) return false;
    if (num(f.kmMax) != null && r.km > num(f.kmMax)) return false;
    if (num(f.dpMin) != null && r.dplus < num(f.dpMin)) return false;
    if (num(f.dpMax) != null && r.dplus > num(f.dpMax)) return false;
    if (f.terreno && r.terreno !== f.terreno) return false;
    for (const k of ["gen"].concat(VOCI.map(v => v[0]))) {
      if (f[k] && !(r.medie[k] != null && r.medie[k] >= Number(f[k]))) return false;
    }
    return true;
  });
}

/* ====== DATI DI ESEMPIO (usati solo se API_URL è vuoto) ====== */
const DEMO = { aggiornato: "2026-10-22", gare: [
  { id: "trail-dei-tre-laghi", nome: "Trail dei Tre Laghi (ESEMPIO)", anno: "2026", data: "2026-10-11",
    luogo: "Ivrea, Italia", lat: 45.467, lng: 7.876, km: 42, dplus: 2300, terreno: "Trail", recensioni: [
    { org: 5, bel: 4, seg: 5, ris: 3, loc: 4, atm: 5, commento: "Gara ben organizzata, ristori un po' scarsi dopo il km 30.", inviata: "2026-10-14" },
    { org: 4, bel: 5, seg: 4, ris: 3, loc: 5, atm: 4, commento: "Panorami splendidi sui laghi.", inviata: "2026-10-15" } ] },
  { id: "trail-dei-tre-laghi", nome: "Trail dei Tre Laghi (ESEMPIO)", anno: "2026", data: "2026-10-11",
    luogo: "Ivrea, Italia", lat: 45.467, lng: 7.876, km: 18, dplus: 800, terreno: "Misto", recensioni: [
    { org: 4, bel: 3, seg: 5, ris: 4, loc: 4, atm: 4, commento: "Corta ma divertente.", inviata: "2026-10-12" } ] },
  { id: "trail-dei-tre-laghi", nome: "Trail dei Tre Laghi (ESEMPIO)", anno: "2025", data: "2025-10-12",
    luogo: "Ivrea, Italia", lat: 45.467, lng: 7.876, km: 42, dplus: 2300, terreno: "Trail", recensioni: [
    { org: 3, bel: 4, seg: 2, ris: 3, loc: 4, atm: 4, commento: "Segnaletica da migliorare nel bosco.", inviata: "2025-10-20" } ] },
  { id: "ultra-del-monte", nome: "Ultra del Monte (ESEMPIO)", anno: "2026", data: "2026-08-29",
    luogo: "Chamonix, Francia", lat: 45.923, lng: 6.869, km: 105, dplus: 6500, terreno: "Trail", recensioni: [
    { org: 5, bel: 5, seg: 5, ris: 4, loc: 5, atm: 5, commento: "Un sogno, ma partite piano.", inviata: "2026-09-02" } ] },
  { id: "corsa-della-valle", nome: "Corsa della Valle (ESEMPIO)", anno: "2026", data: "2026-10-04",
    luogo: "Cortina d'Ampezzo, Italia", lat: 46.540, lng: 12.136, km: 21, dplus: 600, terreno: "Strada", recensioni: [
    { org: 3, bel: 4, seg: 4, ris: 2, loc: 5, atm: 3, commento: "", inviata: "2026-10-06" } ] }
]};
