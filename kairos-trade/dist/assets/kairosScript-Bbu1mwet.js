import{f as j,b as z,e as O,d as F,a as N,c as W}from"./indicators-DJQYQkcq.js";import{f as I}from"./index-CllwEhrg.js";class i{constructor(t){this._series=t.map(p=>p??0),this._value=this._series[this._series.length-1]||0}valueOf(){return this._value}toString(){return String(this._value)}get value(){return this._value}get series(){return this._series}prev(t=1){return this._series[this._series.length-1-t]||0}toFixed(t){return this._value.toFixed(t)}}function G(u){const t=u.map(n=>n.close),p=u.map(n=>n.open),h=u.map(n=>n.high),v=u.map(n=>n.low),m=u.map(n=>n.volume),e=t.length;let d=null,P={stopLoss:2,takeProfit:4};const w=[],M=(n=20)=>new i(W(t,n)),C=(n=20)=>new i(N(t,n)),E=(n=14)=>new i(F(t,n)),R=(n=12,o=26,r=9)=>{const a=O(t,n,o,r);return{line:new i(a.macd),signal:new i(a.signal),histogram:new i(a.histogram),valueOf(){return a.histogram[e-1]||0}}},V=(n=20,o=2)=>{const r=z(t,n,o);return{upper:new i(r.upper),middle:new i(r.middle),lower:new i(r.lower)}},_=()=>new i(j(u)),x=(n,o)=>{const r=n instanceof i?n.series:typeof n=="number"?[n,n]:[],a=o instanceof i?o.series:typeof o=="number"?[o,o]:[];if(r.length<2||a.length<2)return!1;const l=Math.min(r.length,a.length)-1;return r[l-1]<=a[l-1]&&r[l]>a[l]},s=(n,o)=>{const r=n instanceof i?n.series:typeof n=="number"?[n,n]:[],a=o instanceof i?o.series:typeof o=="number"?[o,o]:[];if(r.length<2||a.length<2)return!1;const l=Math.min(r.length,a.length)-1;return r[l-1]>=a[l-1]&&r[l]<a[l]},b=(n={})=>{d={type:"buy",...n}},c=(n={})=>{d={type:"sell",...n}},g=(n={})=>{Object.assign(P,n)},q=n=>{w.push(String(n))},L=n=>{w.push(`⚠️ ${String(n)}`)},D=new i(t),f=new i(p),A=new i(h),y=new i(v),S=new i(m),k=t[e-1]||0,B=e-1;return{sandbox:{ema:M,sma:C,rsi:E,macd:R,bb:V,vwap:_,close:D,open:f,high:A,low:y,volume:S,price:k,barIndex:B,crossover:x,crossunder:s,buy:b,sell:c,config:g,log:q,alert:L,highest:(n,o)=>{const a=(n instanceof i?n.series:t).slice(-o);return Math.max(...a.filter(l=>l!=null))},lowest:(n,o)=>{const a=(n instanceof i?n.series:t).slice(-o);return Math.min(...a.filter(l=>l!=null))},avg:(n,o)=>{const a=(n instanceof i?n.series:t).slice(-o).filter(l=>l!=null);return a.reduce((l,T)=>l+T,0)/(a.length||1)},change:(n,o=1)=>{const r=n instanceof i?n.series:t,a=r[r.length-1]||0,l=r[r.length-1-o]||0;return a-l},percentChange:(n,o=1)=>{const r=n instanceof i?n.series:t,a=r[r.length-1]||0,l=r[r.length-1-o]||0;return l!==0?(a-l)/l*100:0},Math,Number,parseInt,parseFloat,isNaN,isFinite},getSignal:()=>d,getConfig:()=>P,getLogs:()=>w}}function $(u,t){if(!u||!t||t.length<2)return{signal:null,config:{stopLoss:2,takeProfit:4},logs:["No hay datos suficientes"]};const{sandbox:p,getSignal:h,getConfig:v,getLogs:m}=G(t);try{const e=["window","document","globalThis","self","fetch","XMLHttpRequest","WebSocket","eval","Function","setTimeout","setInterval","importScripts","localStorage","sessionStorage","indexedDB","crypto","navigator","location","history","process","require","module","exports","__dirname","__filename"],d=[...Object.keys(p),...e],P=[...Object.values(p),...e.map(()=>{})];return new Function(...d,u)(...P),{signal:h(),config:v(),logs:m(),error:null}}catch(e){return{signal:null,config:v(),logs:[...m(),`❌ Error: ${e.message}`],error:e.message}}}function ne(u){if(!u||!u.trim())return{valid:!1,error:"El script está vacío"};try{const t=[/\beval\s*\(/,/\bFunction\s*\(/,/\bimport\s*\(/,/\brequire\s*\(/,/\bfetch\s*\(/,/\bXMLHttpRequest\b/,/\bWebSocket\b/,/\bwindow\b/,/\bdocument\b/,/\bprocess\b/,/\b__proto__\b/,/\bconstructor\s*\[/,/\bprototype\b/];for(const p of t)if(p.test(u))return{valid:!1,error:`Código no permitido: ${p.source}`};return new Function(u),{valid:!0,error:null}}catch(t){return{valid:!1,error:`Error de sintaxis: ${t.message}`}}}function te(u,t,p={}){var _,x;const{initialBalance:h=1e3,riskPercent:v=2}=p;let m=h,e=null;const d=[],P=[h],w=[],M=50;if(t.length<M)return{trades:[],equityCurve:[h],finalBalance:h,logs:["Se necesitan al menos 50 velas"]};for(let s=M;s<t.length;s++){const b=t.slice(0,s+1),c=b[b.length-1].close,g=$(u,b);if(g.error){w.push(`Bar ${s}: ${g.error}`);continue}const q=((_=g.config)==null?void 0:_.stopLoss)||2,L=((x=g.config)==null?void 0:x.takeProfit)||4;if(e){const f=e.side==="buy"?(c-e.entryPrice)/e.entryPrice*100:(e.entryPrice-c)/e.entryPrice*100;if(f<=-q||f>=L){const A=e.quantity*(c-e.entryPrice)*(e.side==="buy"?1:-1),y=I.calculateFee(c,e.quantity),S=A-y;m+=S,d.push({...e,exitPrice:c,exitBar:s,pnl:S,pnlPercent:f,reason:f>=L?"Take Profit":"Stop Loss"}),e=null}}if(g.signal){if(g.signal.type==="buy"&&!e){const f=m*(v/100)/c;e={side:"buy",entryPrice:c,quantity:f,entryBar:s}}else if(g.signal.type==="sell"&&(e==null?void 0:e.side)==="buy"){const f=e.quantity*(c-e.entryPrice),A=I.calculateFee(c,e.quantity),y=f-A;m+=y;const S=(c-e.entryPrice)/e.entryPrice*100;d.push({...e,exitPrice:c,exitBar:s,pnl:y,pnlPercent:S,reason:"Signal"}),e=null}else if(g.signal.type==="sell"&&!e){const f=m*(v/100)/c;e={side:"sell",entryPrice:c,quantity:f,entryBar:s}}else if(g.signal.type==="buy"&&(e==null?void 0:e.side)==="sell"){const f=e.quantity*(e.entryPrice-c),A=I.calculateFee(c,e.quantity),y=f-A;m+=y;const S=(e.entryPrice-c)/e.entryPrice*100;d.push({...e,exitPrice:c,exitBar:s,pnl:y,pnlPercent:S,reason:"Signal"}),e=null}}const D=e?e.quantity*(e.side==="buy"?c-e.entryPrice:e.entryPrice-c):0;P.push(m+D)}if(e){const s=t[t.length-1].close,b=e.quantity*(e.side==="buy"?s-e.entryPrice:e.entryPrice-s),c=I.calculateFee(s,e.quantity),g=b-c;m+=g,d.push({...e,exitPrice:s,exitBar:t.length-1,pnl:g,pnlPercent:g/e.entryPrice/e.quantity*100,reason:"End of Data"})}const C=d.filter(s=>s.pnl>0).length,E=d.filter(s=>s.pnl<=0).length,R=d.reduce((s,b)=>s+b.pnl,0),V=H(P);return{trades:d,equityCurve:P,finalBalance:m,totalTrades:d.length,wins:C,losses:E,winRate:d.length>0?C/d.length*100:0,totalPnl:R,maxDrawdown:V,profitFactor:E>0?d.filter(s=>s.pnl>0).reduce((s,b)=>s+b.pnl,0)/Math.abs(d.filter(s=>s.pnl<=0).reduce((s,b)=>s+b.pnl,0)||1):C>0?1/0:0,logs:w}}function H(u){let t=u[0],p=0;for(const h of u){h>t&&(t=h);const v=(t-h)/t*100;v>p&&(p=v)}return p}const se=[{id:"ema_cross",name:"EMA Crossover",description:"Compra cuando EMA rápida cruza arriba de EMA lenta, vende al cruce inverso",difficulty:"Principiante",code:`// EMA Crossover Strategy
// Señal de compra: EMA rápida cruza arriba de EMA lenta
// Señal de venta: EMA rápida cruza abajo de EMA lenta

const fast = ema(12);
const slow = ema(26);

if (crossover(fast, slow)) {
  buy();
}

if (crossunder(fast, slow)) {
  sell();
}

config({ stopLoss: 2, takeProfit: 4 });`},{id:"rsi_reversal",name:"RSI Reversal",description:"Compra en sobreventa (RSI < 30), vende en sobrecompra (RSI > 70)",difficulty:"Principiante",code:`// RSI Reversal Strategy
// Compra cuando RSI está sobrevendido
// Vende cuando RSI está sobrecomprado

const rsiVal = rsi(14);

if (rsiVal < 30) {
  buy();
}

if (rsiVal > 70) {
  sell();
}

config({ stopLoss: 1.5, takeProfit: 3 });`},{id:"macd_momentum",name:"MACD Momentum",description:"Opera el cruce de la línea MACD con su señal",difficulty:"Intermedio",code:`// MACD Momentum Strategy
// Señal de compra: línea MACD cruza arriba de señal
// Señal de venta: línea MACD cruza abajo de señal

const m = macd(12, 26, 9);

if (crossover(m.line, m.signal)) {
  buy();
}

if (crossunder(m.line, m.signal)) {
  sell();
}

config({ stopLoss: 2, takeProfit: 5 });`},{id:"bb_squeeze",name:"Bollinger Bands Squeeze",description:"Compra cuando el precio toca la banda inferior, vende en la superior",difficulty:"Intermedio",code:`// Bollinger Bands Bounce Strategy
// Compra en banda inferior, vende en banda superior

const bands = bb(20, 2);
const rsiVal = rsi(14);

// Comprar cerca de banda inferior con RSI sobrevendido
if (close < bands.lower && rsiVal < 35) {
  buy();
}

// Vender cerca de banda superior con RSI sobrecomprado
if (close > bands.upper && rsiVal > 65) {
  sell();
}

config({ stopLoss: 1.5, takeProfit: 3 });`},{id:"triple_confirmation",name:"Triple Confirmación",description:"EMA + RSI + MACD confirman la señal de entrada — alta probabilidad",difficulty:"Avanzado",code:`// Triple Confirmation Strategy
// Requiere 3 indicadores para confirmar entrada
// Alta probabilidad, menos trades pero más precisos

const ema20 = ema(20);
const ema50 = ema(50);
const rsiVal = rsi(14);
const m = macd(12, 26, 9);

// COMPRA: EMA cruce alcista + RSI < 45 + MACD positivo
if (crossover(ema20, ema50) && rsiVal < 45 && m.histogram > 0) {
  buy();
  log("Triple confirmación alcista");
}

// VENTA: EMA cruce bajista + RSI > 55 + MACD negativo
if (crossunder(ema20, ema50) && rsiVal > 55 && m.histogram < 0) {
  sell();
  log("Triple confirmación bajista");
}

config({ stopLoss: 2.5, takeProfit: 6 });`},{id:"vwap_scalper",name:"VWAP Scalper",description:"Scalping basado en VWAP con EMA como filtro de tendencia",difficulty:"Avanzado",code:`// VWAP Scalper Strategy
// Compra cuando precio cruza arriba de VWAP con tendencia alcista
// Scalping rápido con stops ajustados

const v = vwap();
const trend = ema(50);
const momentum = rsi(10);

// Tendencia alcista + precio cruza VWAP hacia arriba
if (crossover(close, v) && close > trend && momentum > 50) {
  buy();
  log("Long VWAP bounce en tendencia alcista");
}

// Tendencia bajista + precio cruza VWAP hacia abajo
if (crossunder(close, v) && close < trend && momentum < 50) {
  sell();
  log("Short VWAP rejection en tendencia bajista");
}

config({ stopLoss: 0.8, takeProfit: 1.5 });`},{id:"custom_blank",name:"Script Vacío",description:"Empieza desde cero — escribe tu propia estrategia",difficulty:"Cualquiera",code:`// Mi Estrategia Personalizada
// ─────────────────────────────
// Funciones disponibles:
//   ema(periodo), sma(periodo), rsi(periodo)
//   macd(fast, slow, signal), bb(periodo, stdDev), vwap()
//   crossover(a, b), crossunder(a, b)
//   highest(indicador, periodo), lowest(indicador, periodo)
//   avg(indicador, periodo), change(indicador, periodos)
//   percentChange(indicador, periodos)
//
// Variables: close, open, high, low, volume, price
// Acciones: buy(), sell(), config({ stopLoss, takeProfit })
//           log("mensaje"), alert("alerta")
//
// Tip: Pídele a ChatGPT que te genere una estrategia
//      usando estas funciones!

// Escribe tu estrategia aquí:


config({ stopLoss: 2, takeProfit: 4 });`}],re=`Eres un experto creando estrategias de trading para Kairos Script. Genera código usando SOLO estas funciones:

INDICADORES (retornan valores numéricos):
- ema(periodo) — Media Móvil Exponencial
- sma(periodo) — Media Móvil Simple
- rsi(periodo) — Índice de Fuerza Relativa (0-100)
- macd(fast, slow, signal) — retorna { line, signal, histogram }
- bb(periodo, stdDev) — retorna { upper, middle, lower }
- vwap() — Volume Weighted Average Price

DATOS:
- close, open, high, low, volume — valores actuales
- price — precio actual (número)

DETECCIÓN DE CRUCES:
- crossover(a, b) — true si A cruza arriba de B
- crossunder(a, b) — true si A cruza abajo de B

UTILIDADES:
- highest(indicador, periodo) — valor más alto en N períodos
- lowest(indicador, periodo) — valor más bajo en N períodos
- avg(indicador, periodo) — promedio en N períodos
- change(indicador, periodos) — cambio absoluto
- percentChange(indicador, periodos) — cambio porcentual

ACCIONES:
- buy() — señal de compra
- sell() — señal de venta
- config({ stopLoss: %, takeProfit: % }) — configurar SL/TP
- log("mensaje") — registrar mensaje

REGLAS:
1. NO uses window, document, fetch, eval, require, import
2. Solo JavaScript simple (if/else, const/let, operadores)
3. El código se ejecuta en cada vela nueva
4. Siempre incluye config() con stopLoss y takeProfit
5. Las comparaciones con indicadores funcionan directamente (ej: rsi(14) < 30)

Genera SOLO el código, sin explicaciones fuera del código. Usa comentarios en español.`;export{re as C,se as S,te as b,$ as e,ne as v};
//# sourceMappingURL=kairosScript-Bbu1mwet.js.map
