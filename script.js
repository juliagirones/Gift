let currentScene = 0;
let inventory = [];
let choices = {};

const scenes = [
  {
    id: 0,
    background: "beige",
    text: "No creía en nada de esa basura paranormal... Hasta que llegué a Black Hollow.",
    sound: "wind",
    next: 1
  },
  {
    id: 1,
    background: "sign",
    narration: "Descubrimiento de pinturas en cavernas y luego...tres desaparecidos en menos de dos meses. ¿Qué está pasando en este lugar?",
    next: 2
  },
  {
    id: 2,
    character: "Elias",
    text: "¿Buscas respuestas, chica de ciudad? ¿Vienes por los desaparecidos?",
    options: [
      {
        label: "¿Qué sabe usted de los desaparecidos?",
        effect: () => {
          showDialogue("Lo que sé es que lo despertaron.");
          choices["eliasTrust"] = true;
        },
        next: 3
      },
      {
        label: "Solo vine a investigar las pinturas de las cavernas. No creo en cuentos.",
        effect: () => {
          showDialogue("Tú eres una de ellos.");
          showNote("El anciano recordará esto. Desde ahora, desconfía de ti.");
          choices["eliasTrust"] = false;
        },
        next: 3
      }
    ]
  },
  {
    id: 3,
    character: "Elias",
    text: "Estuvieron husmeando en la caverna... encontraron pinturas y... Algo antiguo. Algo hambriento. Escucha a las hojas. Ellas susurran la verdad.",
    next: 4
  },
  {
    id: 4,
    background: "cabin",
    narration: "Elias sabe más de lo que dice. Habló de la fábrica. De los dibujos en las cavernas... Tengo que ir allí. De todas formas, no creo en estupideces...",
    next: 5
  },
  {
    id: 5,
    background: "hill",
    character: "Mujer",
    text: "La fábrica está maldita. Y lo de la caverna… Mejor no vayas sola. Nadie regresa igual y nadie vive para contarlo. Esto ha pasado antes.",
    options: [
      {
        label: "No creo en cuentos. Solo quiero investigar las pinturas.",
        effect: () => showDialogue("Eso dijeron los últimos... si oyes ruidos que imitan voces en el bosque: no respondas, no los escuchaste, no corras, no te escondas, no pares. Date la vuelta y regresa."),
        next: 6
      },
      {
        label: "¿Qué pasó con los que fueron?",
        effect: () => showDialogue("Uno de estos mercenarios volvió... murió tres días después, algo lo arrancó de su cama y lo arrastró a la oscuridad de la noche."),
        next: 6
      }
    ]
  },
  {
    id: 6,
    background: "forest",
    narration: "¿Qué es este lugar…? Todo se siente equivocado. Como si el aire observara.",
    effect: () => triggerScare(),
    next: 7
  },
  {
    id: 7,
    character: "Angie",
    text: "¡No lo mires! ¡No respondas! ¡No es tu voz la que escuchas…! ¡Corre!",
    options: [
      {
        label: "Ayudarla / Creerle",
        effect: () => {
          inventory.push("Página de diario con símbolos");
          choices["angie"] = true;
          showNote("Has ganado un nuevo aliado: Angie.");
        },
        next: 8
      },
      {
        label: "¿Estás tratando de asustar...? ¡Eras tú atrás del árbol!",
        effect: () => {
          choices["angie"] = false;
          showNote("Angie recordará esto.");
        },
        next: 8
      }
    ]
  },
  {
    id: 8,
    background: "deep-forest",
    text: "¿Y si no puedo volver...?",
    options: [
      {
        label: "Tengo una bolsa de Skittles… A lo Hansel y Gretel, dejo mi path.",
        effect: () => {
          inventory.push("skittles-trail");
          showNote("Has desbloqueado un pequeño logro por creatividad.");
        },
        next: 9
      },
      {
        label: "Yo sabré regresar. No es un bosque tan tan grande.",
        effect: () => showNote("Más adelante, enfrentará consecuencias si no recuerda bien el camino."),
        next: 9
      }
    ]
  },
  {
    id: 9,
    background: "cave-entrance",
    narration: "Metu, ahora sola, se detiene. La vegetación se abre paso a una caverna oscura...",
    text: "Metu...",
    effect: () => triggerJumpScare(),
    next: 10
  },
  {
    id: 10,
    text: "To be continued..."
  }
];

function showScene(id) {
  const scene = scenes.find(s => s.id === id);
  currentScene = id;
  const sceneContainer = document.getElementById("scene");
  const choicesContainer = document.getElementById("choices");
  sceneContainer.innerHTML = "";
  choicesContainer.innerHTML = "";

  if (scene.text) sceneContainer.innerText = scene.text;
  else if (scene.narration) sceneContainer.innerText = scene.narration;

  if (scene.options) {
    scene.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.innerText = opt.label;
      btn.onclick = () => {
        if (opt.effect) opt.effect();
        showScene(opt.next);
      };
      choicesContainer.appendChild(btn);
    });
  } else if (scene.next !== undefined) {
    const continueBtn = document.getElementById("continue-btn");
    continueBtn.style.display = "block";
    continueBtn.onclick = () => {
      continueBtn.style.display = "none";
      showScene(scene.next);
    };
  }
}

function showDialogue(text) {
  console.log("Diálogo:", text);
}

function showNote(note) {
  console.log("Nota:", note);
}

function triggerScare() {
  console.log("👁️ Una figura aparece entre los árboles...");
}

function triggerJumpScare() {
  console.log("💥 ¡JUMPSCARE! La figura aparece y desaparece.");
}

showScene(0);
