// ====== ELEMENTOS ======
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const startScreen = document.getElementById("start-screen");
const gameScreen  = document.getElementById("game-screen");
const endScreen   = document.getElementById("end-screen");

const background  = document.getElementById("background");
const storyBox    = document.getElementById("story-container");
const sceneLabel  = document.getElementById("scene-label");
const storyText   = document.getElementById("story-text");
const choicesDiv  = document.getElementById("choices");
const toast       = document.getElementById("toast");
const jumpscareEl = document.getElementById("jumpscare");

const bgMusic     = document.getElementById("bg-music");
const sfx         = document.getElementById("sfx");

// ====== ESTADO DEL JUGADOR ======
const state = {
  eliasDesconfia: false,
  aliadaAngie: false,
  rastroSkittles: false
};

// ====== UTILIDADES AUDIO ======
function fadeAudio(audio, target = 0.6, ms = 1800){
  const steps = 30; const dt = ms/steps;
  const dv = (target - audio.volume)/steps;
  let n=0; const it = setInterval(()=>{
    n++; audio.volume = Math.max(0, Math.min(1, audio.volume + dv));
    if(n>=steps) clearInterval(it);
  }, dt);
}
function playMusic(src, vol=0.6){
  if(!src){ bgMusic.pause(); return; }
  bgMusic.src = src; bgMusic.volume = 0;
  bgMusic.play().catch(()=>{});
  fadeAudio(bgMusic, vol, 2000);
}
function playSFX(src, vol=0.8){
  if(!src) return;
  sfx.src = src; sfx.volume = vol;
  sfx.play().catch(()=>{});
}

// ====== UI ======
function setBackground(url){
  background.style.opacity = 0;
  setTimeout(()=>{
    background.style.backgroundImage = url ? `url('${url}')` : "none";
    background.style.opacity = 1;
  }, 220);
}
function showPanel(){ storyBox.classList.add("show"); }
function hidePanel(){ storyBox.classList.remove("show"); }
function showToast(msg, ms=2400){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), ms);
}
function doJumpscare(imgUrl, soundUrl){
  jumpscareEl.style.backgroundImage = `url('${imgUrl}')`;
  jumpscareEl.classList.remove("hidden");
  requestAnimationFrame(()=>{
    jumpscareEl.style.opacity = 1;
    playSFX(soundUrl, 0.9);
    setTimeout(()=>{
      jumpscareEl.style.opacity = 0;
      setTimeout(()=>jumpscareEl.classList.add("hidden"), 200);
    }, 420);
  });
}

// ====== MAQUINA DE ESCRIBIR + GANCHOS ======
function typeText(text, {speed=36, onDone}={}){
  storyText.textContent = "";
  let i=0;
  const tick = () => {
    if(i<text.length){
      const ch = text.charAt(i);
      storyText.textContent += ch;

      // Triggers para "Metu..." y "¿Juri?"
      if(text.slice(i, i+4) === "Metu"){
        // susurro profundo
        playSFX("https://cdn.pixabay.com/download/audio/2022/03/15/audio_6e13d0ff4b.mp3?filename=whisper-dark-12483.mp3", 0.5);
      }
      if(text.slice(i, i+4) === "Juri"){
        // efecto marcador para tu futura voz
        playSFX("https://cdn.pixabay.com/download/audio/2022/03/15/audio_3e4c9f9b8a.mp3?filename=alert-sound-12482.mp3", 0.7);
      }

      i++;
      setTimeout(tick, speed);
    } else {
      onDone && onDone();
    }
  };
  tick();
}

// ====== ESTRUCTURA DE ESCENAS (RESPETA TU GUION) ======
/*
Notas:
- "scene" etiqueta visible (ESCENA 1, 2, ...).
- Se subdividen pasos internos para respetar clicks del guion.
- Algunas ramas modifican "state" y muestran toasts.
- Al final se muestra "To be continued..." en la pantalla final.
- Imágenes/sonidos: Pixabay (libres) temporales.
*/

const N = null; // helper

