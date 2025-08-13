      const menu = document.getElementById('menu');
const game = document.getElementById('game');
const storyText = document.getElementById('story-text');
const choicesDiv = document.getElementById('choices');
const bg = document.getElementById('background');
const bgMusic = document.getElementById('bg-music');

let currentScene = 0;

const escenas = [
    {
        type: 'intro',
        bgImage: 'img/oscuro.jpg',
        bgSound: 'audio/viento.mp3',
        text: `EPISODIO 1\n
Eres Metu, una estudiante de antropología que quiere aprender de un nuevo descubrimiento en Black Hollow: pinturas en las cavernas. 
En tu investigación has visto los periódicos de los últimos meses, para seguir el rastro del equipo que descubrió estas pinturas. 
Descubres que mucha gente que ha visitado Black Hollow ha desaparecido...
Ya van 7 en los últimos dos meses.`,
        choices: []
    },
    {
        bgImage: 'img/bosque.jpg',
        bgSound: 'audio/bosque.mp3',
        text: "No creía en nada de esa basura paranormal... hasta que llegué a Black Hollow.",
        choices: [
            { text: "Continuar", next: 2 }
        ]
    },
    {
        bgImage: 'img/angie.jpg',
        bgSound: 'audio/fuego.mp3',
        text: "Conocí a Angie, una exploradora local que parece saber más de lo que dice...",
        choices: [
            { text: "Hablar con Angie", next: 3 }
        ]
    },
    {
        bgImage: 'img/cueva.jpg',
        bgSound: 'audio/cueva.mp3',
        text: "Te acercas a la entrada de la cueva, sintiendo un frío que te cala los huesos.",
        choices: []
    }
];

function nuevoJuego() {
    menu.classList.add('hidden');
    game.classList.remove('hidden');
    currentScene = 0;
    mostrarEscena(currentScene);
}

function continuarJuego() {
    menu.classList.add('hidden');
    game.classList.remove('hidden');
    mostrarEscena(currentScene);
}

function borrarProgreso() {
    currentScene = 0;
    alert('Progreso borrado');
}

function mostrarEscena(num) {
    const escena = escenas[num];
    
    // Fondo con fade
    bg.style.opacity = 0;
    setTimeout(() => {
        bg.style.backgroundImage = `url('${escena.bgImage}')`;
        bg.style.opacity = 1;
    }, 500);

    // Música con fade
    if (escena.bgSound) {
        bgMusic.src = escena.bgSound;
        bgMusic.volume = 0;
        bgMusic.play();
        let vol = 0;
        const fadeAudio = setInterval(() => {
            if (vol < 0.5) {
                vol += 0.02;
                bgMusic.volume = vol;
            } else {
                clearInterval(fadeAudio);
            }
        }, 100);
    }

    // Texto con efecto máquina de escribir
    storyText.innerHTML = "";
    let i = 0;
    const speed = 40; // más lento para atmósfera
    function typeWriter() {
        if (i < escena.text.length) {
            storyText.innerHTML += escena.text.charAt(i);
            i++;
            setTimeout(typeWriter, speed);
        }
    }
    typeWriter();

    // Botones
    choicesDiv.innerHTML = "";
    setTimeout(() => {
        escena.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.textContent = choice.text;
            btn.onclick = () => mostrarEscena(choice.next);
            choicesDiv.appendChild(btn);
        });
    }, escena.text.length * speed + 500);
}
