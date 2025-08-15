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

// Elemento <audio> opcional (no imprescindible: el motor usa Web Audio)
const htmlBgAudio = document.getElementById('bgAudio');

// ------------------ Estado
let state = {
  node: 'INTRO',          // ID del nodo actual
  flags: {
    eliasDistrust: false, // si Elias desconfía
    angieAlly: false,     // si ganaste a Angie
    skittlesPath: false,  // si dejaste Skittles
  }
};

const SAVE_KEY = 'bh_ep1_save_v2';

// ------------------ Utilidades UI
const TYPE_SPEED = 38;     // atmósfera
const BG_FADE_MS = 1200;

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

function wait(ms){ return new Promise(res=>setTimeout(res, ms)); }

// efecto máquina de escribir
async function typeText(text){
  storyText.classList.remove('typewriter');
  storyText.textContent = '';
  await new Promise(res=>setTimeout(res, 120)); // respiro
  storyText.classList.add('typewriter');
  for(let i=0;i<text.length;i++){
    storyText.textContent += text[i];
    await new Promise(res=>setTimeout(res, TYPE_SPEED));
  }
  storyText.classList.remove('typewriter');
}

// helpers de botones
function clearChoices(){
  choicesDiv.innerHTML = '';
  continueBtnInGame.classList.add('hidden');
}
function showContinue(onClick){
  continueBtnInGame.onclick = onClick;
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

// ------------------ Motor de audio (Web Audio, sin mp3 necesarios)
const Ambient = (function(){
  let ctx, master, current = null, target = null, gainA, gainB, osc, noise, noiseFilter, voiceGain;

  function ensureCtx(){
    if(!ctx){
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);

      // Dos buses de ambiente para crossfade
      gainA = ctx.createGain(); gainB = ctx.createGain();
      gainA.gain.value = 0; gainB.gain.value = 0;
      gainA.connect(master); gainB.connect(master);

      // voz/sfx
      voiceGain = ctx.createGain(); voiceGain.gain.value = 0.0; voiceGain.connect(master);
    }
  }

  function brownNoise(){
    // Fuente de ruido “suave”
    const bufferSize = 2 * (ctx.sampleRate);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // ganancia
    }
    const node = ctx.createBufferSource();
    node.buffer = noiseBuffer;
    node.loop = true;
    return node;
  }

  function buildScene(key){
    // Devuelve [sourceNode, gainNode] para enrutar a uno de los buses
    const bus = ctx.createGain();
    let src;

    if(key === 'wind_soft' || key === 'forest' || key === 'forest_quiet'){
      // Viento / bosque: ruido marrón + filtro
      src = brownNoise();
      noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = key === 'forest_quiet' ? 600 : (key === 'forest' ? 900 : 700);
      src.connect(noiseFilter); noiseFilter.connect(bus);
    }
    else if(key === 'cabin'){
      // Cabaña: tono grave + ruido bajo
      src = ctx.createOscillator(); src.type = 'sine'; src.frequency.value = 70;
      const lowGain = ctx.createGain(); lowGain.gain.value = 0.25;
      src.connect(lowGain); lowGain.connect(bus);
      // cama de aire
      const n = brownNoise(); const nf = ctx.createBiquadFilter();
      nf.type='lowpass'; nf.frequency.value = 500; n.connect(nf); nf.connect(bus); n.start();
    }
    else if(key === 'cave_breath'){
      // Caverna húmeda: seno muy grave + modulación
      src = ctx.createOscillator(); src.type='sine'; src.frequency.value = 48;
      const trem = ctx.createOscillator(); trem.frequency.value = 0.18;
      const tg = ctx.createGain(); tg.gain.value = 0.25;
      trem.connect(tg.gain); src.connect(tg); tg.connect(bus); trem.start();
    }
    else if(key === 'cave_pulse'){
      src = ctx.createOscillator(); src.type='triangle'; src.frequency.value = 55;
      const g = ctx.createGain(); g.gain.value = 0.0;
      // pulso
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.5;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.35;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      src.connect(g); g.connect(bus); lfo.start();
    }
    else if(key === 'low_boom'){
      src = ctx.createOscillator(); src.type='sine'; src.frequency.value = 32;
    }
    else {
      // fallback: viento suave
      src = brownNoise();
      const nf = ctx.createBiquadFilter(); nf.type='lowpass'; nf.frequency.value = 800;
      src.connect(nf); nf.connect(bus);
    }

    return {src, bus};
  }

  function crossfadeTo(key){
    ensureCtx();
    // preparar nueva escena en el bus inactivo
    const useA = !current || current.bus === gainB;
    const bus = useA ? gainA : gainB;
    const other = useA ? gainB : gainA;

    // Limpiar cualquier source anterior en ese bus
    if(target && target.bus === bus && target.src.stop) {
      try{ target.src.stop(); }catch(_){}
    }

    target = buildScene(key);
    target.src.loop = true;
    target.src.connect(target.bus);
    target.bus.connect(bus);
    target.src.start();

    // crossfade
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now); other.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(0.0, now);
    bus.gain.linearRampToValueAtTime(0.8, now + 1.2);
    other.gain.setValueAtTime(other.gain.value, now);
    other.gain.linearRampToValueAtTime(0.0, now + 1.0);

    current = { bus, key };
  }

  function resume(){ ensureCtx(); if(ctx.state !== 'running') ctx.resume(); }

  // “Metu…” / “¿Juri?”: susurro sintético
  function whisper(textKey){
    ensureCtx();
    const g = ctx.createGain(); g.gain.value = 0.0; g.connect(master);
    const n = brownNoise(); const bp = ctx.createBiquadFilter();
    bp.type='bandpass'; bp.frequency.value = (textKey === 'metu' ? 1400 : 1800);
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

// ------------------ Nodos del guion (SIN imágenes, opciones sin A/B)
const NODES = [
  // ---------- INTRO (sin mostrar "EPISODIO 1")
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

  // ---------- ESCENA 1 — LLEGADA
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
      {
        label:'¿Qué sabe usted de los desaparecidos?',
        next:'S1_ELIAS_A'
      },
      {
        label:'Solo vine a investigar las pinturas de las cavernas. No creo en cuentos.',
        setFlag:{ key:'eliasDistrust', value:true },
        note:'El anciano recordará esto. Desde ahora, desconfía de ti.',
        next:'S1_ELIAS_B'
      }
    ]
  },
  {
    id:'S1_ELIAS_A',
    sound:'cabin',
    text:`Elias (bajo): "Lo que sé es que lo despertaron."`,
    next:'S1_ELIAS_CONVERGE'
  },
  {
    id:'S1_ELIAS_B',
    sound:'cabin',
    text:`Elias: "Tú eres una de ellos."`,
    next:'S1_ELIAS_CONVERGE'
  },
  {
    id:'S1_ELIAS_CONVERGE',
    sound:'cabin',
    text:
`Elias (bajo):
"Estuvieron husmeando en la caverna, con tal de encontrar cualquier cosa que puedan vender... oro, plata...
Encontraron pinturas y... Algo antiguo. Algo hambriento. Escucha a las hojas. Ellas susurran la verdad. Hagas lo aue hagas no vayas al bosque ni a la fábrica."`,
    next:'S2_LIBRETA'
  },

  // ---------- ESCENA 2 — LIBRETA
  {
    id:'S2_LIBRETA',
    sound:'cabin',
    text:
`Interior de la cabaña. Metu hojea su libreta de notas.

(Narración)
"Elias sabe más de lo que dice. Habló de la fábrica. De los dibujos en las cavernas...Tengo que ir allí. De todas formas, no creo en estupideces..."`,
    next:'S3_CAMINANTE'
  },

  // ---------- ESCENA 3 — FABRICA Y CAVERNA / CAMINANTE
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
      {
        label:'No creo en cuentos. Solo quiero investigar las pinturas.',
        next:'S3_RPT_A'
      },
      {
        label:'¿Qué pasó con los que fueron?',
        next:'S3_RPT_B'
      }
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

  // ---------- ESCENA 4 — PRIMER BOSQUE + ANGIE
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
      {
        label:'Ayudarla / Creerle',
        setFlag:{ key:'angieAlly', value:true },
        note:'Has ganado un nuevo aliado: Angie.',
        next:'S4_RAM1'
      },
      {
        label:'¿Estás tratando de asustar a la gente que viene...? ¡Eras tú atrás del árbol!',
        note:'Angie recordará esto.',
        next:'S4_RAM2'
      }
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

  // ---------- ESCENA 5 — EL SENDERO PARTE
  {
    id:'S5_SENDEROS',
    sound:'forest_quiet',
    text:
`La vegetación es más densa. El ambiente está cada vez más silente, como si los sonidos naturales se hubieran suspendido.
El viento sopla con un murmullo extraño. Metu detiene su paso, inquieta. Mira hacia atrás. El camino ya no es tan claro.

METU (pensando):
"¿Y si no puedo volver...?"`,
    choices:[
      {
        label:'Tengo una bolsa de Skittles… A lo Hansel y Gretel, dejo mi path.',
        setFlag:{ key:'skittlesPath', value:true },
        note:'Logro: creatividad desbloqueada. Tal vez esto te salve después.',
        next:'S6_CAVERNA'
      },
      {
        label:'Yo sabré regresar. No es un bosque tan tan grande.',
        next:'S6_CAVERNA'
      }
    ]
  },

  // ---------- ESCENA 6 — LA VOZ EN LA CAVERNA
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

