const sceneText = document.getElementById("scene-text");
const choicesContainer = document.getElementById("choices");
const nextBtn = document.getElementById("next-btn");
const bgAudio = document.getElementById("bg-audio");
const notification = document.getElementById("notification");

const menu = document.getElementById("menu");
const startBtn = document.getElementById("start-btn");
const continueBtn = document.getElementById("continue-btn");
const clearBtn = document.getElementById("clear-btn");
const gameContainer = document.getElementById("game-container");

let currentScene = 0;
let flags = {
  angieAlly: false,
  skittlesPath: false
};

// Escenas
const scenes = [
  {
    text: "No creía en nada de esa basura paranormal... Hasta que llegué a Black Hollow.",
    audio: "wind.mp3",
    next: 1
  },
  {
    text: "Frente a ti, una señal de madera: 'Bienvenidos a Black Hollow'.\nElias, un anciano encorvado, te mira desde su cabaña.\nElias: '¿Buscas respuestas, chica de ciudad? ¿Vienes por los desaparecidos?'",
    choices: [
      { text: "¿Qué sabe usted de los desaparecidos?", next: 2 },
      { text: "Solo vine a investigar las pinturas. No creo en cuentos.", effect: () => notify("El anciano recordará esto."), next: 2 }
    ]
  },
  {
    text: "Elias (bajo): 'Encontraron pinturas... y algo antiguo. Algo hambriento. Escucha a las hojas. Ellas susurran la verdad.'",
    next: 3
  },
  {
    text: "Pueblo a lo lejos. Una mujer con sombrero y canasta te advierte: 'La fábrica está maldita. Y lo de la caverna... mejor no vayas sola.'",
    choices: [
      { text: "No creo en cuentos. Solo quiero investigar.", next: 4 },
      { text: "¿Qué pasó con los que fueron?", next: 4 }
    ]
  },
  {
    text: "Bosque. Sombras. Una figura aparece y desaparece.\nDe repente, Angie corre hacia ti, gritando que no respondas a las voces.",
    choices: [
      { text: "Ayudarla / Creerle", effect: () => { flags.angieAlly = true; notify("Has ganado un nuevo aliado: Angie."); }, next: 5 },
      { text: "Dudar de ella", effect: () => notify("Angie recordará esto."), next: 5 }
    ]
  },
  {
    text: "El sendero se adentra más en el bosque.",
    choices: [
      { text: "Usar Skittles como rastro", effect: () => { flags.skittlesPath = true; notify("Has desbloqueado un pequeño logro."); }, next: 6 },
      { text: "Confiar en que sabrás regresar", next: 6 }
    ]
  },
  {
    text: "Llegas a la caverna. Una voz familiar susurra tu nombre... ¡JUMPSCARE!\nTo be continued..."
  }
];

// Mostrar escena
function showScene(index) {
  saveProgress();
  const scene = scenes[index];
  sceneText.classList.remove("show");
  setTimeout(() => {
    sceneText.textContent = "";
    typeWriter(scene.text, () => {
      sceneText.classList.add("show");
    });
  }, 300);

  choicesContainer.innerHTML = "";
  nextBtn.classList.add("hidden");

  if (scene.audio) {
    bgAudio.src = scene.audio;
    bgAudio.play();
  }

  if (scene.choices) {
    scene.choices.forEach(choice => {
      const btn = document.createElement("button");
      btn.classList.add("choice-btn");
      btn.textContent = choice.text;
      btn.onclick = () => {
        if (choice.effect) choice.effect();
        currentScene = choice.next ?? scene.next;
        showScene(currentScene);
      };
      choicesContainer.appendChild(btn);
    });
  } else if (scene.next !== undefined) {
    nextBtn.classList.remove("hidden");
    nextBtn.onclick = () => {
      currentScene = scene.next;
      showScene(currentScene);
    };
  }
}

// Efecto máquina de escribir
function typeWriter(text, callback) {
  let i = 0;
  const speed = 35;
  function typing() {
    if (i < text.length) {
      sceneText.textContent += text.charAt(i);
      i++;
      setTimeout(typing, speed);
    } else if (callback) callback();
  }
  typing();
}

// Notificación en pantalla
function notify(msg) {
  notification.textContent = msg;
  notification.classList.remove("hidden");
  setTimeout(() => notification.classList.add("hidden"), 3000);
}

// Guardar progreso
function saveProgress() {
  localStorage.setItem("bh_progress", JSON.stringify({
    scene: currentScene,
    flags
  }));
}

// Cargar progreso
function loadProgress() {
  const data = localStorage.getItem("bh_progress");
  if (data) {
    const saved = JSON.parse(data);
    currentScene = saved.scene;
    flags = saved.flags;
    return true;
  }
  return false;
}

// Borrar progreso
function clearProgress() {
  localStorage.removeItem("bh_progress");
}

// Botones de menú
startBtn.onclick = () => {
  clearProgress();
  currentScene = 0;
  flags = { angieAlly: false, skittlesPath: false };
  menu.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  showScene(currentScene);
};

continueBtn.onclick = () => {
  loadProgress();
  menu.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  showScene(currentScene);
};

clearBtn.onclick = () => {
  clearProgress();
  alert("Progreso borrado.");
  continueBtn.classList.add("hidden");
  clearBtn.classList.add("hidden");
};

// Mostrar menú con opciones según progreso
if (loadProgress()) {
  continueBtn.classList.remove("hidden");
  clearBtn.classList.remove("hidden");
}
