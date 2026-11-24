'use strict';
(()=>{
const DAYS=window.ROUTINE;
const STORE='atleta-hybrid-v1-data';
const emptyData=()=>({version:1,sessions:{},overrides:{},customExercises:[],bodyWeights:[],prefs:{},updatedAt:null});
let data=emptyData();
try {const raw=localStorage.getItem(STORE);if(raw){const saved=JSON.parse(raw);if(saved&&saved.sessions&&typeof saved.sessions==='object')data={...emptyData(),...saved};}}catch(e){console.warn('Storage unavailable',e)}
let today=new Date();
function rotationId() {
  return data.prefs?.rotationId ?? 0;
}

function nextStep() {
  const currentRotation = rotationId();
  return Object.values(data.sessions).reduce((step, s) => {
    if (s.completedAt && s.rotationId === currentRotation && Number.isInteger(s.rotationStep)) {
      return Math.max(step, s.rotationStep + 1);
    }
    return step;
  }, 0);
}

let ui={tab:'home',day:0,sessionKey:null,modal:null,chart:'thu:bench',search:'',expanded:{}};
let timerEnd=0,timerHandle=0,toastHandle=0;
const root=document.querySelector('#app');
const modalRoot=document.querySelector('#modal-root');
const toastEl=document.querySelector('#toast');
const photoBase='https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString('it-IT',{maximumFractionDigits:1});
const num=v=>v===''||v===null||v===undefined?NaN:Number(String(v).replace(',','.'));
const fmtkg=n=>Number.isFinite(n)?String(Math.round(n*10)/10).replace('.',','):'--';
function save(){data.updatedAt=new Date().toISOString();try{localStorage.setItem(STORE,JSON.stringify(data));}catch(e){toast('Memoria piena o non disponibile: esporta i dati');}}
function toast(message){toastEl.textContent=message;toastEl.classList.add('show');clearTimeout(toastHandle);toastHandle=setTimeout(()=>toastEl.classList.remove('show'),2700)}
function monday(offset=0){let dt=new Date(today.getFullYear(),today.getMonth(),today.getDate(),12);dt.setDate(dt.getDate()-((dt.getDay()+6)%7)+7*offset);return dt;}
function keyDate(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function currentSessionKey(dayId) {
  const date = keyDate(today);
  const step = nextStep();
  const entries = Object.entries(data.sessions);
  if (DAYS[step % DAYS.length].id === dayId) {
    const draft = entries.find(([, s]) => !s.completedAt && s.dayId === dayId &&
      s.rotationId === rotationId() && s.rotationStep === step);
    if (draft) return draft[0];
  }
  const draftToday = entries.find(([, s]) => !s.completedAt && s.dayId === dayId && s.date === date &&
    s.rotationStep == null);
  if (draftToday) return draftToday[0];

  const base = date + ':' + dayId;
  let key = base;
  for (let suffix = 2; data.sessions[key]; suffix++) key = base + ':' + suffix;
  return key;
}

function viewDate() {
  return session(DAYS[ui.day].id)?.date ?? keyDate(today);
}

function selectNextWorkout() {
  ui.day = nextStep() % DAYS.length;
  ui.sessionKey = null;
}
function humanDate(d,short=false){return d.toLocaleDateString('it-IT',short?{day:'2-digit',month:'short'}:{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function session(dayId, create = false) {
  const key = ui.sessionKey ?? currentSessionKey(dayId);
  if (!data.sessions[key] && create) {
    const step = nextStep();
    const rotation = DAYS[step % DAYS.length].id === dayId
      ? {rotationId: rotationId(), rotationStep: step}
      : {};
    data.sessions[key] = {date: keyDate(today), dayId, records: {}, activities: {}, completedAt: null, ...rotation};
  }
  return data.sessions[key] ?? null;
}
function planItems(day){return [...day.items,...data.customExercises.filter(x=>x.dayId===day.id)].map(item=>({...item,...(data.overrides[day.id+':'+item.id]||{}),key:day.id+':'+item.id})).filter(x=>x.enabled!==false)}
function uniqueExercises(){const set=new Set();const items=[];for(const day of DAYS){for(const ex of planItems(day)){if(!set.has(ex.id)){items.push(ex);set.add(ex.id)}}}return items}
function getHistory(dayId,exId,before=null){return Object.values(data.sessions).filter(s=>s.dayId===dayId&&(!before||s.date<before)&&s.records&&s.records[exId]).sort((a,b)=>b.date.localeCompare(a.date)).map(s=>({date:s.date,sets:s.records[exId],session:s}));}
function loggedSets(s,exId){return (s?.records?.[exId]||[]).filter(x=>x&&x.done)}
function previousWeight(dayId,exId,before){for(const h of getHistory(dayId,exId,before)){const weights=h.sets.filter(x=>x&&x.done&&x.weight!==''&&Number.isFinite(num(x.weight))).map(x=>num(x.weight));if(weights.length)return weights[0];}return null}
function exerciseSet(day,ex,ix,create=false){const s=session(day.id,create);const previous=previousWeight(day.id,ex.id,viewDate());if(!s)return {weight:ex.kind==='bodyweight'?0:ex.kind==='assist'?'':ex.kind==='seconds'?'':(previous??''),reps:'',rir:'',done:false};
 if(!s.records[ex.id]&&create)s.records[ex.id]=[];
 const arr=s.records[ex.id]||[];
 if(!arr[ix]&&create)arr[ix]={weight:ex.kind==='bodyweight'?0:ex.kind==='assist'?'':ex.kind==='seconds'?'':(previous??''),reps:'',rir:'',done:false};
 return arr[ix]||{weight:ex.kind==='bodyweight'?0:ex.kind==='assist'?'':ex.kind==='seconds'?'':(previous??''),reps:'',rir:'',done:false};
}
function adviceFor(day,ex){const hist=getHistory(day.id,ex.id).filter(h=>h.date<=viewDate()&&h.sets.some(x=>x&&x.done));const last=hist[0];if(!last||!last.sets.length||!last.sets.some(x=>x&&x.done))return {state:'neutral',text:'Prima seduta: scegli un carico che lasci 2-3 ripetizioni in riserva.'};
 const done=last.sets.filter(x=>x&&x.done);const goal=ex.sets;
 const weights=done.map(x=>num(x.weight)).filter(x=>Number.isFinite(x));
 const load=weights.length?weights[0]:NaN;
 const all=done.length>=goal&&done.every(x=>Number.isFinite(num(x.reps)));
 const reps=done.map(x=>num(x.reps));
 if(ex.kind==='seconds'||ex.kind==='reps'){if(all&&reps.every(n=>n>=ex.high))return {state:'good',text:'Obiettivo raggiunto: aggiungi qualche secondo o controlla meglio il movimento.'};return {state:'neutral',text:'Continua fino al limite alto del range, senza perdere la tecnica.'};}
 if(all&&reps.every(n=>n>=ex.high)){
   if(ex.kind==='bodyweight')return {state:'good',text:'Range completato: prova una variante più difficile o poco peso aggiunto.'};
   const rirs=done.map(x=>num(x.rir));const validRir=rirs.every(x=>Number.isFinite(x));
   if(ex.kind==='assist')return {state:'good',text:validRir&&rirs.every(x=>x>=2)&&Number.isFinite(load)&&load>0?'Prossima volta: riduci assistenza a '+fmtkg(Math.max(0,load-ex.inc))+' kg.':'Range completo: se restano almeno 2 ripetizioni, riduci l assistenza.'};
   if(validRir&&rirs.every(x=>x>=2)&&Number.isFinite(load)&&weights.length===done.length&&weights.every(w=>w===load))return {state:'good',text:'Pronto a salire: da '+fmtkg(load)+' a '+fmtkg(load+ex.inc)+' kg (+ '+fmtkg(ex.inc)+' kg).'};
   return {state:'warn',text:'Range massimo raggiunto. Se avevi almeno 2 RIR, aumenta di '+fmtkg(ex.inc)+' kg. Registra il RIR.'};
 }
 if(all&&reps.every(n=>n<ex.low))return {state:'warn',text:'Sotto il range previsto: valuta -2,5/5% di carico e migliora il recupero.'};
 if(Number.isFinite(load)){return {state:'neutral',text:'Mantieni '+fmtkg(load)+' kg: prima punta al limite alto ('+ex.high+' rep) in tutte le serie.'};}
 return {state:'neutral',text:'Completa tutte le serie con tecnica stabile, poi aumenta il carico.'};
}
function progressOf(day,s){const items=planItems(day);const target=items.reduce((a,e)=>a+e.sets,0)+day.activities.length;const completed=items.reduce((a,e)=>a+Math.min(e.sets,loggedSets(s,e.id).length),0)+day.activities.filter(a=>s?.activities?.[a.id]?.done).length;return {target,completed,pct:target?Math.round(completed/target*100):0};}
function icon(name,size=''){const paths={
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
 dumbbell:'<path d="m6.5 6.5 11 11M4 8.5 8.5 4M2.5 7 7 2.5M15.5 20 20 15.5M17 21.5l4.5-4.5M8 4l12 12"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 chart:'<path d="M3 3v18h18"/><path d="m6 16 5-5 4 3 5-7"/>',
 book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z"/>',
 settings:'<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/><circle cx="12" cy="12" r="5"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 arrow:'<path d="m9 18 6-6-6-6"/>',
 left:'<path d="m15 18-6-6 6-6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
 photo:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 run:'<circle cx="14" cy="4" r="2"/><path d="m7 21 5-5-2-3-4 2M4 12l5-3 3 2 4-1 4 3M13 21l1-5"/>',
 boxing:'<path d="M6 12V9a4 4 0 0 1 8 0v2h2a4 4 0 0 1 4 4v3a3 3 0 0 1-3 3H9a5 5 0 0 1-5-5v-4h2Z"/><path d="M7 20v-4"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 18v3h16v-3"/>',
 upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4"/>',
 share:'<path d="M12 15V3m-4 4 4-4 4 4M5 13v7h14v-7"/>',
 edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
 close:'<path d="M5 5l14 14M19 5 5 19"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 activity:'<path d="M3 12h4l3-7 4 14 3-7h4"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v8M14 10v8"/>',
 shield:'<path d="m12 22-8-4V6l8-4 8 4v12Z"/><path d="m9 12 2 2 4-4"/>',
};return `<svg class="icon ${size}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.target}</svg>`}
function imageUrl(ex,ix=0){return ex.photo?photoBase+ex.photo+'/'+ix+'.jpg':''}
function imageThumb(ex){return ex.photo?`<img loading="lazy" alt="Foto di ${E(ex.name)}" src="${E(imageUrl(ex))}">`:`<div class="phfallback">${icon('dumbbell','icon-lg')}</div>`}
function nav() {
  const tabs = [
    ['home', 'home', 'Home'],
    ['train', 'dumbbell', 'Scheda'],
    ['progress', 'chart', 'Progressi'],
    ['data', 'settings', 'Dati'],
  ];
  return `<nav class="bottom-nav" aria-label="Menu principale">${tabs.map(([tab, glyph, label]) =>
    `<button class="navbtn${ui.tab === tab ? ' active' : ''}" data-action="tab" data-tab="${tab}" ${ui.tab === tab ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></button>`
  ).join('')}</nav>`;
}

function head() {
  return `<header class="topbar"><div class="brand"><div class="logo" aria-hidden="true">BG</div><div class="brandtitle">Bozzi Gym</div></div></header>`;
}

function renderHome() {
  const workout = DAYS[nextStep() % DAYS.length];
  const shortcuts = [
    ['week', 'calendar', 'Il tuo ciclo', 'Ordine delle sedute e storico'],
    ['progress', 'chart', 'Progressi', 'Grafici e storico'],
    ['library', 'book', 'Esercizi', 'Foto e tecnica'],
    ['data', 'settings', 'I tuoi dati', 'Personalizzazione e backup'],
  ];
  return `<div class="page home">
    <section class="home-workout" aria-labelledby="home-heading">
      <div class="home-plate" aria-hidden="true"></div>
      <div class="home-workout-copy">
        <p class="home-kicker">Prossima seduta</p>
        <h1 id="home-heading">${E(workout.title)}</h1>
        <p class="home-workout-meta"><span>${E(workout.name)}</span><span>${icon('clock', 'icon-sm')}${E(workout.duration)}</span></p>
        <button class="btn primary home-start" data-action="today-workout">Apri scheda ${icon('arrow', 'icon-sm')}</button>
      </div>
    </section>
    <section class="home-shortcuts" aria-labelledby="shortcuts-heading">
      <h2 id="shortcuts-heading">Esplora</h2>
      <div class="home-grid">
        ${shortcuts.map(([tab, glyph, label, description]) => `<button class="home-tile" data-action="tab" data-tab="${tab}">
          <span class="home-tile-icon">${icon(glyph)}</span>
          ${icon('arrow', 'home-tile-arrow')}
          <strong>${label}</strong>
          <span class="home-tile-description">${description}</span>
        </button>`).join('')}
      </div>
    </section>
  </div>`;
}

function cycleStrip() {
  const next = nextStep() % DAYS.length;
  return `<div class="weekbar">${DAYS.map((day, i) =>
    `<button class="daychip${i === ui.day && !ui.sessionKey ? ' active' : ''}${i < next ? ' logged' : ''}" data-action="day" data-day="${i}" aria-label="${E(day.name + ' · ' + day.title)}" ${i === ui.day && !ui.sessionKey ? 'aria-pressed="true"' : 'aria-pressed="false"'}><span class="dlabel">SEDUTA</span><span class="date">${i + 1}</span><span class="dot"></span></button>`
  ).join('')}</div>`;
}
function simpleStat(value,label){return `<div class="stat"><div class="value">${value}</div><div class="label">${label}</div></div>`}
function sectionTitle(title,extra=''){return `<div class="section-title"><h2>${title}</h2>${extra}</div>`}
function renderTrain() {
  const day = DAYS[ui.day], s = session(day.id);
  const next = nextStep() % DAYS.length;
  return `<div class="page">
    <div class="week-summary"><h1>Allenamento</h1><span>${next}/${DAYS.length} nel ciclo</span></div>
    ${cycleStrip()}
    ${ui.sessionKey || ui.day !== next ? '<button class="btn btn-sm btn-outline" data-action="today-workout">Vai alla prossima seduta</button>' : ''}
    <div id="workout-start">${renderDay(day, s, progressOf(day, s))}</div>
  </div>`;
}
function renderDay(day,s,p){const date=new Date(viewDate()+'T12:00:00');return `<div class="day-hero ${day.id}"><div class="category">${E(day.name)} · ${E(humanDate(date,true))}</div><h1>${E(day.title)}</h1><div class="day-meta"><span>${E(day.duration)}</span><span>${p.completed}/${p.target} completati</span></div><div class="meter"><div style="width:${Math.min(100,p.pct)}%"></div></div></div><details class="warmup compact"><summary>Riscaldamento</summary><p>${E(day.warmup)}</p></details>${sectionTitle('Esercizi',`<span class="count">${planItems(day).length}</span>`)}<div class="exercise-grid">${planItems(day).map(ex=>renderExercise(day,ex,s)).join('')}</div>${day.activities.length?sectionTitle('Cardio e boxe'):''}<div class="exercise-grid">${day.activities.map(a=>renderActivity(day,a,s)).join('')}</div><details class="card cardpad session-notes" style="margin-top:16px" ${s?.notes||s?.fatigue?'open':''}><summary>Fatica e note (facoltativo)</summary><div class="formgroup"><label for="session-fatigue">Fatica da 1 a 10</label><input id="session-fatigue" class="search" type="number" inputmode="numeric" min="1" max="10" placeholder="Da 1 a 10" value="${E(s?.fatigue||'')}" data-input="session" data-field="fatigue"></div><div class="formgroup"><label for="session-note">Note</label><textarea id="session-note" class="search" maxlength="500" placeholder="Come è andata?" data-input="session" data-field="notes">${E(s?.notes||'')}</textarea></div></details><div class="completion"><button class="btn ${s?.completedAt?'soft':'primary'}" data-action="complete-session">${icon('check')} ${s?.completedAt?'Seduta salvata · riapri':'Termina allenamento'}</button><p>Le serie sono salvate automaticamente.</p></div></div>`}
function renderExercise(day,ex,s){const completed=loggedSets(s,ex.id).length;
 const advise=adviceFor(day,ex);const isTime=ex.kind==='seconds';const isBW=ex.kind==='bodyweight';const repsTitle=isTime?'Secondi':'Rip.';
 const weightTitle=isTime?'--':ex.kind==='assist'?'Assist. kg':isBW?'kg extra':'Kg';
 const setrows=Array.from({length:ex.sets},(_,i)=>{const row=exerciseSet(day,ex,i);return `<div class="setrow"><span class="setnumber">${i+1}</span>${isTime?`<div class="field" style="background:transparent;border-color:transparent;min-height:30px;color:var(--muted)">-</div>`:`<input class="field" inputmode="decimal" type="number" step="0.5" min="0" placeholder="kg" value="${E(row.weight)}" data-input="set" data-ex="${E(ex.id)}" data-field="weight" data-index="${i}" aria-label="Peso serie ${i+1} ${E(ex.name)}">`}<input class="field" type="number" inputmode="numeric" min="0" max="999" placeholder="${isTime?'s':'rep'}" value="${E(row.reps)}" data-input="set" data-ex="${E(ex.id)}" data-field="reps" data-index="${i}" aria-label="Ripetizioni serie ${i+1} ${E(ex.name)}"><input class="field" type="number" inputmode="numeric" min="0" max="10" placeholder="--" value="${E(row.rir)}" data-input="set" data-ex="${E(ex.id)}" data-field="rir" data-index="${i}" aria-label="RIR serie ${i+1}"><button class="checkset ${row.done?'checked':''}" data-action="toggle-set" data-ex="${E(ex.id)}" data-index="${i}" aria-label="${row.done?'Deseleziona':'Completa'} serie ${i+1}">${icon('check','icon-sm')}</button></div>`}).join('');
 const formatTarget=`${ex.sets} x ${ex.low}${ex.high!==ex.low?'-'+ex.high:''}${isTime?' s':''}`;
 const expanded=ui.expanded[day.id+':'+ex.id]??false;
 return `<article class="card exercise ${completed>=ex.sets?'done':''}" id="exercise-${E(day.id)}-${E(ex.id)}"><button class="exercise-summary" data-action="expand-ex" data-ex="${E(ex.id)}" aria-expanded="${expanded}"><div class="eximg">${imageThumb(ex)}</div><div class="exinfo"><h3>${E(ex.name)}</h3><div class="exsmall">${formatTarget} · ${Math.round(ex.rest)} s recupero</div></div><span class="set-count ${completed>=ex.sets?'finished':''}">${completed>=ex.sets?icon('check','icon-sm'):Math.min(completed,ex.sets)+'/'+ex.sets}</span><span class="expand-symbol">${expanded?'−':'+'}</span></button>${expanded?`<div class="exercise-details"><div class="exactions"><button class="btn btn-sm btn-outline" data-action="open-tech" data-ex="${E(ex.id)}" data-dayid="${E(day.id)}">${icon('photo','icon-sm')} Foto e tecnica</button><button class="btn btn-sm btn-outline" data-action="open-edit" data-ex="${E(ex.id)}" data-dayid="${E(day.id)}" title="Modifica esercizio">${icon('edit','icon-sm')} Modifica</button></div><div class="sethead"><span>#</span><span class="labelcenter">${E(weightTitle)}</span><span class="labelcenter">${repsTitle}</span><span class="labelcenter">RIR</span><span></span></div>${setrows}<div class="unitnote">${ex.kind==='assist'?'0 kg = senza assistenza.':isBW?'0 kg = corpo libero.':isTime?'Registra i secondi tenuti.':'Manubri: kg di un manubrio.'} RIR = ripetizioni ancora possibili.</div><div class="exfooter"><span class="hint ${advise.state==='warn'?'caution':''}">${E(advise.text)}</span><button class="timerbtn" data-action="timer" data-seconds="${ex.rest}">${icon('clock','icon-sm')} Timer ${ex.rest}s</button></div></div>`:''}</article>`}
function renderActivity(day,a,s){const x=s?.activities?.[a.id]||{};const run=a.kind==='run';const val=(k,def='')=>x[k]??def;return `<article class="card activity ${day.id}"><div class="acticon">${icon(run?'run':'boxing','icon-lg')}</div><div class="actbody"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><strong>${E(a.name)}</strong><span class="pill">${E(a.target)}</span></div><p>${E(a.desc)}</p><div class="actfields"><label><span class="fieldlabel">${run?'Minuti':'Round'}</span><input class="field" type="number" inputmode="decimal" min="0" value="${E(val(run?'minutes':'rounds',run?a.minutes:a.rounds))}" data-input="activity" data-id="${E(a.id)}" data-field="${run?'minutes':'rounds'}"></label><label><span class="fieldlabel">${run?'Km percorsi':'Min./round'}</span><input class="field" type="number" inputmode="decimal" step="0.1" min="0" value="${E(val(run?'distance':'roundMinutes',run?'':a.roundMinutes))}" data-input="activity" data-id="${E(a.id)}" data-field="${run?'distance':'roundMinutes'}" placeholder="${run?'km':'min'}"></label><label><span class="fieldlabel">Fat. 1-10</span><input class="field" type="number" inputmode="numeric" min="1" max="10" value="${E(val('rpe'))}" data-input="activity" data-id="${E(a.id)}" data-field="rpe" placeholder="--"></label></div><div class="actfooter"><small class="muted">${run?'Ritmo facile':'Boxe tecnica'}</small><button class="toggle-btn ${x.done?'is-done':''}" data-action="toggle-act" data-id="${E(a.id)}">${icon('check','icon-sm')} ${x.done?'Fatto':'Segna fatto'}</button></div></div></article>`}
function renderWeek() {
  const next = nextStep() % DAYS.length;
  const history = Object.entries(data.sessions).reverse().sort(([, a], [, b]) => b.date.localeCompare(a.date));
  return `<div class="page">
    <h1>Il tuo ciclo</h1>
    <p class="muted text-sm" style="margin:9px 0 16px">Se salti un giorno, riprendi dalla stessa seduta quando torni.</p>
    ${DAYS.map((day, i) => `<button class="overviewday ${day.id}" data-action="day" data-day="${i}">
      <span class="daymonogram">${i + 1}</span>
      <span class="details"><strong>${E(day.title)}</strong><span>${i === next ? 'Prossima seduta' : E(day.focus)}</span></span>
      <span class="checkbadge">${i < next ? icon('check') : ''}</span>
    </button>`).join('')}
    <button class="btn btn-outline btnfull" data-action="restart-cycle">Riparti dalla seduta 1</button>
    <details class="card cardpad" style="margin-top:12px"><summary>Storico sedute</summary>
      <div style="margin-top:12px">${history.map(([key, s]) => {
        const day = DAYS.find(item => item.id === s.dayId);
        if (!day) return '';
        return `<button class="overviewday ${day.id}" data-action="open-session" data-key="${E(key)}">
          <span class="details"><strong>${E(day.title)}</strong><span>${E(humanDate(new Date(s.date + 'T12:00:00'), true))} · ${s.completedAt ? 'Completata' : 'Da terminare'}</span></span>
        </button>`;
      }).join('') || '<p class="muted text-sm">Nessuna seduta registrata.</p>'}</div>
    </details>
    <div class="card cardpad" style="margin-top:12px"><h3>Progressione del programma</h3><div class="timeline" style="margin-top:9px"><div class="timelineitem"><strong>Cicli 1-2</strong><span>2-3 RIR, conosci i carichi</span></div><div class="timelineitem"><strong>Cicli 3-6</strong><span>Aumenta ripetizioni e poi peso</span></div><div class="timelineitem"><strong>Ciclo 7</strong><span>Scarico: circa metà delle serie</span></div><div class="timelineitem"><strong>Ciclo 8</strong><span>Controlla progressi e 5 km</span></div></div></div>
  </div>`;
}
function completedSessions(){return Object.values(data.sessions).filter(s=>s.completedAt).sort((a,b)=>b.date.localeCompare(a.date));}
function weekBars(){const entries=Array.from({length:8},(_,i)=>{const d=monday(i-7),start=keyDate(d);d.setDate(d.getDate()+6);const end=keyDate(d);return {label:'S'+(i+1),count:Object.values(data.sessions).filter(s=>s.completedAt&&s.date>=start&&s.date<=end).length}});return `<div class="card cardpad"><h3>Allenamenti - ultime 8 settimane</h3><p class="muted text-xs" style="margin:3px 0 12px">Ogni barra rappresenta una settimana.</p>${entries.map(r=>`<div class="barline"><div class="barlabel">${r.label}</div><div class="bar"><b style="width:${Math.min(100,r.count*20)}%"></b></div><div class="barval">${r.count}</div></div>`).join('')}</div>`}
function chartEntries(dayId,exId){return getHistory(dayId,exId).slice().reverse().map(r=>{const sets=r.sets.filter(s=>s&&s.done);const weights=sets.map(s=>num(s.weight)).filter(Number.isFinite);return {date:r.date,load:weights.length?Math.max(...weights):NaN,reps:sets.map(s=>s.reps).join('/'),sets:sets.length}}).filter(x=>Number.isFinite(x.load))}
function drawChart(entries){if(!entries.length)return `<div class="empty">Nessun peso registrato per questo esercizio. Spunta qualche serie per iniziare il grafico.</div>`;
 const recent=entries.slice(-10),vals=recent.map(x=>x.load);let lo=Math.min(...vals),hi=Math.max(...vals);if(lo===hi){lo=Math.max(0,lo-2.5);hi+=2.5};let diff=hi-lo;lo=Math.max(0,lo-diff*.17);hi+=diff*.17;diff=hi-lo;
 const left=36,top=13,W=340,H=158,plotW=288,plotH=115;
 const pt=recent.map((e,i)=>({x:left+(recent.length===1?.5:i/(recent.length-1))*plotW,y:top+(hi-e.load)/diff*plotH,value:e.load,date:e.date}));
 const line=pt.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
 const ylabels=[0,.5,1].map(f=>{const val=(hi-f*diff).toFixed(1);const y=top+f*plotH;return `<line x1="${left}" y1="${y}" x2="${left+plotW}" y2="${y}" stroke="#484a50" stroke-dasharray="3 5"/><text x="${left-6}" y="${y+4}" font-size="9" text-anchor="end" fill="#b5b6be">${val}</text>`}).join('');
 return `<div class="graphbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafico dei pesi nel tempo">${ylabels}<polyline points="${line}" fill="none" stroke="var(--mint)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${pt.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--mint)" stroke="#18191c" stroke-width="1.5"/>`).join('')}</svg><div class="legend"><span>${recent[0].date}</span><span>Peso serie, kg</span><span>${recent[recent.length-1].date}</span></div></div>`}
function renderProgress(){const done=completedSessions();const exerciseOptions=DAYS.flatMap(day=>planItems(day).filter(ex=>ex.kind!=='seconds').map(ex=>({value:day.id+':'+ex.id,label:day.short+' / '+ex.name})));if(!exerciseOptions.some(x=>x.value===ui.chart))ui.chart=exerciseOptions[0]?.value||'';
 const [dKey,...parts]=ui.chart.split(':'),exId=parts.join(':');const day=DAYS.find(x=>x.id===dKey)||DAYS[0];const ex=planItems(day).find(x=>x.id===exId);const hist=ex?getHistory(day.id,ex.id):[];const entries=ex?chartEntries(day.id,ex.id):[];
 const w=data.bodyWeights.length?data.bodyWeights.slice().sort((a,b)=>b.date.localeCompare(a.date))[0]:null;
 const totalSets=Object.values(data.sessions).reduce((sum,s)=>sum+Object.values(s.records||{}).reduce((n,arr)=>n+arr.filter(x=>x&&x.done).length,0),0);
 const runEntries=Object.values(data.sessions).filter(s=>s.activities).flatMap(s=>Object.entries(s.activities).filter(([k,v])=>k.startsWith('run-')&&v.done).map(([k,v])=>({date:s.date,minutes:v.minutes,distance:v.distance}))).sort((a,b)=>b.date.localeCompare(a.date));
 return `<div class="page"><div class="eyebrow">LA TUA CRESCITA</div><h1>I tuoi progressi</h1><p class="muted text-sm" style="margin-top:8px">Grafici e storico si aggiornano quando registri le serie.</p><div class="stats">${simpleStat(done.length,'Sedute concluse')}${simpleStat(totalSets,'Serie completate')}${simpleStat(w?fmtkg(num(w.kg))+'<span class="small"> kg</span>':'—','Peso corporeo')}</div>${sectionTitle('Storico dei carichi')}<div class="card cardpad"><label class="fieldlabel" for="chart-select">Scegli esercizio</label><select id="chart-select" class="search" data-action="chart-select">${exerciseOptions.map(o=>`<option value="${E(o.value)}" ${ui.chart===o.value?'selected':''}>${E(o.label)}</option>`).join('')}</select><div style="margin-top:13px" id="chart-content">${drawChart(entries)}</div><div class="timeline" style="margin-top:14px">${hist.slice(0,5).map(h=>{const arr=h.sets.filter(s=>s&&s.done);return `<div class="timelineitem"><span>${h.date}</span><strong>${E(arr.map(s=>`${s.weight||'0'}kg x ${s.reps||'?'}r`).join(' / ')||'Nessuna serie')}</strong></div>`}).join('')||'<p class="muted text-xs">Nessuna serie ancora registrata.</p>'}</div>${ex?`<div class="warmup" style="margin-bottom:0">${icon('target')}<span class="text-xs"><strong>Suggerimento: </strong>${E(adviceFor(day,ex).text)}</span></div>`:''}</div>${sectionTitle('Frequenza')}${weekBars()}${sectionTitle('Peso corporeo')}<div class="card cardpad"><p class="muted text-xs">Annota il peso preferibilmente al mattino, nelle stesse condizioni.</p><div class="formgroup"><label for="bodyweight">Peso attuale (kg)</label><div style="display:flex;gap:9px"><input id="bodyweight" class="search" style="flex:1;min-width:0" type="number" inputmode="decimal" step="0.1" min="20" max="300" placeholder="kg"><button class="btn primary" data-action="save-weight">${icon('plus')} Aggiungi</button></div></div><div class="timeline">${data.bodyWeights.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(v=>`<div class="timelineitem"><span>${E(v.date)}</span><strong>${fmtkg(num(v.kg))} kg</strong></div>`).join('')||'<p class="muted text-xs">Nessuna pesata registrata.</p>'}</div></div>${runEntries.length?`${sectionTitle('Ultime corse')}<div class="card cardpad timeline">${runEntries.slice(0,5).map(r=>`<div class="timelineitem"><span>${r.date}</span><strong>${E(r.minutes||'?')} min ${r.distance?' / '+E(r.distance)+' km':''}</strong></div>`).join('')}</div>`:''}</div>`}
function renderLibraryList(search){const words=search.toLowerCase().trim();const all=uniqueExercises().filter(x=>(x.name+' '+x.group).toLowerCase().includes(words));return all.map(ex=>{const day=DAYS.find(d=>planItems(d).some(e=>e.id===ex.id));return `<button class="libitem" data-action="open-tech" data-dayid="${day.id}" data-ex="${E(ex.id)}"><div class="eximg" style="width:62px;height:62px">${imageThumb(ex)}</div><div class="libtext"><strong>${E(ex.name)}</strong><small>${E(ex.group)} / ${ex.sets} serie / ${ex.low}-${ex.high}${ex.kind==='seconds'?' s':' rep'}</small></div>${icon('arrow')}</button>`}).join('')||'<div class="empty">Nessun esercizio trovato.</div>'}
function renderLibrary(){return `<div class="page"><div class="eyebrow">COME ESEGUIRLI</div><h1>Biblioteca esercizi</h1><p class="muted text-sm" style="margin-top:9px">Apri una scheda per vedere due fotografie e consigli di esecuzione.</p><div class="library-filters"><input type="search" class="search" id="search-lib" placeholder="Cerca panca, trazioni, gambe..." value="${E(ui.search)}" autocomplete="off" aria-label="Cerca esercizi"></div><div id="library-results" class="lib-grid">${renderLibraryList(ui.search)}</div><p class="attribution">Fotografie: <a target="_blank" rel="noopener noreferrer" href="https://github.com/yuhonas/free-exercise-db">free-exercise-db</a> (Unlicense). Le immagini di alcune varianti possono differire: leggi sempre la nota nell'esercizio.</p></div>`}
function renderData(){const hidden=DAYS.flatMap(d=>[...d.items,...data.customExercises.filter(x=>x.dayId===d.id)].filter(ex=>data.overrides[d.id+':'+ex.id]?.enabled===false).map(ex=>({key:d.id+':'+ex.id,name:ex.name,day:d.name})));return `<div class="page"><div class="eyebrow">CONTROLLO E BACKUP</div><h1>I tuoi dati</h1><p class="muted text-sm" style="margin:9px 0 19px">Tutto rimane su questo dispositivo, senza account e senza sincronizzazione automatica.</p><div class="card cardpad"><h3>Analizzali con ChatGPT</h3><p class="muted text-xs" style="margin:7px 0 14px">Esporta lo storico in JSON e carica il file nella nostra chat. Posso valutare carichi, volume, recupero e modifiche da fare. In alternativa copia il riepilogo e incollalo.</p><div class="settingsactions"><button class="btn primary" data-action="export-json">${icon('download')} Backup JSON</button><button class="btn soft" data-action="copy-report">${icon('share')} Copia report</button><button class="btn soft" data-action="export-csv">${icon('download')} Storico CSV</button><button class="btn soft" data-action="share-report">${icon('share')} Condividi report</button></div></div><div class="card cardpad" style="margin-top:12px"><h3>Importa un backup</h3><p class="muted text-xs" style="margin:7px 0 13px">Sostituisce lo storico attuale con quello del file JSON. Fai un backup prima di importare.</p><button class="btn soft btnfull" data-action="import-json">${icon('upload')} Seleziona un file JSON</button><input id="import-input" class="hide" type="file" accept=".json,application/json"></div><div class="card cardpad" style="margin-top:12px"><h3>Personalizza la scheda</h3><p class="muted text-xs" style="margin:7px 0 13px">Nella scheda di allenamento tocca l'icona della matita per cambiare serie, ripetizioni, recupero o incremento dei pesi di ogni esercizio.</p><button class="btn soft btnfull" data-action="add-custom">${icon('plus')} Aggiungi esercizio personalizzato</button><button class="btn btn-outline btnfull" data-action="restore-plan" style="margin-top:8px">Ripristina la scheda originale</button>${hidden.length?`<div style="margin-top:14px"><p class="muted text-xs" style="margin-bottom:7px">Esercizi nascosti:</p>${hidden.map(x=>`<button class="btn btn-sm soft" style="margin:3px 5px 3px 0" data-action="reenable" data-key="${E(x.key)}">${icon('plus','icon-sm')} ${E(x.day)} / ${E(x.name)}</button>`).join('')}</div>`:''}</div><div class="card cardpad" style="margin-top:12px"><h3>Come installare su iPhone</h3><p class="muted text-xs" style="margin-top:8px">1. Pubblica la cartella del sito su un indirizzo HTTPS (per esempio GitHub Pages).<br>2. Apri quel link in <strong>Safari</strong> su iPhone.<br>3. Tocca <strong>Condividi &gt; Aggiungi alla schermata Home</strong>, attiva <strong>Apri come app</strong> e conferma.</p></div><div class="card cardpad" style="margin-top:12px"><h3>Conservazione dei dati</h3><p class="muted text-xs" style="margin-top:8px">I log sono salvati localmente nel browser/app. Se cancelli i dati di Safari, cambi telefono o usi un altro indirizzo del sito, potrebbero non essere disponibili. Esporta regolarmente il backup JSON e conservalo in File/iCloud.</p><button class="btn danger btnfull" data-action="reset-data" style="margin-top:13px">${icon('trash')} Cancella tutti i dati</button></div><p class="attribution">Progetto personale offline-first. Foto esercizi: <a target="_blank" rel="noopener noreferrer" href="https://github.com/yuhonas/free-exercise-db">yuhonas/free-exercise-db</a> (Unlicense). Versione 2.0.</p></div>`}
function lookupExercise(dayId,exId){const day=DAYS.find(d=>d.id===dayId);const ex=day&&planItems(day).find(e=>e.id===exId);return {day,ex}}
function modalTech(day,ex){const makePhoto=i=>`<div class="photo">${ex.photo?`<img src="${E(imageUrl(ex,i))}" alt="${E(ex.name)} posizione ${i+1}">`:`<div class="photo-fallback">Foto non disponibile</div>`}<div class="photo-label">POSIZIONE ${i+1}</div></div>`;return `<div class="modalback" data-action="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="Tecnica ${E(ex.name)}"><div class="modal-top"><div><div class="eyebrow">TECNICA / ${E(ex.group)}</div><h2>${E(ex.name)}</h2><p class="muted text-xs" style="margin-top:5px">${ex.sets} x ${ex.low}-${ex.high} / Recupero ${ex.rest}s</p></div><button data-action="close-modal" aria-label="Chiudi">${icon('close')}</button></div><div class="photos">${makePhoto(0)}${makePhoto(1)}</div><h3>Come eseguirlo</h3><ol class="techlist">${ex.tips.map(t=>`<li>${E(t)}</li>`).join('')}</ol>${ex.alt?`<div class="techwarning">${icon('info','icon-sm')} ${E(ex.alt)}</div>`:''}<div class="warmup" style="margin:13px 0">${icon('clock')}<span class="text-xs">Recupero: <strong>${ex.rest} secondi</strong>. Interrompi la serie se perdi la tecnica.</span></div><button class="btn primary btnfull" data-action="open-edit" data-dayid="${E(day.id)}" data-ex="${E(ex.id)}">${icon('edit')} Cambia serie, range o recupero</button><p class="attribution">Foto da free-exercise-db / Unlicense. Riferimenti visivi, non sostituiscono la correzione tecnica di un istruttore.</p></div></div>`}
function modalEdit(day,ex){return `<div class="modalback" data-action="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="Modifica ${E(ex.name)}"><div class="modal-top"><div><div class="eyebrow">PERSONALIZZA L'ALLENAMENTO</div><h2>${E(ex.name)}</h2><p class="muted text-xs" style="margin-top:5px">Modifica solo se necessario, senza sacrificare il recupero.</p></div><button data-action="close-modal" aria-label="Chiudi">${icon('close')}</button></div><div class="formgroup"><label for="edit-sets">Serie</label><input id="edit-sets" class="search" type="number" min="1" max="8" value="${ex.sets}"></div><div class="two-col"><div class="formgroup"><label for="edit-low">Ripetizioni minime</label><input id="edit-low" class="search" type="number" min="1" max="100" value="${ex.low}"></div><div class="formgroup"><label for="edit-high">Ripetizioni massime</label><input id="edit-high" class="search" type="number" min="1" max="100" value="${ex.high}"></div></div><div class="two-col"><div class="formgroup"><label for="edit-rest">Recupero in secondi</label><input id="edit-rest" class="search" type="number" min="30" max="600" step="15" value="${ex.rest}"></div><div class="formgroup"><label for="edit-inc">Incremento carico (kg)</label><input id="edit-inc" class="search" type="number" min="0" max="20" step="0.5" value="${ex.inc}"></div></div><div class="formgroup"><label style="display:flex;align-items:center;gap:10px"><input id="edit-enabled" type="checkbox" checked style="width:18px;height:18px"> Esercizio attivo nella scheda</label></div><button class="btn primary btnfull" data-action="save-edit" data-dayid="${E(day.id)}" data-ex="${E(ex.id)}">${icon('check')} Salva modifiche</button><p class="helptext">I cambiamenti si applicano alle sedute successive e non cancellano lo storico.</p></div></div>`}
function modalCustom(){return `<div class="modalback" data-action="backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="Aggiungi esercizio"><div class="modal-top"><div><div class="eyebrow">ESERCIZIO PERSONALE</div><h2>Aggiungi esercizio</h2></div><button data-action="close-modal" aria-label="Chiudi">${icon('close')}</button></div><div class="formgroup"><label for="custom-name">Nome esercizio</label><input id="custom-name" class="search" maxlength="80" placeholder="Es. Farmer walk"></div><div class="formgroup"><label for="custom-day">Seduta</label><select id="custom-day" class="search">${DAYS.map(d=>`<option value="${d.id}">${d.name} - ${d.title}</option>`).join('')}</select></div><div class="two-col"><div class="formgroup"><label for="custom-sets">Serie</label><input id="custom-sets" class="search" type="number" min="1" max="8" value="3"></div><div class="formgroup"><label for="custom-rest">Recupero (s)</label><input id="custom-rest" class="search" type="number" min="30" max="600" value="90"></div></div><div class="two-col"><div class="formgroup"><label for="custom-low">Min rep</label><input id="custom-low" class="search" type="number" min="1" max="100" value="8"></div><div class="formgroup"><label for="custom-high">Max rep</label><input id="custom-high" class="search" type="number" min="1" max="100" value="12"></div></div><button class="btn primary btnfull" data-action="save-custom">${icon('plus')} Aggiungi alla scheda</button></div></div>`}
function showModal(){if(!ui.modal){modalRoot.innerHTML='';document.body.style.overflow='';return}let html='';if(ui.modal.mode==='custom')html=modalCustom();else{const {day,ex}=lookupExercise(ui.modal.dayId,ui.modal.exId);if(!ex){ui.modal=null;return showModal()}html=ui.modal.mode==='edit'?modalEdit(day,ex):modalTech(day,ex)}modalRoot.innerHTML=html;document.body.style.overflow='hidden';}
function render(){let output;switch(ui.tab){case 'home':output=renderHome();break;case 'week':output=renderWeek();break;case 'progress':output=renderProgress();break;case 'library':output=renderLibrary();break;case 'data':output=renderData();break;default:output=renderTrain()};root.innerHTML=head()+`<main id="main-content" tabindex="-1">${output}</main>`+nav();showModal();}
function updateWithoutJump(){const oldY=window.scrollY;render();requestAnimationFrame(()=>window.scrollTo({top:oldY,behavior:'instant'}));}
function downloadFile(filename,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function backupFile(){const content={app:'Bozzi Gym',schema:1,exportedAt:new Date().toISOString(),profile:window.FIT_BASELINE,data};downloadFile('BozziGym-backup-'+keyDate(new Date())+'.json',JSON.stringify(content,null,2),'application/json;charset=utf-8');toast('Backup JSON creato')}
function csvFile(){const rows=[['data','giorno','tipo','esercizio','serie','kg','ripetizioni_o_secondi','rir','fatto','minuti','km','round']];for(const s of Object.values(data.sessions).sort((a,b)=>a.date.localeCompare(b.date))){const day=DAYS.find(d=>d.id===s.dayId);for(const [id,sets]of Object.entries(s.records||{})){const ex=day?.items.find(x=>x.id===id)||data.customExercises.find(x=>x.id===id);sets.forEach((r,i)=>r&&rows.push([s.date,day?.name||s.dayId,'pesi',ex?.name||id,i+1,r.weight??'',r.reps??'',r.rir??'',r.done?'si':'no','','','']));}for(const [id,r]of Object.entries(s.activities||{})){const act=day?.activities.find(a=>a.id===id);rows.push([s.date,day?.name||s.dayId,'cardio',act?.name||id,'','','','',r.done?'si':'no',r.minutes??'',r.distance??'',r.rounds??'']);}}
const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');downloadFile('BozziGym-storico-'+keyDate(new Date())+'.csv','\ufeff'+csv,'text/csv;charset=utf-8');toast('Storico CSV creato')}
function report(){const cutoff=new Date();cutoff.setDate(cutoff.getDate()-29);const from=keyDate(cutoff);const rec=Object.values(data.sessions).filter(s=>s.date>=from);const completed=rec.filter(s=>s.completedAt);let lines=['BOZZI GYM | REPORT DI ALLENAMENTO','Generato il '+new Date().toLocaleDateString('it-IT'),'Obiettivo: massa e forza.','Ultimi 30 giorni: '+completed.length+' sedute chiuse.',''];
const weight=data.bodyWeights.slice().sort((a,b)=>b.date.localeCompare(a.date))[0];if(weight)lines.push('Ultimo peso corporeo: '+weight.kg+' kg ('+weight.date+')','');
for(const day of DAYS){lines.push(day.name.toUpperCase()+' | '+day.title);for(const ex of planItems(day)){const hist=getHistory(day.id,ex.id).filter(h=>h.date>=from).slice(0,3);if(!hist.length)continue;lines.push('- '+ex.name+' ('+ex.sets+'x'+ex.low+'-'+ex.high+'):');for(const h of hist){const s=h.sets.filter(x=>x&&x.done);lines.push('  '+h.date+' -> '+(s.map(r=>`${r.weight??''} kg x ${r.reps??'?'} rep / RIR ${r.rir??'-'}`).join('; ')||'nessuna serie spuntata'));}lines.push('  Suggerimento automatico: '+adviceFor(day,ex).text);}
 for(const ss of rec.filter(s=>s.dayId===day.id&&(s.notes||s.fatigue)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3))lines.push('  Note '+ss.date+': fatica '+(ss.fatigue||'?')+'/10; '+(ss.notes||'-'));
 for(const a of day.activities){const x=Object.values(data.sessions).filter(s=>s.dayId===day.id&&s.activities?.[a.id]?.done&&s.date>=from).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);for(const s of x){const r=s.activities[a.id];lines.push('- '+a.name+' '+s.date+': '+(r.minutes?`${r.minutes} min, `:'')+(r.distance?`${r.distance} km, `:'')+(r.rounds?`${r.rounds} round, `:'')+'fatica '+(r.rpe||'?')+'/10');}}
 lines.push('');}lines.push('Domande per ChatGPT: 1) Sto progredendo nei carichi? 2) Quando aumentare il peso? 3) I volumi e il recupero sono adatti? 4) Cosa modificare per le prossime 4 settimane?','Nota: suggerimenti indicativi, verificare sempre RIR, tecnica e fatica.');return lines.join('\n')}
async function copyText(txt){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(txt);toast('Report copiato. Incollalo nella chat.');return}}catch(e){}const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();if(ok){toast('Report copiato. Incollalo nella chat.');return}downloadFile('BozziGym-report.txt',txt,'text/plain;charset=utf-8');toast('Report scaricato come TXT')}
async function shareReport(){const content=report();try{if(navigator.share){await navigator.share({title:'Bozzi Gym - Report allenamento',text:content});return}}catch(e){if(e.name==='AbortError')return;}await copyText(content)}
function showTimer(){const pill=document.getElementById('timer-pill');const remaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));if(!timerEnd){pill.hidden=true;return}pill.hidden=false;const mm=String(Math.floor(remaining/60)).padStart(2,'0'),ss=String(remaining%60).padStart(2,'0');pill.innerHTML=`<div class="timerrow"><div><div class="timerlabel">TEMPO DI RECUPERO</div><div class="time">${mm}:${ss}</div></div><button data-action="cancel-timer" aria-label="Ferma timer">${icon('close')}</button></div>`;if(remaining<=0){clearInterval(timerHandle);timerEnd=0;setTimeout(()=>{pill.hidden=true;toast('Recupero terminato');if(navigator.vibrate)navigator.vibrate(180)},300)}}
function startTimer(seconds){timerEnd=Date.now()+seconds*1000;clearInterval(timerHandle);timerHandle=setInterval(showTimer,500);showTimer();toast('Recupero avviato: '+seconds+' secondi')}
function toggleSet(exId,ix){const day=DAYS[ui.day];const ex=planItems(day).find(x=>x.id===exId);if(!ex)return;const row=exerciseSet(day,ex,ix,true);if(!row.done){if(!(num(row.reps)>0)){toast('Inserisci prima ripetizioni o secondi');return}if(ex.kind!=='seconds'&&ex.kind!=='reps'&&ex.kind!=='bodyweight'&&!Number.isFinite(num(row.weight))){toast('Inserisci il peso o i kg di assistenza');return}}
 row.done=!row.done;save();updateWithoutJump();if(row.done)toast('Serie '+(ix+1)+' registrata')}
function toggleActivity(id){const day=DAYS[ui.day],a=day.activities.find(x=>x.id===id);if(!a)return;const s=session(day.id,true);if(!s.activities[id])s.activities[id]={done:false,...(a.kind==='run'?{minutes:a.minutes,distance:'',rpe:''}:{rounds:a.rounds,roundMinutes:a.roundMinutes,rpe:''})};s.activities[id].done=!s.activities[id].done;save();updateWithoutJump();toast(s.activities[id].done?'Attività registrata':'Attività riaperta')}
function closeSession() {
  const day = DAYS[ui.day];
  const existing = session(day.id);
  if (existing?.completedAt) {
    existing.completedAt = null;
    save();
    updateWithoutJump();
    toast('Seduta riaperta');
    return;
  }

  const p = progressOf(day, existing);
  if (p.completed < p.target && !confirm('Hai spuntato ' + p.completed + ' di ' + p.target + ' elementi. Vuoi chiudere comunque?')) return;

  const step = nextStep();
  const key = ui.sessionKey ?? currentSessionKey(day.id);
  const s = session(day.id, true);
  const isNext = ui.day === step % DAYS.length;
  if (isNext && (!ui.sessionKey || (s.rotationId === rotationId() && s.rotationStep === step))) {
    s.rotationId = rotationId();
    s.rotationStep = step;
  }
  s.completedAt = new Date().toISOString();
  save();

  if (nextStep() > step) {
    selectNextWorkout();
    openTab('train');
    toast('Seduta salvata. Prossima: ' + DAYS[ui.day].title);
  } else {
    ui.sessionKey = key;
    updateWithoutJump();
    toast('Allenamento completato e salvato');
  }
}
function openTab(tab) {
  ui.tab = tab;
  ui.modal = null;
  render();
  document.getElementById('main-content').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function handleClick(ev){const b=ev.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;
 if(action==='backdrop'){if(ev.target===b){ui.modal=null;showModal()}return}
 if(action==='tab'){
  if(b.dataset.tab==='train')selectNextWorkout();
  openTab(b.dataset.tab);return;
 }
 if(action==='today-workout'){selectNextWorkout();openTab('train');return}
 if(action==='day'){ui.day=Number(b.dataset.day);ui.sessionKey=null;openTab('train');return}
 if(action==='open-session'){
  const key=b.dataset.key,s=data.sessions[key];
  const day=DAYS.findIndex(d=>d.id===s?.dayId);
  if(day>=0){ui.day=day;ui.sessionKey=key;openTab('train');}
  return;
 }
 if(action==='restart-cycle'){
  if(confirm('Ripartire da Schiena e bicipiti? Lo storico e i carichi resteranno salvati.')){
   data.prefs={...data.prefs,rotationId:rotationId()+1};
   save();selectNextWorkout();openTab('train');toast('Ciclo ricominciato');
  }
  return;
 }
 if(action==='expand-ex'){const key=DAYS[ui.day].id+':'+b.dataset.ex;ui.expanded[key]=!ui.expanded[key];updateWithoutJump();return}
 if(action==='toggle-set'){toggleSet(b.dataset.ex,Number(b.dataset.index));return}
 if(action==='toggle-act'){toggleActivity(b.dataset.id);return}
 if(action==='complete-session'){closeSession();return}
 if(action==='timer'){startTimer(Number(b.dataset.seconds));return}
 if(action==='cancel-timer'){timerEnd=0;clearInterval(timerHandle);showTimer();return}
 if(action==='open-tech'||action==='open-edit'){ui.modal={mode:action==='open-tech'?'tech':'edit',dayId:b.dataset.dayid,exId:b.dataset.ex};showModal();return}
 if(action==='close-modal'){ui.modal=null;showModal();return}
 if(action==='save-edit'){
  const f=id=>num(document.getElementById(id)?.value);const sets=f('edit-sets'),low=f('edit-low'),high=f('edit-high'),rest=f('edit-rest'),inc=f('edit-inc');
  if(![sets,low,high,rest,inc].every(Number.isFinite)||sets<1||sets>8||low<1||high<low||high>100||rest<30||rest>600||inc<0||inc>20){toast('Controlla i valori inseriti');return}
  data.overrides[b.dataset.dayid+':'+b.dataset.ex]={sets:Math.round(sets),low:Math.round(low),high:Math.round(high),rest:Math.round(rest),inc,enabled:document.getElementById('edit-enabled').checked};
  ui.modal=null;save();updateWithoutJump();toast('Scheda aggiornata');return;
 }
 if(action==='add-custom'){ui.modal={mode:'custom'};showModal();return}
 if(action==='save-custom'){
  const name=(document.getElementById('custom-name')?.value||'').trim();const dayId=document.getElementById('custom-day').value;const sets=num(document.getElementById('custom-sets').value),rest=num(document.getElementById('custom-rest').value),low=num(document.getElementById('custom-low').value),high=num(document.getElementById('custom-high').value);
  if(name.length<2||!DAYS.some(x=>x.id===dayId)||!Number.isFinite(sets)||sets<1||sets>8||!Number.isFinite(rest)||rest<30||!Number.isFinite(low)||low<1||!Number.isFinite(high)||high<low){toast('Completa correttamente tutti i campi');return}
  const id='custom-'+Date.now().toString(36);data.customExercises.push({id,name,group:'Personalizzato',dayId,sets:Math.round(sets),low:Math.round(low),high:Math.round(high),rest:Math.round(rest),inc:2.5,photo:'',tips:['Esegui con tecnica controllata.','Interrompi prima di perdere la postura.'],kind:'weight'});save();ui.modal=null;ui.tab='train';ui.day=DAYS.findIndex(d=>d.id===dayId);ui.sessionKey=null;render();toast('Esercizio aggiunto');return;
 }
 if(action==='save-weight'){const val=num(document.getElementById('bodyweight')?.value);if(!Number.isFinite(val)||val<20||val>300){toast('Inserisci un peso valido in kg');return}const date=keyDate(new Date());data.bodyWeights=data.bodyWeights.filter(w=>w.date!==date);data.bodyWeights.push({date,kg:val});save();render();toast('Peso corporeo salvato');return}
 if(action==='export-json'){backupFile();return}
 if(action==='export-csv'){csvFile();return}
 if(action==='copy-report'){copyText(report());return}
 if(action==='share-report'){shareReport();return}
 if(action==='import-json'){document.querySelector('#import-input')?.click();return}
 if(action==='reenable'){if(data.overrides[b.dataset.key]){data.overrides[b.dataset.key].enabled=true;save();render();toast('Esercizio riattivato')}return}
 if(action==='restore-plan'){if(confirm('Ripristinare serie, ripetizioni e recuperi originali? I progressi resteranno salvati.')){data.overrides={};data.customExercises=[];save();render();toast('Scheda originale ripristinata')}return}
 if(action==='reset-data'){if(confirm('ATTENZIONE: vuoi eliminare tutte le sedute e i pesi? Esporta prima il backup.')){if(confirm('Confermi la cancellazione definitiva dal dispositivo?')){data=emptyData();selectNextWorkout();save();render();toast('Dati cancellati')}}return}
}
function handleInput(ev){const el=ev.target;
 if(el.id==='search-lib'){ui.search=el.value;const results=document.getElementById('library-results');if(results)results.innerHTML=renderLibraryList(ui.search);return}
 if(el.dataset.input==='set'){const day=DAYS[ui.day],ex=planItems(day).find(x=>x.id===el.dataset.ex);if(!ex)return;let value=el.value;if(value!==''&&(!Number.isFinite(num(value))||num(value)<0)){return}if(el.dataset.field==='rir'&&value!==''&&num(value)>10)return;const row=exerciseSet(day,ex,Number(el.dataset.index),true);row[el.dataset.field]=value;save();return}
 if(el.dataset.input==='session'){const day=DAYS[ui.day];const s=session(day.id,true);if(el.dataset.field==='fatigue'&&el.value!==''&&(!Number.isFinite(num(el.value))||num(el.value)<1||num(el.value)>10))return;s[el.dataset.field]=el.value;save();return}
 if(el.dataset.input==='activity'){const day=DAYS[ui.day],a=day.activities.find(x=>x.id===el.dataset.id);if(!a)return;const s=session(day.id,true);if(!s.activities[a.id])s.activities[a.id]={done:false};const value=el.value;if(value!==''&&(!Number.isFinite(num(value))||num(value)<0))return;s.activities[a.id][el.dataset.field]=value;save();return}
}
async function importJson(ev){if(ev.target.id!=='import-input')return;const file=ev.target.files?.[0];if(!file)return;if(file.size>10_000_000){toast('File troppo grande');return}try{const txt=await file.text(),incoming=JSON.parse(txt),raw=incoming.data||incoming;if(!raw.sessions||typeof raw.sessions!=='object'||Array.isArray(raw.sessions))throw Error('Formato non riconosciuto');if(!confirm('Importare il backup e SOSTITUIRE i dati presenti su questo dispositivo?'))return;data={...emptyData(),...raw};if(!Array.isArray(data.customExercises))data.customExercises=[];if(!Array.isArray(data.bodyWeights))data.bodyWeights=[];if(!data.overrides||typeof data.overrides!=='object')data.overrides={};selectNextWorkout();save();render();toast('Backup importato con successo')}catch(err){console.error(err);toast('Backup non valido o illeggibile')}finally{ev.target.value=''}}
function handleChange(ev){if(ev.target.id==='import-input'){importJson(ev);return}if(ev.target.id==='chart-select'){ui.chart=ev.target.value;updateWithoutJump();return}}
function errorImage(ev){const el=ev.target;if(el.tagName!=='IMG')return;const fallback=document.createElement('div');fallback.className=el.closest('.photo')?'photo-fallback':'phfallback';fallback.innerHTML=el.closest('.photo')?'Foto non disponibile':icon('dumbbell','icon-lg');el.replaceWith(fallback)}
document.addEventListener('click',handleClick);
document.addEventListener('input',handleInput);
document.addEventListener('change',handleChange);
document.addEventListener('error',errorImage,true);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&ui.modal){ui.modal=null;showModal()}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){const now=new Date();if(keyDate(now)!==keyDate(today)){today=now;if(ui.tab==='train'&&!ui.sessionKey)selectNextWorkout();render()}}});
window.addEventListener('storage',ev=>{if(ev.key===STORE){try{data={...emptyData(),...JSON.parse(ev.newValue)};if(ui.sessionKey&&!data.sessions[ui.sessionKey])selectNextWorkout();render()}catch(e){}}});
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol)){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.info('Offline not available',e)))}
selectNextWorkout();
render();
})();
