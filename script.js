// ------------------ DOM
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const continueBtn = document.getElementById('continueBtn');
const clearBtn = document.getElementById('clearBtn');

const game = document.getElementById('game');
const bg = document.getElementById('bg');
const blackFade = document.getElementById('blackFade');

const storyText = document.getElementById('storyText');
const choicesDiv = document.getElementById('choices');
const continueBtnInGame = document.getElementById('continue');
const note = document.getElementById('notification');

const bgAudio = document.getElementById('bgAudio');

// ------------------ Estado
let state = {
  node: 'INTRO',          // ID del nodo actual
  flags: {
    eliasDistrust: false, // si Elias desconfía
    angieAlly: false,     // si ganaste a Angie
    skittlesPath: false,  // si dejaste Skittles
  }
};

const SAVE_KEY = 'bh_ep1_save_v1';

// ------------------ Utilidades UI
const TYPE_SPEED = 38;     // más lento para atmósfera
const AUDIO_TARGET = 0.45; // volumen final
const AUDIO_FADE_MS = 900;
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

// audio fade
function setBgAudio(src){
  const go = ()=>{
    bgAudio.src = src || '';
    if(!src){ return; }
    bgAudio.currentTime = 0;
    bgAudio.volume = 0;
    bgAudio.play().catch(()=>{});
    const steps = 12, step = AUDIO_TARGET/steps;
    let i=0;
    const iv = setInterval(()=>{
      i++;
      bgAudio.volume = Math.min(AUDIO_TARGET, bgAudio.volume + step);
      if(i>=steps) clearInterval(iv);
    }, AUDIO_FADE_MS/steps);
  };

  if(!bgAudio.src){
    go(); return;
  }
  // fade out previo, luego in
  const steps = 10, step = bgAudio.volume/steps;
  let i=0;
  const iv = setInterval(()=>{
    i++;
    bgAudio.volume = Math.max(0, bgAudio.volume - step);
    if(i>=steps){
      clearInterval(iv);
      bgAudio.pause();
      go();
    }
  }, AUDIO_FADE_MS/steps);
}

// fondo con fade
function setBackground(url){
  bg.style.opacity = 0;
  setTimeout(()=>{
    bg.style.backgroundImage = url ? `url("${url}")` : 'none';
    bg.style.opacity = 1;
  }, BG_FADE_MS/3);
}