Una figura alta y retorcida aparece justo en el borde de la entrada, parcialmente iluminada por el resplandor.
Tiene una cornamenta rota, ojos huecos y un torso alargado y antinatural. Su carne parece cuarteada por el frío.
No se mueve. No respira. Solo observa. Un parpadeo… y desaparece.`,
    next:'OUTRO'
  },

  // ---------- OUTRO
  {
    id:'OUTRO',
    sound:'low_boom',
    text:`\n\n"To be continued..."`,
    end:true
  }
];

// acceso rápido por id
const NODE = Object.fromEntries(NODES.map(n=>[n.id,n]));

// ------------------ Motor
async function showNode(id){
  state.node = id;
  save();

  const node = NODE[id];

  cutToBlack(()=>{
    clearChoices();
    storyText.textContent = '';
    // Cambiar ambiente
    Ambient.crossfadeTo(node.sound || 'wind_soft');
  });

  await wait(760);
  if(node.onEnter) { try{ node.onEnter(); }catch(_){} }
  await typeText(node.text);

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
    showContinue(()=> goNext(node));
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

  Ambient.resume();           // habilita audio desde el primer clic
  if(newRun){
    state = { node:'INTRO', flags:{ eliasDistrust:false, angieAlly:false, skittlesPath:false } };
    save();
  }
  showNode(state.node);
}

function endToMenu(){
  cutToBlack(()=>{
    game.classList.add('hidden');
    menu.classList.remove('hidden');
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
  notify('Progreso borrado');
});

// Mostrar opciones de continuar si hay save
if(load()){
  continueBtn.classList.remove('hidden');
  clearBtn.classList.remove('hidden');
        }
