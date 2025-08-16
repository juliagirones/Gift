// ------------------ DOM
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const continueBtn = document.getElementById('continueBtn');
const clearBtn = document.getElementById('clearBtn');

const game = document.getElementById('game');
const blackFade = document.getElementById('blackFade');

const storyText = document.getElementById('storyText');
const choicesDiv = document.getElementById('choices');
const continueBtnInGame = document.getElementById('continue');
const note = document.getElementById('notification');

// Elemento <audio> opcional (no imprescindible)
const htmlBgAudio = document.getElementById('bgAudio');

// ------------------ Estado
let state = {
  node: 'INTRO',
  flags: {
    eliasDistrust: false, // si Elias desconfía
    angieAlly: false,     // si ganaste a Angie
    skittlesPath: false,  // si dejaste Skittles
    ladyKind: false,      // amabilidad con la señora (E2)
    theory: null          // 'skinwalker' | 'wendigo' (E2)
  }
};

const SAVE_KEY = 'bh_ep1_ep2_save_v1';

// ------------------ Utilidades UI
const TYPE_SPEED = 38;
function wait(ms){ return new Promise(res=>setTimeout(res, ms)); }

// notificación tipo "recordará esto"
function notify(msg){
  note.textContent = msg;
  note.classList.remove('hidden');
  requestAnimationFrame(()=>{ note.style.opacity = 1; });
  setTimeout(()=>{ note.style.opacity = 0; }, 2500);
  setTimeout(()=>{ note.classList.add('hidden'); }, 3200);
}

// fundido negro cinematográfico
function cutToBlack(onMid){
  blackFade.style.opacity = 1;
  setTimeout(()=>{
    onMid && onMid();
    blackFade.style.opacity = 0;
  }, 650);
}

// efecto máquina de escribir
async function typeText(text){
  storyText.classList.remove('typewriter');
  storyText.textContent = '';
  await wait(120);
  storyText.classList.add('typewriter');
  for(let i=0;i<text.length;i++){
    storyText.textContent += text[i];
    await wait(TYPE_SPEED);
  }
  storyText.classList.remove('typewriter');
}

// helpers de botones
function clearChoices(){
  choicesDiv.innerHTML = '';
  continueBtnInGame.classList.add('hidden');
  continueBtnInGame.textContent = 'Continuar'; // reset label
}
function showContinue(onClick, label){
  continueBtnInGame.onclick = onClick;
  continueBtnInGame.textContent = label || 'Continuar';
  continueBtnInGame.classList.remove('hidden');
}

