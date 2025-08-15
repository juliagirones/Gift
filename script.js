const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");
const endScreen = document.getElementById("end-screen");
const textBox = document.getElementById("text-box");
const optionsBox = document.getElementById("options");
const nextBtn = document.getElementById("next-btn");
const bgMusic = document.getElementById("bg-music");
const sfxVoice = document.getElementById("sfx-voice");

let currentScene = 0;
let sceneIndex = 0;

const scenes = [
    // Escena 1
    {
        lines: [
            { text: "No creía en nada de esa basura paranormal... Hasta que llegué a Black Hollow." },
            { text: "Descubrimiento de pinturas en cavernas y luego...tres desaparecidos en menos de dos meses. ¿Qué está pasando en este lugar?" },
            { text: "Un anciano en la puerta de su cabaña te mira fijamente.", options: [
                { text: "¿Qué sabe usted de los desaparecidos?", result: "Lo que sé es que lo despertaron." },
                { text: "Solo vine a investigar las pinturas de las cavernas. No creo en cuentos.", result: "Tú eres una de ellos. El anciano recordará esto." }
            ] },
            { text: "Estuvieron husmeando en la caverna... encontraron algo antiguo. Algo hambriento. Escucha a las hojas. Ellas susurran la verdad." }
        ],
        music: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    // Escena 2
    {
        lines: [
            { text: "Elias sabe más de lo que dice. Habló de la fábrica y de los dibujos en las cavernas... Tengo que ir allí." }
        ],
        music: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    },
    // Escena 3
    {
        lines: [
            { text: "En lo alto de la colina ves el pueblo, la vieja fábrica y la entrada a la caverna." },
            { text: "Una mujer con sombrero y canasta se detiene.", options: [
                { text: "No creo en cuentos. Solo quiero investigar las pinturas.", result: "Eso dijeron los últimos... Si oyes voces en el bosque: no respondas." },
                { text: "¿Qué pasó con los que fueron?", result: "Uno volvió. Murió tres días después... algo lo arrastró a la oscuridad." }
            ] }
        ],
        music: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    },
    // Escena 4
    {
        lines: [
            { text: "El bosque es denso. El aire se siente extraño. Sombras se mueven entre los árboles." },
            { text: "Una figura se asoma detrás de un árbol y desaparece. ¡Hola?!", },
            { text: "Una chica aparece corriendo: '¡No lo mires! ¡No respondas! ¡No es tu voz la que escuchas…! ¡Corre!'", options: [
                { text: "Ayudarla / Creerle", result: "Has ganado un nuevo aliado: Angie." },
                { text: "¿Estás tratando de asustar a la gente?", result: "Angie recordará esto." }
            ] }
        ],
        music: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
    },
    // Escena 5
    {
        lines: [
            { text: "El sendero se estrecha. El bosque está cada vez más silencioso." },
            { text: "¿Y si no puedo volver...?", options: [
                { text: "Tengo una bolsa de Skittles…", result: "Dejas un rastro colorido detrás de ti." },
                { text: "Yo sabré regresar.", result: "Guardas los dulces y sigues caminando." }
            ] }
        ],
        music: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
    },
    // Escena 6
    {
        lines: [
            { text: "La vegetación se abre: una caverna oscura. De su interior emana un sonido húmedo... como si algo respirara." },
            { text: "Una voz susurra: 'Metu...'", action: () => playVoice("Metu...") },
            { text: "Metu se paraliza. Esa voz... no es posible. '¿Juri?'", action: () => playVoice("Juri!") },
            { text: "Un resplandor anaranjado surge del interior... Una figura alta y retorcida te observa y desaparece." }
        ],
        music: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
    }
];

function playVoice(line) {
    // Temporal: usa efecto beep, luego puedes reemplazar con tu grabación
    sfxVoice.src = "https://www.soundjay.com/buttons/sounds/beep-07a.mp3";
    sfxVoice.play();
}

function showLine() {
    const scene = scenes[currentScene];
    const line = scene.lines[sceneIndex];
    textBox.classList.remove("show");
    setTimeout(() => {
        textBox.innerText = line.text || "";
        textBox.classList.add("show");
        optionsBox.innerHTML = "";
        nextBtn.classList.remove("hidden");

        if (line.options) {
            nextBtn.classList.add("hidden");
            line.options.forEach(opt => {
                const btn = document.createElement("button");
                btn.innerText = opt.text;
                btn.onclick = () => {
                    textBox.innerText = opt.result;
                    optionsBox.innerHTML = "";
                    setTimeout(() => nextLine(), 1500);
                };
                optionsBox.appendChild(btn);
            });
        }
        if (line.action) line.action();
    }, 500);
}

function nextLine() {
    sceneIndex++;
    const scene = scenes[currentScene];
    if (sceneIndex < scene.lines.length) {
        showLine();
    } else {
        currentScene++;
        sceneIndex = 0;
        if (currentScene < scenes.length) {
            changeMusic(scenes