// efecto máquina de escribir
async function typeText(text){
  storyText.classList.remove('typewriter');
  storyText.textContent = '';
  await new Promise(res=>setTimeout(res, 120)); // pequeña pausa
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
function save(){
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}
function load(){
  const raw = localStorage.getItem(SAVE_KEY);
  if(!raw) return false;
  try{
    const data = JSON.parse(raw);
    if(data && data.node) { state = data; return true; }
  }catch(_){}
  return false;
}
function clearSave(){
  localStorage.removeItem(SAVE_KEY);
}

// ------------------ Nodos del guion
// Cada nodo: { id, bg, audio, text, next, choices:[{label,setFlag,note,next}] }
const NODES = [
  // ---------- INTRO (perfecta como acordamos)
  {
    id:'INTRO',
    bg:'img/intro/oscuro.jpg',
    audio:'audio/amb_wind_soft_leaves.mp3',
    text:
`EPISODIO 1

Eres Metu, una estudiante de antropología que quiere aprender de un nuevo descubrimiento en Black Hollow: ¡pinturas en las cavernas!

En tu investigación has visto los periódicos de los últimos meses, para seguir el rastro del equipo que descubrió estas pinturas.
Descubres que mucha gente que ha visitado Black Hollow ha desaparecido...

Ya van 7 en los últimos dos meses.`,
    autoNextAfter: 4000, // tras terminar de escribir + 4s
    next:'S1_LINEA1'
  },

  // ---------- ESCENA 1 — LLEGADA
  {
    id:'S1_LINEA1',
    bg:'img/escena1/pantalla_negra.jpg',
    audio:'audio/amb_wind_soft_leaves.mp3',
    text:`"No creía en nada de esa basura paranormal... Hasta que llegué a Black Hollow."`,
    next:'S1_VISUAL'
  },
  {
    id:'S1_VISUAL',
    bg:'img/escena1/bienvenidos_black_hollow.jpg',
    audio:'audio/amb_wind_soft_leaves.mp3',
    text:
`Metu de pie frente a una señal de madera: "Bienvenidos a Black Hollow".

(Narración)
"Descubrimiento de pinturas en cavernas y luego... tres desaparecidos en menos de dos meses. ¿Qué está pasando en este lugar?"`,
    next:'S1_ELIAS'
  },
  {
    id:'S1_ELIAS',
    bg:'img/escena1/cabana_elias.jpg',
    audio:'audio/amb_wood_cabin_leaves.mp3',
    text:
`Una silueta encorvada aparece en la puerta de una cabaña. Un anciano con bastón.

Elias: "¿Buscas respuestas, chica de ciudad? ¿Vienes por los desaparecidos?"`,
    choices:[
      {
        label:'A. ¿Qué sabe usted de los desaparecidos?',
        next:'S1_ELIAS_A'
      },
      {
        label:'B. Solo vine a investigar las pinturas de las cavernas. No creo en cuentos.',
        setFlag:{ key:'eliasDistrust', value:true },
        note:'El anciano recordará esto. Desde ahora, desconfía de ti.',
        next:'S1_ELIAS_B'
      }
    ]
  },
  {
    id:'S1_ELIAS_A',
    bg:'img/escena1/cabana_elias.jpg',
    audio:'audio/amb_wood_cabin_leaves.mp3',
    text:`Elias (bajo): "Lo que sé es que lo despertaron."`,
    next:'S1_ELIAS_CONVERGE'
  },
  {
    id:'S1_ELIAS_B',
    bg:'img/escena1/cabana_elias.jpg',
    audio:'audio/amb_wood_cabin_leaves.mp3',
    text:`Elias: "Tú eres una de ellos."`,
    next:'S1_ELIAS_CONVERGE'
  },
  {
    id:'S1_ELIAS_CONVERGE',
    bg:'img/escena1/cabana_elias_int.jpg',
    audio:'audio/amb_cabin_low_whispers.mp3',
    text:
`Elias (bajo):
"Estuvieron husmeando en la caverna, con tal de encontrar cualquier cosa que puedan vender... oro, plata...
Encontraron pinturas y... Algo antiguo. Algo hambriento. Escucha a las hojas. Ellas susurran la verdad."`,
    next:'S2_LIBRETA'
  },

  // ---------- ESCENA 2 — LIBRETA
  {
    id:'S2_LIBRETA',
    bg:'img/escena2/interior_cabana_libreta.jpg',
    audio:'audio/amb_room_paper_turn.mp3',
    text:
`Interior de la cabaña. Metu hojea su libreta de notas.

(Narración)
"Elias sabe más de lo que dice. Habló de la fábrica. De los dibujos en las cavernas... Tengo que ir allí. De todas formas, no creo en estupideces..."`,
    // En el futuro este nodo abrirá HUB de pistas
    next:'S3_CAMINANTE'
  },

  // ---------- ESCENA 3 — FABRICA Y CAVERNA / CAMINANTE
  {
    id:'S3_CAMINANTE',
    bg:'img/escena3/pueblo_colina_fabrica.jpg',
    audio:'audio/amb_wind_stronger_drone.mp3',
    text:
`Silueta del pueblo desde la colina. Casas espaciadas. Una vieja fábrica al fondo, medio oculta entre árboles.

Una mujer con sombrero y canasta pasa sin detenerse. Sus ojos brillan en blanco apenas visibles.

Metu: "¿Disculpe… la caverna? Y la vieja fábrica… ¿sabe cómo llegar?"`,
    next:'S3_OPCIONES'
  },
  {
    id:'S3_OPCIONES',
    bg:'img/escena3/caminante_mujer.jpg',
    audio:'audio/amb_wind_stronger_drone.mp3',
    text:
`Mujer (voz seca):
"La fábrica está maldita. Y lo de la caverna… Mejor no vayas sola. Nadie regresa igual y nadie vive para contarlo. Esto ha pasado antes."`,
    choices:[
      {
        label:'A. No creo en cuentos. Solo quiero investigar las pinturas.',
        next:'S3_RPT_A'
      },
      {
        label:'B. ¿Qué pasó con los que fueron?',
        next:'S3_RPT_B'
      }
    ]
  },
  {
    id:'S3_RPT_A',
    bg:'img/escena3/caminante_mujer.jpg',
    audio:'audio/amb_wind_stronger_drone.mp3',
    text:
`Mujer:
"Eso dijeron los últimos; que venían a investigar las cavernas. A buscar oro, plata...
Pero tú escúchame bien… si oyes ruidos que imitan voces en el bosque: no respondas, no los escuchaste, no corras, no te escondas, no pares. Date la vuelta y regresa."`,
    next:'S4_BOSQUE'
  },
  {
    id:'S3_RPT_B',
    bg:'img/escena3/caminante_mujer.jpg',
    audio:'audio/amb_wind_stronger_drone.mp3',
    text:
`Mujer:
"Uno de estos mercenarios volvió. No hablaba, no comía. Murió tres días después...
Algo lo arrancó de su cama y lo arrastró a la oscuridad de la noche."`,
    next:'S4_BOSQUE'
  },

  // ---------- ESCENA 4 — PRIMER BOSQUE + ANGIE
  {
    id:'S4_BOSQUE',
    bg:'img/escena4/bosque_sombras.jpg',
    audio:'audio/amb_forest_steps_breath_whistle.mp3',
    text:
`Árboles altos, ramas como garras. Sombras que se mueven. Un caminito de tierra.

(Narración)
"¿Qué es este lugar…? Todo se siente equivocado. Como si el aire observara."`,
    next:'S4_SUSTO'
  },
  {
    id:'S4_SUSTO',
    bg:'img/escena4/bosque_ojos_blan\0cos.jpg',
    audio:'audio/stinger_soft_whisper.mp3',
    text:
`Una figura aparece brevemente detrás de un árbol: ojos blancos. Desaparece en un parpadeo.

Metu: "¡¿Hola?!"`,
    next:'S4_ANGIE_ENTRA'
  },
  {
    id:'S4_ANGIE_ENTRA',
    bg:'img/escena4/angie_corriendo.jpg',
    audio:'audio/amb_forest_run_panicked.mp3',
    text:
`Una chica aparece corriendo desde el fondo, asustada. Se tropieza. Es Angie, pálida y sin zapatos.

Angie (temblando):
"¡No lo mires! ¡No respondas! ¡No es tu voz la que escuchas…! ¡Corre!"`,
    next:'S4_DECISION'
  },
  {
    id:'S4_DECISION',
    bg:'img/escena4/angie_close.jpg',
    audio:'audio/amb_forest_low_heartbeat.mp3',
    text:`¿Confías en Angie?`,
    choices:[
      {
        label:'[Ayudarla / Creerle]',
        setFlag:{ key:'angieAlly', value:true },
        note:'Has ganado un nuevo aliado: Angie.',
        next:'S4_RAM1'
      },
      {
        label:'[¿Estás tratando de asustar a la gente...? ¡Eras tú atrás del árbol!]',
        note:'Angie recordará esto.',
        next:'S4_RAM2'
      }
    ]
  },
  {
    id:'S4_RAM1',
    bg:'img/escena4/angie_alivio.jpg',
    audio:'audio/amb_forest_calm.mp3',
    text:
`Metu la sostiene de los hombros. Angie se calma.

"Mi hermano fue uno de los desaparecidos..." —entrega una página rasgada de un diario con símbolos que coinciden con los de las cavernas.`,
    next:'S5_SENDEROS'
  },
  {
    id:'S4_RAM2',
    bg:'img/escena4/angie_huye.jpg',
    audio:'audio/amb_forest_run_away.mp3',
    text:
`Angie se ofende y corre de donde ha venido Metu.

Segundos después, un grito ahogado se escucha a lo lejos.

(Pierdes una posible pista. Más adelante será más difícil entrar a la caverna.)`,
    next:'S5_SENDEROS'
  },

  // ---------- ESCENA 5 — EL SENDERO PARTE
  {
    id:'S5_SENDEROS',
    bg:'img/escena5/bosque_denso.jpg',
    audio:'audio/amb_forest_quiet_odd_wind.mp3',
    text:
`La vegetación es más densa. El ambiente se vuelve silente, como si los sonidos naturales se hubieran suspendido.

Viento con un murmullo extraño. Metu mira hacia atrás: el camino ya no es tan claro.

Metu (pensando):
"¿Y si no puedo volver...?"`,
    choices:[
      {
        label:'🟡 "Tengo una bolsa de Skittles… A lo Hansel y Gretel, dejo mi path."',
        setFlag:{ key:'skittlesPath', value:true },
        note:'Logro: creatividad desbloqueada. Tal vez esto te salve después.',
        next:'S6_CAVERNA'
      },
      {
        label:'🔴 "Yo sabré regresar. No es un bosque tan tan grande."',
        next:'S6_CAVERNA'
      }
    ]
  },

  // ---------- ESCENA 6 — LA VOZ EN LA CAVERNA
  {
    id:'S6_CAVERNA',
    bg:'img/escena6/entrada_caverna_atardecer.jpg',
    audio:'audio/amb_cave_moist_breath.mp3',
    text:
`Atardecer profundo. El cielo se tiñe de morado y rojo. La brisa del bosque se vuelve helada.

La vegetación abre paso a una caverna oscura, cubierta de raíces como venas petrificadas.
Del interior emana un sonido sutil, húmedo… como si algo respirara.

Voz (susurrando):
"Metu..."`,
    next:'S6_VOZ2'
  },
  {
    id:'S6_VOZ2',
    bg:'img/escena6/entrada_caverna_brillo.jpg',
    audio:'audio/amb_cave_pulse.mp3',
    text:
`Metu se paraliza. Esa voz... no es posible.

Metu (casi sin aire):
"¿Juri?"

La voz repite, más cerca:
"Estoy aquí... por favor..."`,
    next:'S6_JUMPSCARE'
  },
  {
    id:'S6_JUMPSCARE',
    bg:'img/escena6/caverna_jumpscare_frame.jpg',
    audio:'audio/stinger_jumpscare.mp3',
    text:
`Un leve resplandor anaranjado surge desde el fondo. Algo dentro palpita.

Metu avanza un paso, lentamente.

¡JUMPSCARE! Una figura alta y retorcida aparece en el borde de la pantalla:
Cornamenta rota, ojos huecos, torso alargado, carne cuarteada por el frío.
No se mueve. No respira. Solo observa. Un parpadeo… y desaparece.`,
    next:'OUTRO'
  },

  // ---------- OUTRO
  {
    id:'OUTRO',
    bg:'img/outro/negro.jpg',
    audio:'audio/amb_low_sub_boom.mp3',
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
  // Cinematic cut: negro -> cambiar -> aparece
  cutToBlack(()=>{
    setBackground(node.bg);
    setBgAudio(node.audio);
    clearChoices();
    storyText.textContent = '';
  });

  // retraso de fade para que el negro se levante suavemente
  await wait(760);

  await typeText(node.text);

  if(node.choices && node.choices.length){
    // mostrar opciones con fade lento
    node.choices.forEach((c,i)=>{
      const btn = document.createElement('button');
      btn.className = 'choice fade-in-slow';
      btn.textContent = c.label;
      btn.style.animationDelay = `${150 + i*80}ms`;
      btn.onclick = ()=>handleChoice(c);
      choicesDiv.appendChild(btn);
    });
  } else if (node.end){
    // final: mostrar menú tras breve pausa
    await wait(1400);
    endToMenu();
  } else {
    // botón continuar (más lento para respirar la escena)
    await wait(300);
    showContinue(()=>{
      if(node.autoNextAfter){
        // si hubiera autoNext, no mostramos continuar (pero aquí por guion no aplica)
      }
      goNext(node);
    });
  }

  // auto avance tras intro (respetando tu pedido)
  if(node.autoNextAfter){
    continueBtnInGame.classList.add('hidden');
    setTimeout(()=>{ goNext(node); }, node.text.length*TYPE_SPEED + node.autoNextAfter);
  }
}

function handleChoice(choice){
  // bloquear más clicks
  Array.from(choicesDiv.children).forEach(b=>b.classList.add('disabled'));

  if(choice.setFlag){
    state.flags[choice.setFlag.key] = choice.setFlag.value;
    save();
  }
  if(choice.note){
    notify(choice.note);
  }
  // transición lenta antes de avanzar
  setTimeout(()=>{ showNode(choice.next); }, 680);
}

function goNext(node){
  if(node.next){
    showNode(node.next);
  }else{
    // seguridad
    endToMenu();
  }
}

function wait(ms){ return new Promise(res=>setTimeout(res, ms)); }

// ------------------ Menú / Inicio
function startGame(newRun=true){
  menu.classList.add('hidden');
  game.classList.remove('hidden');

  if(newRun){
    state = { node:'INTRO', flags:{ eliasDistrust:false, angieAlly:false, skittlesPath:false } };
    save();
  }
  showNode(state.node);
}

function endToMenu(){
  // fundir a negro y volver al menú
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
  if(load()){
    startGame(false);
  }else{
    // si no hay save, comienza nuevo
    startGame(true);
  }
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

// Al escribir, ofrecer "Continuar" si no hay choices/autoNext
function showContinue(onClick){
  continueBtnInGame.onclick = onClick;
  continueBtnInGame.classList.remove('hidden');
      }