// guardado
function save(){ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function load(){
  const raw = localStorage.getItem(SAVE_KEY);
  if(!raw) return false;
  try{
    const data = JSON.parse(raw);
    if(data && data.node) { state = data; return true; }
  }catch(_){}
  return false;
}
function clearSave(){ localStorage.removeItem(SAVE_KEY); }

// ------------------ Motor de audio (Web Audio, sin mp3)
const Ambient = (function(){
  let ctx, master, gainA, gainB, current;

  function ensureCtx(){
    if(!ctx){
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);

      gainA = ctx.createGain(); gainB = ctx.createGain();
      gainA.gain.value = 0; gainB.gain.value = 0;
      gainA.connect(master); gainB.connect(master);
    }
  }

  function brownNoise(){
    const bufferSize = 2 * (ctx.sampleRate);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }
    const node = ctx.createBufferSource();
    node.buffer = noiseBuffer;
    node.loop = true;
    return node;
  }

  function buildScene(key){
    const bus = ctx.createGain();
    let src;

    if(key === 'wind_soft' || key === 'forest' || key === 'forest_quiet'){
      src = brownNoise();
      const nf = ctx.createBiquadFilter();
      nf.type='lowpass';
      nf.frequency.value = key === 'forest_quiet' ? 600 : (key === 'forest' ? 900 : 700);
      src.connect(nf); nf.connect(bus);
    }
    else if(key === 'cabin'){
      src = ctx.createOscillator(); src.type = 'sine'; src.frequency.value = 70;
      const lowGain = ctx.createGain(); lowGain.gain.value = 0.22;
      src.connect(lowGain); lowGain.connect(bus);
      const n = brownNoise(); const nf = ctx.createBiquadFilter();
      nf.type='lowpass'; nf.frequency.value = 500; n.connect(nf); nf.connect(bus); n.start();
    }
    else if(key === 'cave_breath'){
      src = ctx.createOscillator(); src.type='sine'; src.frequency.value = 48;
      const trem = ctx.createOscillator(); trem.frequency.value = 0.18;
      const tg = ctx.createGain(); tg.gain.value = 0.25;
      trem.connect(tg.gain); src.connect(tg); tg.connect(bus); trem.start();
    }
    else if(key === 'cave_pulse'){
      src = ctx.createOscillator(); src.type='triangle'; src.frequency.value = 55;
      const g = ctx.createGain(); g.gain.value = 0.0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.5;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.35;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      src.connect(g); g.connect(bus); lfo.start();
    }
    else if(key === 'low_boom'){
      src = ctx.createOscillator(); src.type='sine'; src.frequency.value = 32;
    }
    else {
      src = brownNoise();
      const nf = ctx.createBiquadFilter(); nf.type='lowpass'; nf.frequency.value = 800;
      src.connect(nf); nf.connect(bus);
    }

    return {src, bus};
  }

  function crossfadeTo(key){
    ensureCtx();
    const useA = !current || current.bus === gainB;
    const bus = useA ? gainA : gainB;
    const other = useA ? gainB : gainA;

    const layer = buildScene(key);
    layer.src.loop = true;
    layer.src.connect(layer.bus);
    layer.bus.connect(bus);
    layer.src.start();

    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now); other.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(0.0, now);
    bus.gain.linearRampToValueAtTime(0.8, now + 1.2);
    other.gain.setValueAtTime(other.gain.value, now);
    other.gain.linearRampToValueAtTime(0.0, now + 1.0);

    current = { bus };
  }

  function resume(){ ensureCtx(); if(ctx.state !== 'running') ctx.resume(); }

  function whisper(key){
    ensureCtx();
    const g = ctx.createGain(); g.gain.value = 0.0; g.connect(master);
    const n = brownNoise(); const bp = ctx.createBiquadFilter();
    bp.type='bandpass'; bp.frequency.value = (key === 'metu' ? 1400 : 1800);
    n.connect(bp); bp.connect(g);
    n.start();
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.28, now + 0.15);
    g.gain.linearRampToValueAtTime(0.0, now + 1.2);
    setTimeout(()=>{ try{ n.stop(); }catch(_){} }, 1400);
  }

  function stinger(){
    ensureCtx();
    const g = ctx.createGain(); g.gain.value = 0.0; g.connect(master);
    const o = ctx.createOscillator(); o.type='square'; o.frequency.value = 220;
    o.connect(g); o.start();
    const n = brownNoise(); const nf = ctx.createBiquadFilter(); nf.type='highpass'; nf.frequency.value = 800;
    n.connect(nf); nf.connect(g); n.start();

    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.8, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    setTimeout(()=>{ try{o.stop(); n.stop();}catch(_){} }, 700);
  }

  return { resume, crossfadeTo, whisper, stinger };
})();