const nodes = {
  // INTRO (auto-avanza)
  intro: {
    scene:null,
    bg:null,
    music:"https://cdn.pixabay.com/download/audio/2022/03/15/audio_3a6461f1f6.mp3?filename=deep-dark-ambience-12481.mp3",
    text:
`EPISODIO 1

Eres Metu, una estudiante de antropología que quiere aprender de un nuevo descubrimiento el Black Hollow; pinturas en las cavernas! En tu investigación has visto los periodicos de las últimos meses, para seguir el rastro del equipo que descubrió estas pinturas. Descubres que mucha gente que ha visitado Black Hollow ha desaparecido...

Ya van 7 en los últimos dos meses.`,
    next: "1a", auto:true, pause:2800
  },

  // 🎬 ESCENA 1 — LLEGADA A BLACK HOLLOW
  "1a": {
    scene:"ESCENA 1 — LLEGADA A BLACK HOLLOW",
    bg:null, // pantalla negra
    music:"https://cdn.pixabay.com/download/audio/2021/09/14/audio_2c97acb2c3.mp3?filename=dark-wind-ambient-5981.mp3", // viento leve
    text:`"No creía en nada de esa basura paranormal... Hasta que llegué a Black Hollow."`,
    choices:[{label:"(Click para continuar)", next:"1b"}]
  },
  "1b": {
    scene:"ESCENA 1 — LLEGADA A BLACK HOLLOW",
    bg:"https://cdn.pixabay.com/photo/2020/01/12/18/24/forest-4763466_1280.jpg", // camino y bosque
    music:"https://cdn.pixabay.com/download/audio/2021/09/14/audio_2c97acb2c3.mp3?filename=dark-wind-ambient-5981.mp3",
    text:`(Metu de pie frente a una señal de madera que dice “Bienvenidos a Black Hollow”.)

(Narración - voz interna de Metu):
“Descubrimiento de pinturas en cavernas y luego...tres desaparecidos en menos de dos meses. ¿Qué está pasando en este lugar?”`,
    choices:[{label:"(Click para continuar)", next:"1c"}]
  },
  "1c": {
    scene:"ESCENA 1 — LLEGADA A BLACK HOLLOW",
    bg:"https://cdn.pixabay.com/photo/2018/08/14/13/23/people-3601885_1280.jpg", // silueta anciano
    music:"https://cdn.pixabay.com/download/audio/2022/03/15/audio_9c235a4912.mp3?filename=dark-atmosphere-12481.mp3",
    text:`(Silueta de un anciano encorvado, con bastón, en la puerta de su cabaña.)

<strong class="speaker">Elias:</strong> “¿Buscas respuestas, chica de ciudad? ¿Vienes por los desaparecidos?"`,
    choices:[
      {label:"A. [¿Qué sabe usted de los desaparecidos?]", next:"1cA"},
      {label:"B. [Solo vine a investigar las pinturas de las cavernas. No creo en cuentos.]", next:"1cB"},
    ]
  },
  "1cA": {
    scene:"ESCENA 1 — LLEGADA A BLACK HOLLOW",
    bg:"https://cdn.pixabay.com/photo/2018/08/14/13/23/people-3601885_1280.jpg",
    music:N,
    text:`<em>A.</em> Lo que sé es que lo despertaron.`,
    choices:[{label:"(Continuar)", next:"1d"}]
  },
  "1cB": {
    scene:"ESCENA 1 — LLEGADA A BLACK HOLLOW",
    bg:"https://cdn.pixabay.com/photo/2018/08/14/13/23/people-3601885_1280.jpg",
    music:N,
    text:`<em>B.</em> Tú eres una de ellos.`,
    onEnter:()=>{ state.eliasDesconfia = true; showToast("El anciano recordará esto. Desde ahora, desconfía de ti."); },
    choices:[{label:"(Continuar)", next:"1d"}]
  },
  "1d": {
    scene:"ESCENA 1 — LLEGADA A BLACK HOLLOW",
    bg:"https://cdn.pixabay.com/photo/2018/09/12/20/27/abandoned-3675474_1280.jpg", // exterior cabaña/fábrica lejana
    music:"https://cdn.pixabay.com/download/audio/2022/03/15/audio_4b4e4d2e10.mp3?filename=dark-alley-12485.mp3",
    text:`<strong class="speaker">Elias (bajo):</strong>
“Estuvieron husmeando en la caverna, con tal de encontrar cualquier cosa que puedan vender...oro, plata...encontraron pinturas y... Algo antiguo. Algo hambriento. Escucha a las hojas. Ellas susurran la verdad.”`,
    choices:[{label:"(Click para continuar)", next:"2"}]
  },

  // 🔎 ESCENA 2 — INTERIOR DE LA CASA / LIBRETA DE METU
  "2": {
    scene:"ESCENA 2 — INTERIOR DE LA CASA / LIBRETA DE METU",
    bg:"https://cdn.pixabay.com/photo/2016/11/18/16/07/cabin-1836311_1280.jpg",
    music:"https://cdn.pixabay.com/download/audio/2022/03/15/audio_4f3b808e45.mp3?filename=fireplace-crackling-12476.mp3",
    text:`(Fondo interior de la cabaña. Metu hojea su libreta de notas.)

(Narración)
“Elias sabe más de lo que dice. Habló de la fábrica. De los dibujos en las cavernas...Tengo que ir allí. De todas formas, no creo en estupideces..."`,
    choices:[
      {label:"(Click para abrir libreta)", next:"2hub"}
    ]
  },
  "2hub": {
    scene:"ESCENA 2 — INTERIOR DE LA CASA / LIBRETA DE METU",
    bg:"https://cdn.pixabay.com/photo/2016/11/18/16/07/cabin-1836311_1280.jpg",
    music:N,
    text:`(Esta parte será el HUB de pistas más adelante.)`,
    onEnter:()=> showToast("HUB de pistas (próximamente)"),
    choices:[{label:"(Salir de la cabaña)", next:"3"}]
  },

  // 🎬 ESCENA 3 — LA FÁBRICA Y LA CAVERNA
  "3": {
    scene:"ESCENA 3 — LA FÁBRICA Y LA CAVERNA",
    bg:"https://cdn.pixabay.com/photo/2018/09/12/20/27/abandoned-3675474_1280.jpg", // fábrica al fondo
    music:"https://cdn.pixabay.com/download/audio/2021/09/14/audio_316f4e8d2a.mp3?filename=dark-forest-ambience-5982.mp3", // viento + zumbido leve
    text:`(Silueta del pueblo desde la colina. Casas espaciadas. Una vieja fábrica al fondo, medio oculta entre árboles.)

(La mujer con sombrero y canasta pasa sin detenerse. Ojos apenas visibles, brillos blancos.)

<strong class="speaker">Metu:</strong> “¿Disculpe… la caverna? Y la vieja fábrica… ¿sabe cómo llegar?”

<strong class="speaker">Mujer (voz seca, sin detenerse):</strong>
“La fábrica está maldita. Y lo de la caverna… Mejor no vayas sola. Nadie regresa igual y nadie vive para contarlo. Esto ha pasado antes.”`,
    choices:[
      {label:"A. [No creo en cuentos. Solo quiero investigar las pinturas.]", next:"3A"},
      {label:"B. [¿Qué pasó con los que fueron?]", next:"3B"}
    ]
  },
  "3A": {
    scene:"ESCENA 3 — LA FÁBRICA Y LA CAVERNA",
    bg:"https://cdn.pixabay.com/photo/2018/09/12/20/27/abandoned-3675474_1280.jpg",
    music:N,
    text:`<strong class="speaker">Mujer:</strong> “Eso dijeron los últimos; que venían a investigar las cavernas. A buscar oro, plata... Pero tú escúchame bien… si oyes ruidos que imitan voces en el bosque: no respondas, no los escuchaste, no corras, no te escondas, no pares. Date la vuelta y regresa.”`,
    choices:[{label:"(Click para continuar)", next:"4"}]
  },
  "3B": {
    scene:"ESCENA 3 — LA FÁBRICA Y LA CAVERNA",
    bg:"https://cdn.pixabay.com/photo/2018/09/12/20/27/abandoned-3675474_1280.jpg",
    music:N,
    text:`<strong class="speaker">Mujer:</strong> “Uno de estos mercenarios volvió. No hablaba, no comía. Murió tres días después, algo lo arrancó de su cama y lo arrastró a la oscuridad de la noche.”`,
    choices:[{label:"(Click para continuar)", next:"4"}]
  },

  // 🎬 ESCENA 4 — PRIMER BOSQUE + APARICIÓN DE ANGIE
  "4": {
    scene:"ESCENA 4 — PRIMER BOSQUE + APARICIÓN DE ANGIE",
    bg:"https://cdn.pixabay.com/photo/2017/08/07/17/56/forest-2602383_1280.jpg",
    music:"https://cdn.pixabay.com/download/audio/2021/09/14/audio_5c9c3a81f0.mp3?filename=creepy-forest-ambience-5980.mp3",
    text:`(Árboles altos, ramas como garras. Sombras que se mueven. Caminito de tierra. Pasos sobre hojas, respiración de Metu, un silbido extraño a la distancia. Susurros de vez en cuando...)

(Visual: Silueta de Metu caminando, linterna encendida.)

(Narración):
“¿Qué es este lugar…? Todo se siente equivocado. Como si el aire observara.”

(PRIMER SUSTO: Una figura aparece brevemente detrás de un árbol, ojos blancos. Desaparece en un parpadeo.)
<strong class="speaker">Metu:</strong> “¡¿Hola?!”

(Desde el fondo aparece una chica corriendo, asustada. Se tropieza. Es Angie, pálida y sin zapatos.)
<strong class="speaker">Angie (temblando):</strong>
“¡No lo mires! ¡No respondas! ¡No es tu voz la que escuchas…! ¡Corre!”`,
    onEnter:()=>{
      // pequeño "blink" como susto breve
      setTimeout(()=>{
        doJumpscare(
          "https://cdn.pixabay.com/photo/2017/09/04/18/30/forest-2719851_1280.jpg",
          "https://cdn.pixabay.com/download/audio/2022/03/10/audio_6fbc1b9e20.mp3?filename=hit-sound-11220.mp3"
        );
      }, 1800);
    },
    choices:[
      {label:"RAMA 1: [Ayudarla / Creerle]", next:"4A"},
      {label:"RAMA 2: [¿Estás tratando de asustar...? ¡Eras tú atrás del árbol!]", next:"4B"},
    ]
  },
  "4A": {
    scene:"ESCENA 4 — PRIMER BOSQUE + APARICIÓN DE ANGIE",
    bg:"https://cdn.pixabay.com/photo/2017/08/07/17/56/forest-2602383_1280.jpg",
    music:N,
    text:`Metu la sostiene de los hombros y Angie se calma, dice que su hermano fue uno de los desaparecidos.
Entrega una página rasgada de un diario con símbolos dibujados: parecen coincidir con los de las cavernas.
Se convierte en posible aliada (más adelante puede salvarte de un susto grave).

🌀 Nota en pantalla: “Has ganado un nuevo aliado: Angie.”`,
    onEnter:()=>{ state.aliadaAngie = true; showToast("Has ganado un nuevo aliado: Angie."); },
    choices:[{label:"(Click para continuar)", next:"5"}]
  },
  "4B": {
    scene:"ESCENA 4 — PRIMER BOSQUE + APARICIÓN DE ANGIE",
    bg:"https://cdn.pixabay.com/photo/2017/08/07/17/56/forest-2602383_1280.jpg",
    music:N,
    text:`Angie se ofende, corre de donde ha venido Metu. Un grito ahogado se oye segundos después.
Pierdes una posible pista. Más adelante será más difícil entrar a la caverna.

🌀 Nota en pantalla: “Angie recordará esto.”`,
    onEnter:()=>{ state.aliadaAngie = false; showToast("Angie recordará esto."); },
    choices:[{label:"(Click para continuar)", next:"5"}]
  },

  // Escena 5 – “El Sendero Parte”
  "5": {
    scene:"ESCENA 5 — EL SENDERO PARTE",
    bg:"https://cdn.pixabay.com/photo/2015/12/01/20/28/forest-1072828_1280.jpg",
    music:"https://cdn.pixabay.com/download/audio/2022/03/15/audio_9c235a4912.mp3?filename=dark-atmosphere-12481.mp3",
    text:`La cámara muestra a Metu adentrándose más en el bosque. La vegetación es más densa. El ambiente está cada vez más silente, como si los sonidos naturales se hubieran suspendido. El viento sopla con un murmullo extraño. Metu detiene su paso, inquieta. Mira hacia atrás. El camino ya no es tan claro.

<strong class="speaker">METU (pensando):</strong>
"¿Y si no puedo volver...?"

[Decisión del jugador]`,
    choices:[
      {label:"🟡 Opción 1: “Tengo una bolsa de Skittles… A lo Hansel y Gretel, dejo mi path.”", next:"5A"},
      {label:"🔴 Opción 2: “Yo sabré regresar. No es un bosque tan tan grande.”", next:"5B"},
    ]
  },
  "5A": {
    scene:"ESCENA 5 — EL SENDERO PARTE",
    bg:"https://cdn.pixabay.com/photo/2015/12/01/20/28/forest-1072828_1280.jpg",
    music:N,
    text:`(Metu saca una bolsita de skittles de su mochila y empieza a dejar un colorido rastro detrás de ella. Suspira, aliviada. Está alerta, sus sentidos despiertos.)
→ Desbloquea un pequeño logro por creatividad y prepara el camino para un posible escape más adelante.`,
    onEnter:()=>{ state.rastroSkittles = true; showToast("Logro: Creatividad (rastro de Skittles)"); },
    choices:[{label:"(Continuar hacia la caverna)", next:"6"}]
  },
  "5B": {
    scene:"ESCENA 5 — EL SENDERO PARTE",
    bg:"https://cdn.pixabay.com/photo/2015/12/01/20/28/forest-1072828_1280.jpg",
    music:N,
    text:`(Metu se ríe para sí, un poco condescendiente. Guarda la bolsa de dulces y sigue caminando con paso firme, aunque no del todo seguro.)
→ Más adelante, enfrentará consecuencias si no recuerda bien el camino.`,
    onEnter:()=>{ state.rastroSkittles = false; },
    choices:[{label:"(Continuar hacia la caverna)", next:"6"}]
  },

  // Escena 6 – “La Voz en la Caverna” (Final del Episodio 1)
  "6": {
    scene:"ESCENA 6 — LA VOZ EN LA CAVERNA",
    bg:"https://cdn.pixabay.com/photo/2020/05/04/18/46/cave-5131785_1280.jpg",
    music:"https://cdn.pixabay.com/download/audio/2022/03/15/audio_a0450e6d9f.mp3?filename=deep-cave-ambience-12484.mp3",
    text: (()=>{
      // Ajuste sutil de estado emocional (no cambia el guion, solo añade una línea en cursiva)
      let emocional = "";
      if(state.rastroSkittles) emocional += "\n\n*Te aferras a la idea de que el rastro de Skittles te guiará de vuelta.*";
      else emocional += "\n\n*Un nudo te aprieta el pecho; ¿dejaste el camino demasiado atrás?*";
      if(!state.aliadaAngie) emocional += "\n*El grito de Angie aún vibra en tu cabeza.*";
      return `Atardecer profundo. El cielo se tiñe de morado y rojo. La brisa del bosque se vuelve helada, como si algo estuviera conteniendo el aire.
Metu, ahora sola en un sendero apenas visible, se detiene. La vegetación se abre paso a una caverna oscura, irregular y cubierta de raíces como venas petrificadas. De su interior emana un sonido sutil, húmedo… como si algo respirara.
De repente, una voz muy conocida, lejana pero nítida:

<strong class="speaker">VOZ (susurrando):</strong>
“Metu...”
Metu se paraliza. Esa voz... no es posible.
<strong class="speaker">METU (casi sin aire):</strong>
“¿Juri?”
La voz repite, esta vez más cerca:
<strong class="speaker">VOZ:</strong>
“Estoy aquí... por favor...”
Un leve resplandor anaranjado surge de las profundidades de la caverna. Algo dentro palpita.
Metu avanza un paso, lentamente.
Entonces…

💥 ¡JUMPSCARE!
Una figura alta y retorcida aparece justo en el borde de la pantalla, parcialmente iluminada por el resplandor.
Tiene una cornamenta rota, ojos huecos y un torso alargado y antinatural. Su carne parece cuarteada por el frío.
No se mueve. No respira. Solo observa. Un parpadeo… y desaparece.` + emocional + `

CORTE EN NEGRO.

TEXTO EN PANTALLA:
"To be continued..."`;
    })(),
    onEnter:()=>{
      // jumpscare al final del tipeo
      pendingJumpscare = true;
    },
    choices:[{label:"(Finalizar Episodio 1)", next:"END"}]
  }
};

