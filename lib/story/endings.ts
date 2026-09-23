import type { EndingId, GameState, Line } from "./types";

export type Ending = {
  title: string;
  subtitle: string;
  color: string;
  lines: (s: GameState) => Line[];
};

export const ENDINGS: Record<EndingId, Ending> = {
  hero: {
    title: "EL HEROE DE ELDMOOR",
    subtitle: "Final 1 de 4",
    color: "#ffec27",
    lines: (s) => [
      { text: "Devuelves la Corona de Brasas al castillo. El hielo se derrite y la primavera regresa a Eldmoor." },
      s.kaelAlly
        ? { text: "Kael refunda la Orden del Alba y te nombra su primer caballero." }
        : { text: "Los bardos cantan tu nombre en cada taberna del reino." },
      s.seraHelps
        ? { text: "Sera, libre por fin de su deuda, brinda a tu salud en la Posada del Cuervo." }
        : s.savedVillagers
          ? { text: "En Brinmoor levantan una estatua en tu honor, junto al granero reconstruido." }
          : { text: "Tu leyenda apenas comienza." },
    ],
  },
  pact: {
    title: "EL PACTO OSCURO",
    subtitle: "Final 2 de 4",
    color: "#ff77a8",
    lines: () => [
      { text: "Aceptas la mano de Morvath. La Corona de Brasas arde ahora sobre tu frente." },
      { text: "El invierno se vuelve eterno. Eldmoor se arrodilla ante sus dos nuevos señores." },
      { text: "A veces, de noche, te preguntas en qué momento dejaste de ser un héroe." },
    ],
  },
  exile: {
    title: "EL EXILIADO",
    subtitle: "Final 3 de 4",
    color: "#29adff",
    lines: () => [
      { text: "Sobrevives, pero la corona sigue perdida. La nieve cubre los caminos de Eldmoor." },
      { text: "Te marchas al sur, lejos del reino que no pudiste salvar." },
      { text: "Quizá, algún día, vuelvas a intentarlo." },
    ],
  },
  fall: {
    title: "LA CAIDA",
    subtitle: "Final 4 de 4",
    color: "#ff004d",
    lines: (s) => [
      s.endingNote === "betrayed"
        ? { text: "Sera cumple su deuda con Morvath. Caes a los pies del trono, traicionado." }
        : { text: "Tus fuerzas te abandonan. Caes sobre la tierra helada." },
      { text: "Nadie recordará tu nombre. Solo una espada clavada sobre una tumba sin lápida." },
      { text: "Eldmoor seguirá esperando a su héroe." },
    ],
  },
};