// ------------------ Nodos del guion (Ep1 + Ep2)
// - Sin imágenes
// - Opciones sin "A/B"
// - Flags: eliasDistrust, angieAlly, skittlesPath, ladyKind, theory
const NODES = [
  // ---------- EPISODIO 1 ----------
  {
    id:'INTRO',
    sound:'wind_soft',
    text:
`Eres Metu, una estudiante de antropología que quiere aprender de un nuevo descubrimiento en Black Hollow: ¡pinturas en las cavernas!

En tu investigación has visto los periódicos de los últimos meses, para seguir el rastro del equipo que descubrió estas pinturas.
Descubres que mucha gente que ha visitado Black Hollow ha desaparecido...

Ya van 7 en los últimos dos meses.`,
    next:'S1_LINEA1'
  },
  {
    id:'S1_LINEA1',
    sound:'wind_soft',
    text:`"No creía en nada de esa basura paranormal... Hasta que llegué a Black Hollow."`,
    next:'S1_VISUAL'
  },
  {
    id:'S1_VISUAL',
    sound:'wind_soft',
    text:
`Metu de pie frente a una señal de madera que dice "Bienvenidos a Black Hollow".

(Narración - voz interna de Metu):
"Descubrimiento de pinturas en cavernas y luego...siete desaparecidos en menos de dos meses. ¿Qué está pasando en este lugar?"`,
    next:'S1_ELIAS'
  },
  {
    id:'S1_ELIAS',
    sound:'cabin',
    text:
`Una silueta encorvada aparece en la puerta de su cabaña. Un anciano con bastón.

Elias: "¿Buscas respuestas, chica de ciudad? ¿Vienes por los desaparecidos?"`,
    choices:[
      { label:'¿Qué sabe usted de los desaparecidos?', next:'S1_ELIAS_A' },
      { label:'Solo vine a investigar las pinturas de las cavernas. No creo en cuentos.',
        setFlag:{ key:'eliasDistrust', value:true },
        note:'El anciano recordará esto. Desde ahora, desconfía de ti.',
        next:'S1_ELIAS_B' }
    ]
  },
  { id:'S1_ELIAS_A', sound:'cabin', text:`Elias (bajo): "Lo que sé es que lo despertaron."`, next:'S1_ELIAS_CONVERGE' },
  { id:'S1_ELIAS_B', sound:'cabin', text:`Elias: "Tú eres una de ellos."`, next:'S1_ELIAS_CONVERGE' },
  {
    id:'S1_ELIAS_CONVERGE',
    sound:'cabin',
    text:
`Elias (bajo):
"Estuvieron husmeando en la caverna, con tal de encontrar cualquier cosa que puedan vender... oro, plata...
Encontraron pinturas y... Algo antiguo. Algo hambriento. Escucha a las hojas. Ellas susurran la verdad. Hagas lo que hagas, no vayas a la caverna ni a la fábrica."`,
    next:'S2_LIBRETA'
  },
  {
    id:'S2_LIBRETA',
    sound:'cabin',
    text:
`Interior de la cabaña. Metu hojea su libreta de notas.

(Narración)
"Elias sabe más de lo que dice. Habló de la fábrica. De los dibujos en las cavernas...Tengo que ir allí. De todas formas, no creo en estupideces..."`,
    next:'S3_CAMINANTE'
  },
  {
    id:'S3_CAMINANTE',
    sound:'wind_soft',
    text:
`Silueta del pueblo desde la colina. Casas espaciadas. Una vieja fábrica al fondo, medio oculta entre árboles.

Una mujer con sombrero y canasta. Ojos apenas visibles, brillos blancos.

Metu: "¿Disculpe… la caverna? Y la vieja fábrica… ¿sabe cómo llegar?"`,
    next:'S3_OPCIONES'
  },
  {
    id:'S3_OPCIONES',
    sound:'wind_soft',
    text:
`Mujer (voz seca, sin detenerse):
"La fábrica está maldita. Y lo de la caverna… Mejor no vayas sola. Nadie regresa igual y nadie vive para contarlo. Esto ha pasado antes."`,
    choices:[
      { label:'No creo en cuentos. Solo quiero investigar las pinturas.', next:'S3_RPT_A' },
      { label:'¿Qué pasó con los que fueron?', next:'S3_RPT_B' }
    ]
  },
  {
    id:'S3_RPT_A',
    sound:'wind_soft',
    text:
`Mujer:
"Eso dijeron los últimos; que venían a investigar las cavernas. A buscar oro, plata...
Pero tú escúchame bien… si oyes ruidos que imitan voces en el bosque: no respondas, no los escuchaste, no corras, no te escondas, no pares. Date la vuelta y regresa."`,
    next:'S4_BOSQUE'
  },
  {
    id:'S3_RPT_B',
    sound:'wind_soft',
    text:
`Mujer:
"Uno de estos mercenarios volvió. No hablaba, no comía. Murió tres días después, algo lo arrancó de su cama y lo arrastró a la oscuridad de la noche."`,
    next:'S4_BOSQUE'
  },
  {
    id:'S4_BOSQUE',
    sound:'forest',
    text:
`Árboles altos, ramas como garras. Sombras que se mueven. Caminito de tierra.

(Narración):
"¿Qué es este lugar…? Todo se siente equivocado. Como si el aire observara."`,
    next:'S4_SUSTO'
  },
  {
    id:'S4_SUSTO',
    sound:'forest_quiet',
    text:
`Una figura aparece brevemente detrás de un árbol, Metu para — ojos blancos. Desaparece en un parpadeo.
Metu: "¡¿Hola?!"`,
    next:'S4_ANGIE_ENTRA'
  },
  {
    id:'S4_ANGIE_ENTRA',
    sound:'forest',
    text:
`Una chica aparece corriendo desde el fondo, asustada. Se tropieza. Es Angie, pálida y sin zapatos.
Angie (temblando):
"¡No lo mires! ¡No respondas! ¡No es tu voz la que escuchas…! ¡Corre!"`,
    next:'S4_DECISION'
  },
  {
    id:'S4_DECISION',
    sound:'forest_quiet',
    text:`¿Confías en Angie?`,
    choices:[
      { label:'Ayudarla / Creerle', setFlag:{ key:'angieAlly', value:true }, note:'Has ganado un nuevo aliado: Angie.', next:'S4_RAM1' },
      { label:'¿Estás tratando de asustar a la gente que viene...? ¡Eras tú atrás del árbol!', note:'Angie recordará esto.', next:'S4_RAM2' }
    ]
  },
  {
    id:'S4_RAM1',
    sound:'forest',
    text:
`Metu la sostiene de los hombros y Angie se calma, dice que su hermano fue uno de los desaparecidos.
Entrega una página rasgada de un diario con símbolos dibujados: parecen coincidir con los de las cavernas.`,
    next:'S5_SENDEROS'
  },
  {
    id:'S4_RAM2',
    sound:'forest',
    text:
`Angie se ofende, corre de donde ha venido Metu. Un grito ahogado se oye segundos después.
(Pierdes una posible pista. Más adelante será más difícil entrar a la caverna.)`,
    next:'S5_SENDEROS'
  },
  {
    id:'S5_SENDEROS',
    sound:'forest_quiet',
    text:
`La vegetación es más densa. El ambiente está cada vez más silente, como si los sonidos naturales se hubieran suspendido.
El viento sopla con un murmullo extraño. Metu detiene su paso, inquieta. Mira hacia atrás. El camino ya no es tan claro.

METU (pensando):
"¿Y si no puedo volver...?"`,
    choices:[
      { label:'Tengo una bolsa de Skittles… A lo Hansel y Gretel, dejo mi path.',
        setFlag:{ key:'skittlesPath', value:true },
        note:'Logro: creatividad desbloqueada. Tal vez esto te salve después.',
        next:'S6_CAVERNA' },
      { label:'Yo sabré regresar. No es un bosque tan tan grande.', next:'S6_CAVERNA' }
    ]
  },
  {
    id:'S6_CAVERNA',
    sound:'cave_breath',
    onEnter: ()=> Ambient.whisper('metu'),
    text:
`Atardecer profundo. El cielo se tiñe de morado y rojo. La brisa del bosque se vuelve helada, como si algo estuviera conteniendo el aire.
La vegetación se abre paso a una caverna oscura, irregular y cubierta de raíces como venas petrificadas. De su interior emana un sonido sutil, húmedo… como si algo respirara.

VOZ (susurrando):
"Metu..."`,
    next:'S6_VOZ2'
  },
  {
    id:'S6_VOZ2',
    sound:'cave_pulse',
    onEnter: ()=> Ambient.whisper('juri'),
    text:
`Metu se paraliza. Esa voz... no es posible.
METU (casi sin aire):
"¿Juri?"

La voz repite, esta vez más cerca:
"Estoy aquí... por favor..."`,
    next:'S6_JUMPSCARE'
  },
  {
    id:'S6_JUMPSCARE',
    sound:'cave_pulse',
    onEnter: ()=> Ambient.stinger(),
    text:
`Un leve resplandor anaranjado surge de las profundidades de la caverna. Algo dentro palpita.
Metu avanza un paso, lentamente.

Una figura alta y retorcida aparece justo en el borde de la pantalla, parcialmente iluminada por el resplandor.
Tiene una cornamenta rota, ojos huecos y un torso alargado y antinatural. Su carne parece cuarteada por el frío.
No se mueve. No respira. Solo observa. Un parpadeo… y desaparece.`,
    next:'OUTRO1'
  },
  {
    id:'OUTRO1',
    sound:'low_boom',
    text:`\n\n"To be continued..."`,
    continueLabel:'Siguiente',
    next:'EP2_TITLE'
  },

  // ---------- EPISODIO 2 ----------
  {
    id:'EP2_TITLE',
    sound:'wind_soft',
    text:`EPISODIO 2. ALGO SE ACERCA`,
    next:'EP2_INTRO'
  },
  {
    id:'EP2_INTRO',
    sound:'wind_soft',
    textFn:(st)=> {
      const elias = st.flags.eliasDistrust ? 'Elias desconfía de ti.' : 'Elias te ha contado más de lo que debería.';
      const sk = st.flags.skittlesPath ? 'Has dejado Skittles marcando el camino.' : 'No dejaste rastro alguno en el bosque.';
      const ang = st.flags.angieAlly ? 'Angie se volvió tu aliada.' : 'Perdiste a Angie como posible aliada.';
      return `Recapitulando decisiones:

• ${elias}
• ${sk}
• ${ang}

Algo se acerca.`;
    },
    next:'E2_S1_DESC'
  },

  // ESCENA 1/8 — La Fábrica
  {
    id:'E2_S1_DESC',
    sound:'wind_soft',
    text:
`[Encuentras la Fábrica]. "Es una fábrica de Tabaco… bueno, era una fábrica de Tabaco. Está muy cerca de la caverna, creo… debe estar por aquí".
[El viento sopla helado, seco. Te acercas a la ventana y logras observar que este es el primer piso. Hay tiendas de campaña adentro].`,
    choices:[
      { label:'Entrar por la ventana a explorar (romper un poco más).', next:'E2_S1_A' },
      { label:'Observar por la ventana, sin entrar.', next:'E2_S1_B' }
    ]
  },
  {
    id:'E2_S1_A',
    sound:'cabin',
    text:
`"¡Ouch! Me corté… maldita sea." [Observas que no es profundo. Niegas para tus adentros, reprochándote porque después va a arder. Sigues tu camino.]

[¿Tiendas de Campaña? Ves 3 tiendas de campaña destrozadas. Hay marcas de garras, sangre…]
"Los cuerpos fueron arrastrados" [Lo dices en voz alta, pero susurrando, como si sabes que alguien podría escuchar]

[Las paredes están repletas de grafitti… signos. Todos son signos. Tomas fotografías con tu teléfono. No son signos que has visto antes]

[Sigues caminando. Hay ropa tirada. El olor no es putrefacto, es húmedo, es un olor a urgencia y a abandono, a desesperanza y a terror. Notas que te sientes observada, estás sudando helado y lo has estado haciendo un tiempo. Tu cuerpo te ha estado enviando señales. Te grita que salgas de ahí.]

[Ves al suelo, una última mirada antes de salir… Un Diario.]

[Investigador: “Día 1. Llegamos al pueblo de Black Hollow… más bien es como una aldea pequeña. Todos son extraños. Los locales no hablan mucho. El viejo Elías nos dijo que no entráramos al bosque. Puras supersticiones. Entramos. 
Después de horas de caminar sin rumbo lo encontramos muy cerca de la fábrica, donde hemos levantado las tiendas de campaña. Lucho y Lucía se emocionaron tanto por encontrar la caverna que querían acampar ahí, pero no sabíamos qué clase de animales podríamos encontrar, así que sugerí acampar aquí adentro. Está sucio, pero al menos es cerrado. La Caverna estaba cerrada con rocas. Se notaba que esas rocas que tapaban la caverna habían sido puestas hace muchísimos años, pero por personas, no era una formación natural. Luciano y sus teorías, piensa que hay un tesoro. Lucía no, Lucía piensa que hay minerales de mucho valor y que el cierre de la caverna es para que nadie se entere. Les brillan los ojos con las posibilidades. ¿Yo? Lo pongo porque es mi diario, pero no lo diré a los chicos… Yo no sentí nada bueno. Si algo sentí, es que quería salir corriendo. Pero ya estamos aquí y si las leyendas son ciertas, la tribu que vivía aquí hace muchísimos años, tenía incontables riquezas, algo podremos sacar.”]

Metu: “O sea que sí venían a sacar oro y plata o lo que sea…”

[Investigador: Día 2. PIN-TU-RAS. ¡PINTURAS! ¡EN LAS PAREDES! Tan pronto como abrimos, no nos tomó mucho para llegar a una clase de cámara llena de pinturas. Parecen de antiguas tribus, pueblos indígenas. Increíble. Están preservadas. A mi me emocionó mucho, pero debo decir que la emoción duró poco en Lucía y jamás existió en Lucho.]

[Investigador: Día 3. La noche de ayer fue un poco diferente. Frío como siempre, pero el aire estaba seco. Sentíamos como murmuraban las hojas, pero había algo más afuera. A pesar de que estaba en mi tienda, dentro del edificio cerrado de una fábrica abandonada, sabía que no estaba solo. Esta mañana se lo he comentado a los chicos. Lucía me miró fijo. Pude ver en sus ojos que había sentido algo similar. Lucho se levantó a preparar sus cosas para ir a la caverna. No sé si es negación o solo no lo sintió.]

[Investigador: Día 4. ¡HAY ALGO EN ESA MALDITA CAVERNA! ¡ALGO NOS MIRABA DESDE ADENTRO DE LA CAVERNA, ALGO QUE… CORRIMOS… NOS…]
[El resto era ilegible, páginas arrancadas o llenas de sangre. Había escrito más, pero era imposible seguir leyendo]`,
    next:'E2_S2'
  },
  {
    id:'E2_S1_B',
    sound:'wind_soft',
    text:`[Decides no entrar.]
Pierdes una pista por miedo a entrar.`,
    next:'E2_S2'
  },

  // ESCENA 2/8 — En la cabaña
  {
    id:'E2_S2',
    sound:'cabin',
    text:
`[En la cabaña]
Metu: “Qué habrán sido esos símbolos raros en las paredes de la fábrica…”
[Notas que te sientes observada.]
“Debería ir a preguntarle a Elías… él me dijo que no fuera a la fábrica. Él sabe lo que pasó”.`,
    next:'E2_S3_ELIAS'
  },

  // ESCENA 3/8 — Elías (rama según flag eliasDistrust)
  {
    id:'E2_S3_ELIAS',
    sound:'wind_soft',
    textFn:(st)=>{
      if(st.flags.eliasDistrust){
        return `[Elías está afuera de su cabaña. Ya anocheció, pero sigue sentado en su mecedora, viendo hacia el horizonte.]

Elías te ve llegar.
Elías: “¿Qué es lo que quieres, chica de ciudad?”
Metu: “Necesito que me digas qué fue lo que sucedió en la fábrica y qué está pasando en el bosque, en la caverna... ¿Qué es esa cosa?”

Elías: “No te voy a decir nada más que lo que les dije a ellos. Vete, si no quieres ser una más”.`;
      }
      return `[Elías está afuera de su cabaña. Ya anocheció, pero sigue sentado en su mecedora, viendo hacia el horizonte.]

Elías te ve llegar.
Elías: “¿Qué es lo que quieres, chica de ciudad?”
Metu: “Necesito que me digas qué fue lo que sucedió en la fábrica y qué está pasando en el bosque, en la caverna... ¿Qué es esa cosa?”

Elías: “Está bien. Te contaré una leyenda, pues es lo que me contaba mi madre, cuando yo era niño, quien lo escuchó de su madre. Ella, mi abuela, vivió en estas montañas. Hace mucho tiempo, las gentes de este pueblo hablaban de una sombra que rondaba el bosque, y lo había hecho desde hacía muchísimo tiempo.  

Nadie lo veía. No podían. Se movía muy rápido. Pero lo sentían. Los animales callaban, pero las hojas murmuraban y muchas veces, los que entraban en el bosque, jamás regresaban.   

El abuelo de mi abuela, un hombre fuerte, un hombre sabio, encontró en una ocasión unas huellas extrañas, tan grandes que no parecían humanas, así que decidió que debía tratarse de un animal. Un oso tal vez. A medida que se acercaban más al bosque, las desapariciones eran más frecuentes, pero nunca desaparecía gente del pueblo, solo quienes se adentraban al bosque, como si algo acechara a quien entrara.  

Pero esto cambió una noche de terror. La casa 7 de la calle Willow se encuentra abandonada desde que esa cosa entró. La pequeña niña de los Willow -por eso se llama así esa calle- de 6 años en ese entonces, había estado jugando con Bobby, su perro, cuando Bobby corrió hacia el bosque en búsqueda de su pelota, la niña corrió atrás de él, ignorando los peligros que yacían en el bosque. Los Willow más tarde relataron que la niña volvió contando que había jugado en el bosque pero se había caído. Algo menor, una niña muy valiente, lo dijo sin preocupación. Antes eran así los niños…

Esa cosa llegó en la noche. Los sacó de su casa arrastrados a los dos padres y a la pequeña. Nadie escuchó nada. Pero por la cantidad de sangre, no pudo haber sido menos que agonizante; mi madre me decía que los ojos de mi abuela se llenaban de miedo, al relatar que ella misma había visto los caminos de sangre que habían dejado los Willow al ser arrastrados desde su casa hacia el bosque.  

Después de eso, llevaron a un chaman y la gente del pueblo optó por no volver a entrar a la caverna; lo que era peor, optaron por cubrir la entrada con pesadas piedras. El chamán hizo algo que mi madre desconocía y su madre temía, que se supone iba a encerrar a esa criatura para siempre. Nadie sabe qué quedó atrapado en esa cueva, pero cuando mi madre me contaba esto, yo esperaba que lo que sea que fuese, muriera ahí adentro, de hambre.  

Algo como lo que ella contaba, no debería de salir nunca de la cueva. Pero como te dije la primera vez que te vi, chica de ciudad. Lo despertaron. Lo sacaron y ahora, esa cosa sabe venir aquí, sabe salir del bosque.”`;
    },
    next:'E2_S4_MUJER'
  },

  // ESCENA 4/8 — La mujer y el perro (opciones A/B)
  {
    id:'E2_S4_MUJER',
    sound:'cabin',
    text:
`[En la Cabaña] “Qué está pasando… maldita sea. Qué frustración. Me quedo, me voy… Juri…”

[Tocan la puerta de tu cabaña y abres. Es la mujer que te dijo que no entraras al bosque. Notas que está ciega de un ojo y del otro también se está quedando ciega. Hay un perro al lado de ella que te está viendo fijamente]

Señora: “Hija. Estás en peligro. Tú y tu amigo deben irse. Tú no sabes a lo que te enfrentas.”`,
    choices:[
      { label:'“¡Váyase de aquí! ¿Me ha estado siguiendo? ¡Es por usted que me he sentido así, perseguida y acosada! Por favor déjeme en paz”.',
        next:'E2_S4_A' },
      { label:'“¿Amigo? ¿Cuál amigo? Por favor, pase…”',
        setFlag:{ key:'ladyKind', value:true },
        next:'E2_S4_B' }
    ]
  },
  {
    id:'E2_S4_A',
    sound:'cabin',
    text:`“¡Te he seguido desde que saliste de la casa de Elías! ¡Están en peligro!” 
[Metu cierra la puerta]`,
    next:'E2_S5'
  },
  {
    id:'E2_S4_B',
    sound:'cabin',
    text:
`Señora: “El investigador, hija. Tu amigo. ¿No vino contigo? Vino haciendo las mismas preguntas que tú. Ayer estuvo en la caverna y se cortó. Ambos están en peligro. Vine a advertirte.”`,
    next:'E2_S5'
  },

  // ESCENA 5/8 — Buscar al investigador o ir a la caverna
  {
    id:'E2_S5',
    sound:'wind_soft',
    text:
`Metu: [En la mañana] “Tengo que ir a ver a este investigador. Es un outsider como yo. Podemos comparar qué hemos investigado, qué hemos visto y… ¿para qué habrá venido? ¿será que es antropólogo también?”`,
    choices:[
      { label:'Voy a buscarlo.', next:'E2_S5_A' },
      { label:'Es una pérdida de tiempo. Mejor voy a la caverna y hago mi propia investigación.', next:'E2_S5_B' }
    ]
  },
  {
    id:'E2_S5_A',
    sound:'wind_soft',
    text:
`[La policía había llegado al pequeño cuarto del único hotel del pueblo. Desde donde estás, logras ver un poco de la escena; la cama estaba deshecha, había sangre en el suelo. Lo arrastraron. El marco de la puerta tiene restos de sangre también y de… ¡son uñas!]

Policía: “Por favor salga del perímetro. No vamos a contestar preguntas.”`,
    next:'E2_S6_SKITTLES'
  },
  {
    id:'E2_S5_B',
    sound:'wind_soft',
    text:
`[Caminas por el pueblo, decidida a entrar al bosque. Elías está en su mecedora y te observa…]
Elías: “Se lo llevó… Deberías de irte. No va a detenerse. Si las leyendas son ciertas, él olió su sangre y por eso se lo llevó.”`,
    next:'E2_S6_SKITTLES'
  },

  // ESCENA 6/8 — Skittles flag
  {
    id:'E2_S6_SKITTLES',
    sound:'forest',
    textFn:(st)=>{
      if(st.flags.skittlesPath){
        return `[Entras al bosque. Los skittles siguen siendo visibles. Gracias, Hansel. Gracias, Gretel.]
Metu: “No perderé el tiempo entonces. Excelente”.`;
      }
      return `[Entras al bosque. Caminas… llevas horas caminando. ¿Estás yendo en círculos? No. Esa roca es nueva… ¿O no?]`;
    },
    next:'E2_S7_CAVERNA'
  },

  // ESCENA 7/8 — Angie flag en la caverna
  {
    id:'E2_S7_CAVERNA',
    sound:'cave_breath',
    text:
`[Entrada de la Caverna] 
Metu: “¡AHÍ ESTÁ!”
[Ves al cielo. Tonos naranja y rosa… tienes un poco de tiempo. Entras a la caverna y te paralizas. ¿Y si vuelves a escuchar a Juri? No. Juri está segura en su apartamento. ¿Verdad? Te obligas a poner un pie frente al otro, hacia la caverna]
[El olor es fuerte, es innegable y te golpea justo en la cara. Un olor putrefacto, húmedo, denso, como si el aire adentro desconociera del frío silencioso del bosque]`,
    next:'E2_S7_BRANCH'
  },
  {
    id:'E2_S7_BRANCH',
    sound:'cave_breath',
    textFn:(st)=>{
      if(st.flags.angieAlly){
        return `Sacas el pedazo de papel que te dio Angie con los dibujos que había hecho su hermano antes de morir en esa misma caverna.
[Llegas a la recámara y ves pinturas, pero no parecen indígenas, parecen más recientes. Ves las instrucciones en el papel y la copia de las pinturas indígenas. Miras nuevamente a la pared y… ahí están]
Metu: “Excelente. Les tomaré foto y me voy al carajo antes de que anochezca”.`;
      }
      return `Estás buscando la recámara, pero el olor es muy fuerte. No sabes dónde puede estar. Notas el cambio en la luz… está anocheciendo.
Metu: “¡Carajo! Y sigo aquí…”
[Sacas fotos de las paredes a lo loco, ya no quieres estar ahí y… no te atreves a ir más adentro].`;
    },
    next:'E2_S8_BAR'
  },

  // ESCENA 8/8 — Bar + Teoría (flag theory)
  {
    id:'E2_S8_BAR',
    sound:'cabin',
    text:
`[Logras salir del bosque. Llegas al bar. No quieres ir a tu cabaña… te sientes observada todavía y no quieres estar sola. El dolor te recuerda que tienes un corte]
Metu: “No es grande… no es importante. Es solo un corte de vidrio”.

[Te sientas a ver las pistas que tienes, lo que te ha dicho Elías, la señora, lo que has visto en la fábrica, en la caverna… las pinturas, el perro. El investigador. Se llevó al investigador. Abres tu teléfono y ves las imágenes que has tomado]

[Después de horas, sabes que ya van a cerrar el bar porque te has quedado completamente sola otra vez, salvo por el dueño, que ya está limpiando la barra]
Metu: “Es eso… ¡Es eso! Se trata de un…”`,
    choices:[
      { label:'¡Un Skinwalker!', setFlag:{ key:'theory', value:'skinwalker' }, note:'Has decidido que se trata de un Skinwalker.', next:'E2_OUTRO' },
      { label:'¡Un Wendigo!', setFlag:{ key:'theory', value:'wendigo' }, note:'Has decidido que se trata de un Wendigo.', next:'E2_OUTRO' }
    ]
  },
  {
    id:'E2_OUTRO',
    sound:'low_boom',
    text:
`Metu: “Si es así, esta noche, se llevará a alguien más…”

“Más vale que tengas razón. To be continued…”`,
    end:true
  }
];