// ====== MOTOR ======
let currentKey = "intro";
let pendingJumpscare = false;

function goTo(key){
  currentKey = key;

  const node = nodes[key];

  // Escena label
  if(node.scene){ sceneLabel.textContent = node.scene; } else { sceneLabel.textContent = ""; }

  // Fondo y música
  setBackground(node.bg || null);
  if(node.music !== undefined) playMusic(node.music, 0.6);

  // Mostrar panel con fade
  hidePanel();
  setTimeout(()=>showPanel(), 140);

  // Texto con máquina de escribir
  const speed = 34; // más lento para atmósfera
  pendingJumpscare = false;
  typeText(node.text, {
    speed,
    onDone: ()=>{
      // Disparar jumpscare justo cuando termina (solo en Escena 6)
      if(pendingJumpscare){
        setTimeout(()=>{
          doJumpscare(
            "https://cdn.pixabay.com/photo/2018/08/02/17/39/horror-3573167_1280.jpg",
            "https://cdn.pixabay.com/download/audio/2022/03/10/audio_6fbc1b9e20.mp3?filename=hit-sound-11220.mp3"
          );
        }, 450);
      }

      // Mostrar opciones con pequeño delay para el mood
      renderChoices(node.choices || []);
      // Auto avance de intro si corresponde
      if(node.auto){
        setTimeout(()=> goTo(node.next), node.pause || 2200);
      }
    }
  });

  // Hooks onEnter
  if(typeof node.onEnter === "function"){
    // Ejecutar tras un pequeño delay para respetar el fade
    setTimeout(()=>node.onEnter(), 420);
  }
}

function renderChoices(choices){
  choicesDiv.innerHTML = "";
  if(!choices || !choices.length) return;
  setTimeout(()=>{
    choices.forEach(ch=>{
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.textContent = ch.label;
      btn.onclick = ()=>{
        if(ch.next === "END"){
          // Pantalla final
          gameScreen.classList.add("hidden");
          endScreen.classList.remove("hidden");
          bgMusic.pause();
          return;
        }
        goTo(ch.next);
      };
      choicesDiv.appendChild(btn);
    });
  }, 650); // aparece después para dar aire
}

// ====== INICIO / REINICIO ======
startBtn.addEventListener("click", ()=>{
  // Desbloquear audio al primer clic
  playMusic(nodes.intro.music, 0.6);

  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  // Reset de estado
  state.eliasDesconfia = false;
  state.aliadaAngie   = false;
  state.rastroSkittles= false;

  goTo("intro");
});

restartBtn.addEventListener("click", ()=>{
  startScreen.classList.remove("hidden");
  endScreen.classList.add("hidden");
});
