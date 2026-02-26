import{m as H}from"./marketData-K1zKCjjj.js";import{c as N,a as Y,d as ee,e as ae,b as oe,f as se,g as U,h as ie}from"./indicators-DJQYQkcq.js";import{C as te}from"./kairosScript-BKzc88-m.js";const ne={ema:"La **EMA (Media Móvil Exponencial)** da más peso a los precios recientes. EMA 20 corto plazo, EMA 50 mediano, EMA 200 largo. Cuando EMA rápida cruza encima de la lenta = señal de compra (Golden Cross). Cuando cruza debajo = señal de venta (Death Cross).",sma:"La **SMA (Media Móvil Simple)** es el promedio aritmético de los últimos N precios. SMA 200 es la referencia institucional de tendencia a largo plazo.",rsi:"El **RSI (Índice de Fuerza Relativa)** mide momentum en escala 0-100. RSI > 70 = sobrecompra (posible caída), RSI < 30 = sobreventa (posible rebote). Divergencias RSI son señales muy poderosas.",macd:"El **MACD** mide momentum con: línea MACD (EMA12 − EMA26), línea de señal (EMA9 del MACD), e histograma. Cruce alcista = compra. Histograma creciente = momentum positivo.",bollinger:"Las **Bandas de Bollinger** forman un canal de volatilidad (SMA ± 2σ). Precio toca banda superior = posible sobrecompra. Compresión (Squeeze) = explosión de volatilidad inminente.",vwap:"El **VWAP** es el precio promedio ponderado por volumen del día. Price > VWAP = sesgo alcista. Es la principal referencia institucional intraday.",fibonacci:"Los retrocesos de **Fibonacci** (23.6%, 38.2%, 50%, 61.8%) identifican soporte/resistencia. El 61.8% (golden ratio) es el nivel más respetado.",soporte:"**Soporte** es donde la demanda frena la caída. **Resistencia** donde la oferta frena la subida. Cuando un soporte se rompe, se convierte en resistencia y viceversa.",tendencia:"**Tendencia alcista** = máximos y mínimos más altos. **Bajista** = máximos y mínimos más bajos. **Nunca operes contra la tendencia principal.**",scalping:"**Scalping** busca ganancias rápidas (0.1-0.5%) en timeframes 1-5 min. Requiere spread bajo, ejecución rápida, y disciplina.",swing:"**Swing trading** captura movimientos de 2-10% en días o semanas. Timeframes 4h y 1D. Mejor ratio riesgo/recompensa que scalping.",day_trading:"**Day trading** abre y cierra en el mismo día. Timeframes 5m-1h. No hay riesgo overnight.",riesgo:"**Regla del 1-2%**: Nunca arriesgues más del 1-2% por trade. Si tienes $10,000, pérdida máxima por operación = $100-200.",stop_loss:"El **Stop Loss** es obligatorio. Métodos: porcentaje fijo (1-3%), debajo de soporte, ATR multiplier, o swing low/high.",take_profit:"**Take Profit** debe ser al menos 2x tu Stop Loss (ratio 1:2 mínimo). Usa trailing stops para movimientos grandes.",position:"**Position sizing**: Capital × Riesgo% ÷ (Entrada − StopLoss) = Cantidad. Esto controla tu riesgo sin importar el resultado.",doji:"**Doji** = apertura ≈ cierre. Indica indecisión. Después de tendencia fuerte = posible reversal.",engulfing:"**Engulfing bullish** = vela roja + verde que la envuelve. Señal alcista fuerte en soporte.",hammer:"**Hammer** = mecha inferior larga en fondo bajista. Indica rechazo de precios bajos = posible reversal alcista.",doble_techo:"**Doble techo** = dos máximos iguales. Reversal bajista. Confirmar con ruptura del neckline.",hch:"**Cabeza y hombros** = tres máximos, central más alto. El patrón de reversal más confiable.",liquidez:"**Liquidez** se concentra en máximos/mínimos iguales, números redondos y zonas de alto volumen. Market Makers buscan liquidez antes de moverse.",order_block:"**Order Block** = zona de órdenes institucionales. Última vela antes de movimiento impulsivo. Precio regresa a estas zonas.",funding:"**Funding rate** en futuros indica consenso. Funding muy positivo = exceso de longs, posible caída. Negativo = exceso de shorts, posible subida.",bitcoin:"**Bitcoin (BTC)** es la referencia. ~70% de altcoins siguen a BTC. Siempre analiza BTC primero.",altseason:"**Altseason** = altcoins superan a Bitcoin (BTC dominance baja). Se identifica cuando ETH/BTC sube.",halving:"**Halving** reduce emisión BTC a la mitad cada ~4 años. Históricamente precede bull runs de 12-18 meses.",apalancamiento:"**Apalancamiento** multiplica tu exposición. 10x = ganas/pierdes 10 veces más rápido. Para principiantes: máximo 3x. Profesionales: 5-10x con SL estricto.",volumen:"**Volumen** confirma movimientos. Ruptura con volumen alto = real. Ruptura sin volumen = probable fake out. Volumen creciente en tendencia = saludable."},re={ema:["ema","media movil exponencial","exponential moving","golden cross","death cross"],sma:["sma","media movil simple","simple moving"],rsi:["rsi","fuerza relativa","relative strength","sobrecompra","sobreventa","overbought","oversold"],macd:["macd","convergencia divergencia","histograma"],bollinger:["bollinger","bandas de bollinger","bollinger bands","squeeze","bb "],vwap:["vwap","precio ponderado","volume weighted"],fibonacci:["fibonacci","fibo","retroceso","golden ratio","61.8"],soporte:["soporte","resistencia","support","resistance","nivel clave"],tendencia:["tendencia","trend","alcista","bajista","lateral","rango"],scalping:["scalping","scalp","escalpeo"],swing:["swing trading","swing trade"],day_trading:["day trading","intradia","intraday"],riesgo:["riesgo","risk management","money management","gestion de riesgo"],stop_loss:["stop loss","stoploss","parar perdida"],take_profit:["take profit","tomar ganancia","objetivo de ganancia"],position:["position sizing","tamano de posicion","cuanto invertir","cuanto comprar","cuanto arriesgar"],doji:["doji","vela de indecision"],engulfing:["engulfing","envolvente","patron de vela"],hammer:["hammer","martillo","pin bar"],doble_techo:["doble techo","double top","doble suelo","double bottom"],hch:["cabeza y hombros","head and shoulders","hch"],liquidez:["liquidez","liquidity","market maker"],order_block:["order block","bloque de orden","smc","smart money"],funding:["funding","funding rate"],bitcoin:["dominancia","btc dominance"],altseason:["altseason","alt season","altcoins"],halving:["halving","halvening"],apalancamiento:["apalancamiento","leverage","margen","margin"],volumen:["volumen","volume","vol "]};class ce{constructor(){this.apiKey=null,this.model="gpt-4o-mini",this.conversationHistory=[],this._cache=new Map,this._cacheTTL=3e4}setApiKey(e){this.apiKey=e}async chat(e,s=null){this.conversationHistory.push({role:"user",content:e});try{const o=this._parseIntent(e);return this.apiKey?await this._openAI(e,s,o):await this._engine(e,s,o)}catch(o){console.error("Kairos AI error:",o);const i={text:`⚠️ Error: ${o.message}. Intenta de nuevo.`,strategy:null,kairosScript:null,action:null};return this.conversationHistory.push({role:"assistant",content:i.text}),i}}_parseIntent(e){const s=e.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""),o=e.match(/\b([A-Z]{2,10})(USDT|USD|BTC|ETH|BNB|BUSD)\b/i)||e.match(/\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|AVAX|DOT|MATIC|LINK|UNI|ATOM|NEAR|APT|ARB|OP|SUI|TIA|JUP|WIF|PEPE|SHIB|LTC|BCH|EOS|TRX|FIL|AAVE|MKR|COMP|SNX|CRV|INJ|SEI|MANTA|STRK|PYTH)\b/i),i=o?o[0].toUpperCase().endsWith("USDT")?o[0].toUpperCase():o[0].toUpperCase()+"USDT":null;return{changePair:!!s.match(/\b(cambi|muestra|ponme|pon |abre|ver |quiero ver|busca|grafico de)\b/),analyze:!!s.match(/\b(analiz|analisis|como ves|como esta|que ves|revis|resumen|overview)\b/),strategy:!!s.match(/\b(estrategia|estratergia|strategy)\b/),kairosScript:!!(s.match(/\b(script|codigo|code|kairos script)\b/)||s.includes("bot")&&s.match(/\b(crea|genera|haz|dame)\b/)),education:!!s.match(/\b(que es|explica|como funciona|ensen|aprend|como se|que significa|diferencia|que son)\b/),risk:!!s.match(/\b(riesgo|stop loss|position siz|gestion|cuanto debo|cuanto arriesg)\b/),predict:!!s.match(/\b(subir|bajar|precio|target|objetivo|va a|prediccion|pronostico|proyeccion)\b/),greeting:!!s.match(/^(hola|hey|buenas|saludos|hi|hello|que tal|buenos dias|buenas noches|buenas tardes)\b/),help:!!s.match(/\b(ayuda|help|puedes|que sabes|funciones|que haces|capacidades)\b/),detectedPair:i}}async _engine(e,s,o){const i=e.toLowerCase();if(o.greeting)return this._reply(`👋 ¡Hola! Soy **Kairos AI**, tu experto de trading.

Puedo:
• 📊 **Analizar cualquier par** — "Analiza ETHUSDT"
• 🎯 **Generar estrategias** — "Dame una estrategia para SOL"
• 💻 **Crear Kairos Script** — "Crea un script para BTC"
• 🔄 **Cambiar el gráfico** — "Muéstrame SOLUSDT"
• 📚 **Enseñarte trading** — "¿Qué es el RSI?"

¿En qué te ayudo?`);if(o.help)return this._reply(`🤖 **Kairos AI — Capacidades**

📊 **Análisis Técnico** — Calculo EMA, SMA, RSI, MACD, BB, VWAP en tiempo real. Detecto cruces, divergencias, y señales.

🎯 **Estrategias** — Genero estrategias basadas en el estado actual del mercado con SL/TP calculados.

💻 **Kairos Script** — Creo código que puedes copiar → paste en un Script Bot → el bot lo ejecuta automáticamente.

🔄 **Control del Gráfico** — "Muéstrame SOL" y cambio el par en pantalla.

📚 **Educación** — Pregúntame sobre cualquier indicador, patrón o concepto.

Prueba: **"Analiza BTC y crea un script ganador"**`);if(o.changePair&&o.detectedPair){const a=o.detectedPair;try{const r=await this._analyze(a);return this._reply(`🔄 **Cambiando a ${a}**

${this._quickSummary(a,r)}

¿Quieres un análisis completo o un script para ${a}?`,null,null,{type:"changePair",pair:a})}catch{return this._reply(`🔄 **Cambiando a ${a}**
Cargando datos...`,null,null,{type:"changePair",pair:a})}}if(o.kairosScript||o.strategy&&(i.includes("script")||i.includes("codigo")||i.includes("bot"))){const a=o.detectedPair||(s==null?void 0:s.symbol)||"BTCUSDT";return await this._genScript(a,s)}if(o.strategy){const a=o.detectedPair||(s==null?void 0:s.symbol)||"BTCUSDT";return await this._genStrategy(a,s)}if(o.analyze||o.predict){const a=o.detectedPair||(s==null?void 0:s.symbol)||"BTCUSDT";return await this._fullAnalysis(a,s)}if(o.education||o.risk)return this._educate(e);if(o.detectedPair){const a=o.detectedPair;return await this._fullAnalysis(a,s,{type:"changePair",pair:a})}const p=this._matchKB(i);return p?this._reply(p):this._reply(`🤖 Entiendo: "${e}"

Puedo:
• 📊 **"Analiza BTCUSDT"** — Análisis técnico
• 💻 **"Crea un script para ETH"** — Código para bot
• 🔄 **"Muéstrame SOLUSDT"** — Cambiar gráfico
• 📚 **"¿Qué es el MACD?"** — Educación

¿Qué necesitas?`)}async _analyze(e,s="1h",o=200){const i=`${e}_${s}`,p=this._cache.get(i);if(p&&Date.now()-p.ts<this._cacheTTL)return p.data;const[a,r]=await Promise.all([H.getCandles(e,s,o),H.get24hrTicker(e)]);if(!a||a.length<50)throw new Error(`Datos insuficientes para ${e}`);const t=a.map(u=>u.close),c=a.map(u=>u.high),m=a.map(u=>u.low),d=a.map(u=>u.volume),n=t.length,b=N(t,20),g=N(t,50),f=Y(t,200),l=ee(t,14),S=ae(t,12,26,9),v=oe(t,20,2),A=se(a),$=t[n-1],M=b[n-1],E=g[n-1],y=f[n-1],C=l[n-1],W=S.macd[n-1],G=S.signal[n-1],F=S.histogram[n-1],T=v.upper[n-1],B=v.lower[n-1],z=v.middle[n-1],k=A[n-1],_=$>M?"alcista":"bajista",L=$>E?"alcista":"bajista",j=y?$>y?"alcista":"bajista":"indefinida",q=M>E&&(y?E>y:!0),P=U(b,g,n-1),I=U(S.macd,S.signal,n-1),w=ie(t,l,14),x=T&&B?(T-B)/z*100:0,R=[];for(let u=Math.max(0,n-20);u<n;u++)v.upper[u]&&v.lower[u]&&v.middle[u]&&R.push((v.upper[u]-v.lower[u])/v.middle[u]*100);const J=R.length>0?R.reduce((u,D)=>u+D,0)/R.length:x,Q=x<J*.75,V=d.slice(-20).reduce((u,D)=>u+D,0)/20,O=d[n-1]/V,X=Math.max(...c.slice(-20)),Z=Math.min(...m.slice(-20));let h=50;_==="alcista"&&(h+=8),L==="alcista"&&(h+=8),j==="alcista"&&(h+=8),q&&(h+=6),C>50&&C<70&&(h+=5),C<30&&(h+=10),C>70&&(h-=10),F>0&&(h+=5),I==="bullish_cross"&&(h+=10),I==="bearish_cross"&&(h-=10),P==="bullish_cross"&&(h+=10),P==="bearish_cross"&&(h-=10),$>k&&(h+=5),w==="bullish_divergence"&&(h+=8),w==="bearish_divergence"&&(h-=8),O>1.5&&(h+=_==="alcista"?5:-5),h=Math.max(0,Math.min(100,h));const K={pair:e,price:$,ticker:r,ind:{ema20:M,ema50:E,sma200:y,rsi:C,macdLine:W,macdSig:G,macdHist:F,bbU:T,bbL:B,bbM:z,bbWidth:x,squeeze:Q,vwap:k},trend:{short:_,mid:L,long:j,aligned:q,emaCross:P},signals:{rsiDiv:w,macdCross:I,volRatio:O,avgVol:V},levels:{support:Z,resistance:X},score:h,candles:a};return this._cache.set(i,{data:K,ts:Date.now()}),K}async _fullAnalysis(e,s,o=null){var i,p;try{const a=await this._analyze(e),{price:r,ind:t,trend:c,signals:m,levels:d,score:n,ticker:b}=a;let g,f;n>=70?(g="FUERTEMENTE ALCISTA",f="🟢🟢"):n>=55?(g="MODERADAMENTE ALCISTA",f="🟢"):n>=45?(g="NEUTRAL / LATERAL",f="🟡"):n>=30?(g="MODERADAMENTE BAJISTA",f="🔴"):(g="FUERTEMENTE BAJISTA",f="🔴🔴");const l=[];c.emaCross==="bullish_cross"&&l.push("✅ **Golden Cross** — EMA20 cruzó encima de EMA50"),c.emaCross==="bearish_cross"&&l.push("❌ **Death Cross** — EMA20 cruzó debajo de EMA50"),m.macdCross==="bullish_cross"&&l.push("✅ **MACD Bullish Cross**"),m.macdCross==="bearish_cross"&&l.push("❌ **MACD Bearish Cross**"),t.rsi<30&&l.push("⚡ **RSI Sobreventa** — Posible rebote"),t.rsi>70&&l.push("⚠️ **RSI Sobrecompra** — Posible corrección"),m.rsiDiv==="bullish_divergence"&&l.push("🔥 **Divergencia RSI Alcista** — Reversal probable"),m.rsiDiv==="bearish_divergence"&&l.push("⚠️ **Divergencia RSI Bajista**"),t.squeeze&&l.push("💥 **BB Squeeze** — Explosión inminente"),m.volRatio>2&&l.push(`📊 **Volumen ${m.volRatio.toFixed(1)}x** sobre promedio`),c.aligned&&l.push("📈 **EMAs Alineadas** — Tendencia fuerte");let S;n>=65?S=`🟢 **BUSCAR COMPRAS** en pullback a EMA20 ($${t.ema20.toFixed(2)}). SL debajo EMA50. TP: $${d.resistance.toFixed(2)}.`:n>=45?S=`🟡 **ESPERAR** — Operar rango $${d.support.toFixed(2)} - $${d.resistance.toFixed(2)}.`:S=`🔴 **PRECAUCIÓN** — Evitar longs. Short target: $${d.support.toFixed(2)}.`;const v=(b==null?void 0:b.changePercent)||0,A=`📊 **ANÁLISIS — ${e}**

**Precio:** $${r.toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}
**24h:** ${v>=0?"+":""}${v.toFixed(2)}% | **Vol:** $${(((b==null?void 0:b.quoteVolume)||0)/1e6).toFixed(1)}M

━━ **INDICADORES** ━━
• EMA 20: $${t.ema20.toFixed(2)} ${r>t.ema20?"✅":"❌"}
• EMA 50: $${t.ema50.toFixed(2)} ${r>t.ema50?"✅":"❌"}
`+(t.sma200?`• SMA 200: $${t.sma200.toFixed(2)} ${r>t.sma200?"✅":"❌"}
`:"")+`• RSI: ${(i=t.rsi)==null?void 0:i.toFixed(1)} ${t.rsi>70?"⚠️":t.rsi<30?"⚡":"🟢"}
• MACD: ${t.macdHist>0?"🟢":"🔴"} ${(p=t.macdHist)==null?void 0:p.toFixed(4)}
• BB: ${t.bbWidth.toFixed(2)}% ${t.squeeze?"💥 SQUEEZE":""}
• VWAP: $${t.vwap.toFixed(2)} ${r>t.vwap?"✅":"❌"}

━━ **TENDENCIA** ━━
Corto: **${c.short}** | Medio: **${c.mid}** | Largo: **${c.long}**
EMAs alineadas: ${c.aligned?"✅":"❌"}

━━ **NIVELES** ━━
Soporte: $${d.support.toFixed(2)} | Resistencia: $${d.resistance.toFixed(2)}

`+(l.length>0?`━━ **SEÑALES** ━━
${l.join(`
`)}

`:"")+`━━ **VEREDICTO** ━━
${f} **${g}** (Score: ${n}/100)

${S}

💡 _Di "crea un script para ${e}" para generar código automático._`;return this._reply(A,null,null,o)}catch(a){if(s)return this._basicAnalysis(s);throw a}}_quickSummary(e,s){var t;const{price:o,ind:i,trend:p,score:a}=s;return`${a>=60?"🟢":a>=40?"🟡":"🔴"} **${e}** — $${o.toLocaleString(void 0,{minimumFractionDigits:2})}
RSI: ${(t=i.rsi)==null?void 0:t.toFixed(1)} | MACD: ${i.macdHist>0?"🟢":"🔴"} | Tendencia: ${p.short}
Score: **${a}/100**`}_basicAnalysis(e){var o,i;const s=e.changePercent>0?"alcista":"bajista";return this._reply(`📈 **${e.symbol}** — $${(o=e.price)==null?void 0:o.toLocaleString()}
Cambio 24h: ${e.changePercent>0?"+":""}${(i=e.changePercent)==null?void 0:i.toFixed(2)}%
Tendencia: ${s}

⚠️ Para análisis completo con indicadores, carga el gráfico primero.`)}async _genStrategy(e,s){try{const o=await this._analyze(e),{ind:i,trend:p,score:a,levels:r,signals:t,price:c}=o;let m,d,n,b,g,f,l,S;a>=65&&p.aligned?(m="ema_cross",d=`Tendencia Alcista — ${e}`,n="EMA 20 > EMA 50 + RSI > 40",b="RSI > 75 o precio < EMA 50",g=Math.max(1.5,(c-r.support)/c*100).toFixed(1),f=Math.max(parseFloat(g)*2,(r.resistance-c)/c*100).toFixed(1),l="1h",S=`EMAs alineadas, Score ${a}/100.`):i.rsi<35&&t.rsiDiv==="bullish_divergence"?(m="ema_cross_rsi",d=`RSI Reversal — ${e}`,n="RSI < 30 + Divergencia alcista",b="RSI > 65",g="2",f="5",l="4h",S=`RSI ${i.rsi.toFixed(1)} con divergencia alcista.`):i.squeeze?(m="ema_cross",d=`BB Breakout — ${e}`,n="Precio rompe BB superior + volumen alto",b="Precio vuelve dentro de BB",g=(i.bbWidth/2).toFixed(1),f=(i.bbWidth*1.5).toFixed(1),l="1h",S=`BB Squeeze (${i.bbWidth.toFixed(2)}%). Explosión inminente.`):a<=35?(m="rsi",d=`Short Bajista — ${e}`,n="Rechazo en EMA 20 + RSI < 50",b="RSI < 25 o soporte",g="2",f="4",l="1h",S=`Score bajista ${a}/100.`):(m="ema_cross_rsi",d=`Range Trading — ${e}`,n=`Compra en soporte $${r.support.toFixed(2)} + RSI < 40`,b="RSI > 65 o resistencia",g=((c-r.support)/c*100+.5).toFixed(1),f=((r.resistance-c)/c*100).toFixed(1),l="1h",S=`Lateral, Score ${a}/100.`);const v=(parseFloat(f)/parseFloat(g)).toFixed(1),A={name:d,pair:e,timeframe:l,entry:{condition:n,indicator:m,params:m==="ema_cross"?{fast:20,slow:50}:{fastEma:20,slowEma:50,rsiPeriod:14,rsiOversold:30,rsiOverbought:70}},exit:{condition:b,indicator:"rsi_overbought",params:{rsiOverbought:70}},stopLoss:`${g}%`,takeProfit:`${f}%`,riskReward:`1:${v}`},$=`🎯 **ESTRATEGIA — ${e}**

**${d}**

📊 **Razón:** ${S}

**Entrada:** ${n}
**Salida:** ${b}
**SL:** ${g}% | **TP:** ${f}% | **R:R:** 1:${v}
**TF:** ${l}

Activa con el botón de abajo, o di **"crea un script"** para código de bot.`;return this._reply($,A)}catch{const o={name:`Auto — ${e}`,pair:e,timeframe:"1h",entry:{condition:"EMA Cross + RSI",indicator:"ema_cross_rsi",params:{fastEma:20,slowEma:50,rsiPeriod:14,rsiOversold:35}},exit:{condition:"RSI > 70",indicator:"rsi_overbought",params:{rsiOverbought:70}},stopLoss:"2%",takeProfit:"4%",riskReward:"1:2"};return this._reply(`🎯 **Estrategia para ${e}**

EMA Cross + RSI
SL: 2% | TP: 4% | R:R: 1:2

Activa con el botón.`,o)}}async _genScript(e,s){try{const o=await this._analyze(e),{ind:i,trend:p,score:a,levels:r}=o;let t,c;if(a>=65&&p.aligned)c=`Tendencia alcista, Score ${a}/100. EMAs alineadas.`,t=`// Tendencia Alcista — ${e}
// Generado por Kairos AI | Score: ${a}/100
// ─────────────────────────────
// EMA20: $${i.ema20.toFixed(2)} | EMA50: $${i.ema50.toFixed(2)} | RSI: ${i.rsi.toFixed(1)}

const fast = ema(20);
const slow = ema(50);
const momentum = rsi(14);
const m = macd(12, 26, 9);
const v = vwap();

// Compra: Pullback en tendencia alcista
if (close > slow && momentum > 40 && momentum < 70) {
  if (crossover(fast, slow) || (close > fast && m.histogram > 0)) {
    buy();
    log("Compra: Tendencia alcista + momentum positivo");
  }
}

// Rebote en VWAP
if (close > v && crossover(close, fast) && momentum < 60) {
  buy();
  log("Compra: Rebote VWAP");
}

// Venta: Sobrecompra o pérdida de tendencia
if (momentum > 75 || crossunder(fast, slow)) {
  sell();
  log("Venta: " + (momentum > 75 ? "RSI alto" : "Death cross"));
}

config({ stopLoss: ${Math.max(1.5,(i.ema20-r.support)/i.ema20*100).toFixed(1)}, takeProfit: ${Math.max(3,(r.resistance-i.ema20)/i.ema20*100).toFixed(1)} });`;else if(a<=35)c=`Tendencia bajista, Score ${a}/100.`,t=`// Tendencia Bajista — ${e}
// Generado por Kairos AI | Score: ${a}/100
// ─────────────────────────────

const fast = ema(20);
const slow = ema(50);
const momentum = rsi(14);
const m = macd(12, 26, 9);

// Short: rechazo de EMA en bajista
if (close < slow && momentum < 55) {
  if (crossunder(fast, slow) || (close < fast && m.histogram < 0)) {
    sell();
    log("Short: Rechazo EMA bajista");
  }
}

// Cubrir: RSI sobreventa extrema
if (momentum < 25) {
  buy();
  log("Cubrir: RSI extremo");
}

config({ stopLoss: 2, takeProfit: 4 });`;else if(i.squeeze)c="BB Squeeze detectado. Volatility breakout.",t=`// BB Breakout — ${e}
// Generado por Kairos AI | BB Width: ${i.bbWidth.toFixed(2)}%
// ─────────────────────────────

const bands = bb(20, 2);
const momentum = rsi(14);
const m = macd(12, 26, 9);

// Breakout alcista
if (close > bands.upper && momentum > 50 && momentum < 80 && m.histogram > 0) {
  buy();
  log("Breakout alcista BB");
}

// Breakout bajista
if (close < bands.lower && momentum < 50 && momentum > 20 && m.histogram < 0) {
  sell();
  log("Breakout bajista BB");
}

// Salida
if (close < bands.middle && change(close, 3) < 0) {
  sell();
  log("Salida: momentum perdido");
}

config({ stopLoss: ${(i.bbWidth/2).toFixed(1)}, takeProfit: ${(i.bbWidth*1.5).toFixed(1)} });`;else if(i.rsi<35||i.rsi>65){const d=i.rsi<35;c=`RSI ${i.rsi.toFixed(1)} — ${d?"Sobreventa":"Sobrecompra"}.`,t=`// RSI Reversal — ${e}
// Generado por Kairos AI | RSI: ${i.rsi.toFixed(1)}
// ─────────────────────────────

const momentum = rsi(14);
const fast = ema(20);
const slow = ema(50);
const m = macd(12, 26, 9);

${d?`// Compra en sobreventa
if (momentum < 30 && m.histogram > m.signal) {
  buy();
  log("Compra: RSI sobreventa + MACD girando");
}
if (momentum < 35 && crossover(fast, slow)) {
  buy();
  log("Compra: RSI bajo + Golden Cross");
}
if (momentum > 65) {
  sell();
  log("Venta: tomar ganancia");
}`:`// Venta en sobrecompra
if (momentum > 70 && m.histogram < m.signal) {
  sell();
  log("Venta: RSI sobrecompra");
}
if (momentum < 40) {
  buy();
  log("Cubrir: RSI normalizado");
}`}

config({ stopLoss: 2, takeProfit: 4.5 });`}else c=`Mercado lateral. Rango $${r.support.toFixed(2)} — $${r.resistance.toFixed(2)}.`,t=`// Rango — ${e}
// Generado por Kairos AI | Score: ${a}/100
// Soporte: $${r.support.toFixed(2)} | Resistencia: $${r.resistance.toFixed(2)}
// ─────────────────────────────

const bands = bb(20, 2);
const momentum = rsi(14);
const v = vwap();

// Compra en soporte
if (close < bands.lower && momentum < 35) {
  buy();
  log("Compra: soporte BB + RSI bajo");
}
if (crossover(close, v) && momentum < 50) {
  buy();
  log("Compra: rebote VWAP");
}

// Venta en resistencia
if (close > bands.upper && momentum > 65) {
  sell();
  log("Venta: resistencia BB + RSI alto");
}
if (momentum > 75) {
  sell();
  log("Venta: RSI sobrecompra");
}

config({ stopLoss: ${Math.max(1.5,(r.resistance-r.support)/r.support*100/3).toFixed(1)}, takeProfit: ${Math.max(2.5,(r.resistance-r.support)/r.support*100*.6).toFixed(1)} });`;const m=`💻 **KAIROS SCRIPT — ${e}**

📊 ${c}

**Cómo usar:**
1. Copia el código
2. Ve a **Bots** → Script Bot
3. Pega → Backtest → Activar

_Basado en análisis real — Score: ${a}/100_`;return this._reply(m,null,t)}catch{const o=this._genericScript(e);return this._reply(`💻 **KAIROS SCRIPT — ${e}**

Script multi-indicador profesional.

**Cómo usar:** Copia → Bots → Script Bot → Backtest → Activar`,null,o)}}_genericScript(e){return`// Multi-Indicador — ${e}
// Generado por Kairos AI
// ─────────────────────────────

const fast = ema(20);
const slow = ema(50);
const momentum = rsi(14);
const m = macd(12, 26, 9);
const bands = bb(20, 2);
const v = vwap();

// COMPRA
if (crossover(fast, slow) && momentum > 40 && momentum < 65) {
  buy();
  log("Compra: Golden Cross + RSI ok");
}
if (close < bands.lower && momentum < 30) {
  buy();
  log("Compra: Sobreventa + soporte BB");
}
if (crossover(close, v) && close > fast && momentum > 45) {
  buy();
  log("Compra: VWAP breakout");
}

// VENTA
if (crossunder(fast, slow) && momentum < 55) {
  sell();
  log("Venta: Death Cross");
}
if (momentum > 75 && close > bands.upper) {
  sell();
  log("Venta: Sobrecompra + resistencia BB");
}
if (crossunder(m.line, m.signal) && momentum > 60) {
  sell();
  log("Venta: MACD bearish cross");
}

config({ stopLoss: 2, takeProfit: 4.5 });`}_educate(e){const s=this._matchKB(e.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""));return s?this._reply(s):this._reply(`📚 Puedo enseñarte sobre:

**Indicadores:** RSI, EMA, SMA, MACD, Bollinger, VWAP, Fibonacci
**Conceptos:** Scalping, Swing, Day Trading, Tendencia, Soporte/Resistencia
**Riesgo:** Stop Loss, Take Profit, Position Sizing, Apalancamiento
**Patrones:** Doji, Engulfing, Hammer, Doble Techo, Cabeza y Hombros
**Avanzado:** Liquidez, Order Blocks, Smart Money, Volumen

Pregunta lo que quieras.`)}_matchKB(e){const s=[];for(const[o,i]of Object.entries(re))i.some(p=>e.includes(p))&&s.push(ne[o]);return s.length===0?null:`📚 **Kairos Academy**

${s.join(`

`)}

💡 _¿Quieres que analice un par usando esto? Di "Analiza" + par._`}async _openAI(e,s,o){let i="";if((o.analyze||o.strategy||o.kairosScript)&&(o.detectedPair||s!=null&&s.symbol))try{const a=await this._analyze(o.detectedPair||s.symbol);i=`

[DATOS REAL-TIME — ${a.pair}]
Precio: $${a.price}
EMA20: $${a.ind.ema20.toFixed(2)}
EMA50: $${a.ind.ema50.toFixed(2)}
RSI: ${a.ind.rsi.toFixed(1)}
MACD: ${a.ind.macdHist.toFixed(6)}
BB Width: ${a.ind.bbWidth.toFixed(2)}%
Tendencia: ${a.trend.short}/${a.trend.mid}
Score: ${a.score}/100
Soporte: $${a.levels.support.toFixed(2)}
Resistencia: $${a.levels.resistance.toFixed(2)}`}catch{}const p="Eres Kairos AI, experto de trading de Kairos Trade (Kairos 777 Inc). Responde en español. Sé directo y profesional. Usa datos reales proporcionados. Nunca des consejos financieros personales. Incluye siempre SL/TP en estrategias."+(o.kairosScript?`

Para Kairos Script:
${te}`:"");try{const a=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${this.apiKey}`},body:JSON.stringify({model:this.model,messages:[{role:"system",content:p},...this.conversationHistory.slice(-20).map(n=>({role:n.role,content:n.content+(n.role==="user"?i:"")}))],temperature:.7,max_tokens:2e3})});if(!a.ok)throw new Error("API error");const t=(await a.json()).choices[0].message.content;let c=null;o.changePair&&o.detectedPair&&(c={type:"changePair",pair:o.detectedPair});const m=t.match(/```(?:javascript|kairos|js)?\n([\s\S]*?)```/),d=m?m[1].trim():null;return this.conversationHistory.push({role:"assistant",content:t}),{text:t.replace(/```(?:javascript|kairos|js)?\n[\s\S]*?```/g,"").trim(),strategy:this._extractStrategy(t),kairosScript:d,action:c}}catch{return await this._engine(e,s,o)}}_reply(e,s=null,o=null,i=null){return this.conversationHistory.push({role:"assistant",content:e}),{text:e,strategy:s,kairosScript:o,action:i}}_extractStrategy(e){const s=e.match(/```strategy\n([\s\S]*?)```/);if(s)try{return JSON.parse(s[1])}catch{}return null}clearHistory(){this.conversationHistory=[],this._cache.clear()}}const pe=new ce;export{pe as a};
//# sourceMappingURL=ai-BWjM86FI.js.map