// índice por id
const NODE = Object.fromEntries(NODES.map(n=>[n.id,n]));

// ------------------ Motor
async function showNode(id){
  state.node = id;
  save();

  const node = NODE[id];

  cutToBlack(()=>{
    clearChoices();
    storyText.textContent = '';
    Ambient.crossfadeTo(node.sound || 'wind_soft');
  });

  await wait(760);
  if(node.onEnter) { try{ node.onEnter(); }catch(_){} }

  const text = node.textFn ? node.textFn(state) : node.text;
  await typeText(text);

  if(node.choices && node.choices.length){
    node.choices.forEach((c,i)=>{
      const btn = document.createElement('button');
      btn.className = 'choice fade-in-slow';
      btn.textContent = c.label; // sin "A/B"
      btn.style.animationDelay = `${150 + i*80}ms`;
      btn.onclick = ()=>handleChoice(c);
      choicesDiv.appendChild(btn);
    });
  } else if (node.end){
    await wait(1400);
    endToMenu();
  } else {
    await wait(300);
    showContinue(()=> goNext(node), node.continueLabel);
  }
}

function handleChoice(choice){
  Array.from(choicesDiv.children).forEach(b=>b.classList.add('disabled'));
  if(choice.setFlag){
    state.flags[choice.setFlag.key] = choice.setFlag.value;
    save();
  }
  if(choice.note){ notify(choice.note); }
  setTimeout(()=>{ showNode(choice.next); }, 680);
}

function goNext(node){
  if(node.next){ showNode(node.next); } else { endToMenu(); }
}

// ------------------ Menú / Inicio
function startGame(newRun=true){
  menu.classList.add('hidden');
  game.classList.remove('hidden');

  Ambient.resume(); // habilita audio desde el primer clic
  if(newRun){
    state = { node:'INTRO', flags:{ eliasDistrust:false, angieAlly:false, skittlesPath:false, ladyKind:false, theory:null } };
    save();
  }
  showNode(state.node);
}

function endToMenu(){
  cutToBlack(()=>{
    game.classList.add('hidden');
    menu.classList.remove('hidden');
    // Cambia título del menú si ya entraste al Ep2 (opcional)
    if(state.node && state.node.startsWith('E2_')){
      const subt = document.querySelector('.subtitle');
      if(subt) subt.textContent = 'Episodio 2: Algo se acerca';
    }
    continueBtn.classList.remove('hidden');
    clearBtn.classList.remove('hidden');
  });
}

// ------------------ Botones menú
startBtn.addEventListener('click', ()=> startGame(true));
continueBtn.addEventListener('click', ()=>{
  if(load()){ startGame(false); } else { startGame(true); }
});
clearBtn.addEventListener('click', ()=>{
  clearSave();
  continueBtn.classList.add('hidden');
  clearBtn.classList.add('hidden');
  const subt = document.querySelector('.subtitle');
  if(subt) subt.textContent = 'Episodio 1: La Voz en la Caverna';
  notify('Progreso borrado');
});

// Mostrar opciones de continuar si hay save
if(load()){
  continueBtn.classList.remove('hidden');
  clearBtn.classList.remove('hidden');
    }             
