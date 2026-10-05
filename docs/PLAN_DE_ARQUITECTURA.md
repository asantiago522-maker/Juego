# Plan de Arquitectura del Proyecto — "Neon Rush" (nombre provisional)

> Juego de carreras arcade 3D para navegador.
> **Stack:** HTML5 + JavaScript (ES Modules) + Three.js + Vite.
> **Estilo visual:** Neón / synthwave nocturno.
> **Fecha:** 2026-10-05 · **Rama de trabajo:** `arena/01a10b76-juego`

---

## 1. Decisiones técnicas fundamentales

| Decisión | Elección | Justificación |
|---|---|---|
| Motor de render | **Three.js** | 3D WebGL nativo del navegador, ligero, sin instalación para el jugador. |
| Bundler | **Vite** | Dev server instantáneo (permite vista previa en vivo) y build optimizado. |
| Físicas | **Físicas arcade propias** (sin motor de físicas pesado) | El objetivo es conducción arcade "fácil de controlar". Un modelo propio de coche (fuerzas simplificadas: aceleración, fricción, giro proporcional a velocidad, derrape opcional) da control total, es más estable y evita dependencias tipo cannon-es que aportarían complejidad innecesaria. |
| Gestión de estado | **Máquina de estados de escenas** (`StateManager`) | Flujo lineal y claro: Splash → Menú → Selección → Carrera → Resultados. Cada escena encapsula su update/render/dispose. |
| Comunicación | **EventBus** (pub/sub) | Desacopla la lógica de carrera del HUD: la carrera emite eventos (`lap_completed`, `position_changed`, `race_finished`) y la UI se suscribe. |
| Datos | **Diseño data-driven** | Personajes, coches, pistas y torneos se definen como datos (módulos JS/JSON), no como código disperso. Añadir un coche nuevo = añadir una entrada de datos. |
| Persistencia | **localStorage** vía `SaveManager` | Progreso de torneo en curso, ajustes (volumen, dificultad), mejores tiempos. |
| Input | **InputManager** unificado | Teclado + mando (Gamepad API) normalizados en acciones virtuales (`accelerate`, `brake`, `steer`, `ui_up`, `ui_ok`…). La misma navegación sirve para menús y carrera. |

---

## 2. Flujo de pantallas (máquina de estados)

```
[ SPLASH ] --fade--> [ MAIN MENU ] --+--> [ SELECCIÓN (personaje+coche) ] --+--> [ CARRERA ] --> [ RESULTADOS ] --+
     (logo animado)                   |                                      |        (vs 3 IA)        (podio/pts)    |
                                      +--> [ SELECCIÓN PISTA ] --------------+                                       |
                                      +--> [ TORNEO ] --> intro torneo --> circuito de 3 carreras --> [ CLASIFICACIÓN FINAL ]
                                      +--> [ AJUSTES ]                                                               |
                                      +--> [ SALIR ]                                                                 |
                                                                                          <---------------------------+
```

- Toda transición entre escenas usa **fade out/in** gestionado por el `SceneManager` (overlay DOM + CSS, barato y fluido).
- El Splash reproduce la animación del logo (escalado + desvanecido) y acepta "saltar" con cualquier tecla.

---

## 3. Estructura de carpetas propuesta

```
Juego/
├── index.html                  # Punto de entrada (canvas + capa UI DOM)
├── package.json / vite.config.js
├── public/
│   └── assets/                 # logo, fuentes, audio, texturas generadas/externas
└── src/
    ├── main.js                 # Bootstrap: crea GameManager y arranca SPLASH
    ├── core/
    │   ├── GameManager.js      # Ciclo de vida global, bucle de juego (requestAnimationFrame)
    │   ├── SceneManager.js     # Transiciones de escena + fades
    │   ├── EventBus.js         # Pub/sub global
    │   ├── InputManager.js     # Teclado + gamepad → acciones virtuales
    │   ├── AudioManager.js     # Música/UI/SFX (Web Audio)
    │   └── SaveManager.js      # Persistencia en localStorage
    ├── states/                 # Una clase por pantalla (todas implementan enter/update/render/exit)
    │   ├── SplashState.js
    │   ├── MainMenuState.js
    │   ├── CharacterSelectState.js
    │   ├── TrackSelectState.js
    │   ├── TournamentIntroState.js
    │   ├── RaceState.js        # Orquesta la carrera completa
    │   ├── RaceResultsState.js
    │   ├── TournamentStandingState.js
    │   └── SettingsState.js
    ├── gameplay/
    │   ├── VehicleController.js   # Modelo físico arcade del coche (input → movimiento)
    │   ├── CarFactory.js          # Instancia mesh + físico a partir de datos del coche
    │   ├── AIDriver.js            # Conductor IA: sigue waypoints, estrategia, rubber-banding
    │   ├── WaypointSystem.js      # Nodos de pista, spline Catmull-Rom, distancia de progreso
    │   ├── RaceManager.js         # Cuenta atrás, vueltas, posiciones en vivo, cronómetro, fin de carrera
    │   └── LapSystem.js           # Detección de vuelta completada por checkpoints
    ├── render/
    │   ├── SceneFactory.js        # Iluminación niebla/cielo synthwave, postprocesado básico (bloom)
    │   ├── CameraRig.js           # Cámara de persecución suave (lerp + lookahead)
    │   ├── TrackBuilder.js        # Construye malla de pista a partir de puntos de control
    │   └── CarModels.js           # Modelos low-poly procedimentales con materiales emisivos neón
    ├── ui/
    │   ├── HUD.js                 # Velocímetro, vuelta X/Y, posición, cronómetro (DOM sobre canvas)
    │   ├── MenuWidgets.js         # Botones navegables, carrusel de selección
    │   └── styles/                # CSS neón (glow con text-shadow/box-shadow)
    ├── data/
    │   ├── characters.js          # 3 personajes: avatar, historia, modificadores
    │   ├── cars.js                # 3 coches: velocidad, aceleración, manejo, peso
    │   ├── tracks.js              # 3 pistas: puntos de control, vueltas, decoración
    │   └── tournament.js          # Definición del torneo + tabla de puntos [10,7,5,3]
    └── utils/                     # math, clamp, lerp, formatTime…
```

**Principio rector:** la UI (DOM/CSS) y el mundo 3D (Three.js) viven separados y solo se hablan por eventos. El HUD nunca toca la física; la física nunca toca el DOM.

---

## 4. Modelo de datos clave

### 4.1 Coches (`data/cars.js`)
| Coche | Vel. Máxima | Aceleración | Manejo | Peso | Rol |
|---|---|---|---|---|---|
| **Vector GT** | ★★★ | ★★★ | ★★★ | Medio | Equilibrado |
| **Púlsar X** | ★★★★★ | ★★★★ | ★★ | Ligero | Velocidad pura, exigente en curvas |
| **Bastión** | ★★ | ★★ | ★★★★ | Pesado | Estable, no lo mueven los choques |

Cada coche exporta: `{ id, nombre, descripcion, stats: {velMax, acel, manejo, peso}, colorNeon, modeloId }`.

### 4.2 Personajes (`data/characters.js`)
| Personaje | Arquetipo | Historia breve | Efecto en juego |
|---|---|---|---|
| **Kai "Volt"** | Corredor Veloz | Piloto de pruebas fugado del circuito corporativo; vive para la línea recta. | +5% vel. máxima, −5% manejo |
| **Mara "Muro"** | Corredora Defensiva | Ex escolta de convoyes; nadie la saca de su trazada. | +10% resistencia a choques/empujones, +3% aceleración en salida |
| **Ren "Eje"** | Corredor Equilibrado | Mecánico de barrio que construyó su propio coche; sin debilidades. | Sin penalizaciones; +2% en todas las stats (bonus pequeño y universal) |

Cada personaje: `{ id, nombre, arquetipo, historia, avatar, modificadores: {...} }`. Los modificadores se aplican sobre las stats del coche elegido → **la combinación personaje+coche crea Builds distintas**.

### 4.3 Pistas y torneo
- **3 pistas** para el torneo (p. ej. `Circuito Skyline` — urbana rápida; `Serpentina Ámbar` — montaña con horquillas; `Autovía Fantasma` — mixta con curvas amplias), cada una definida por puntos de control que generan la malla y los waypoints automáticamente.
- **Carrera Rápida** permite elegir cualquiera de las 3 pistas, nº de vueltas fijo (config, p. ej. 3 vueltas) y corre contra **3 IA**.
- **Puntuación del torneo:** `1º = 10 · 2º = 7 · 3º = 5 · 4º = 3` (tabla en `tournament.js`, editable en Ajustes/Dificultad más adelante). Tras las 3 carreras → pantalla de **clasificación final** con puntos acumulados, podio y ganador.

---

## 5. Sistemas de carrera (el núcleo técnico)

### 5.1 Físicas arcade (`VehicleController`)
- Modelo por coche: posición, orientación (yaw), velocidad escalar + vector lateral.
- Aceleración/freno con curva de par simplificada (aceleración alta a baja velocidad, se satura cerca de `velMax`).
- Giro: radio efectivo depende de la velocidad (poco giro a muy alta velocidad → se siente arcade sin ser ingobernable).
- Derrape suave opcional (reduce agarre al girar fuerte a alta velocidad, con particles de neón).
- Colisiones contra bordes de pista: empuje hacia dentro + pérdida de velocidad (muros invisibles + guardarraíles visuales). Choques entre coches: impulso simple basado en **peso** (aquí importa el stat Peso: el Bastión no se mueve, el Púlsar sale despedido).
- Off-track: franjas fuera de pista reducen agarre/velocidad (sin resetear el coche).

### 5.2 Waypoints e IA (`WaypointSystem` + `AIDriver`)
- La pista se define por puntos de control → se genera una **spline CatmullRom** (la "racing line").
- De la spline se muestrean **nodos/waypoints** equidistantes con: posición, dirección, y anchura útil.
- Cada `AIDriver` persigue un punto objetivo por delante de su posición actual (lookahead proporcional a su velocidad), gira hacia él y regula aceleración según la curvatura próxima (frena antes de curvas cerradas).
- **Personalidad IA:** cada rival recibe pequeñas variaciones (agresivo/conservador) y un nivel de habilidad (error de trazada).
- **Rubber-banding sutil:** la IA acelera levemente si queda muy atrás y afloja si abre demasiada ventaja → carreras reñidas sin que se note.
- **Progreso de carrera:** `progreso = vuelta × longitudPista + distanciaSpline(coche)`. El ranking en vivo ordena por progreso → **leaderboard dinámico** barato y robusto (sin geometría complicada).

### 5.3 Dirección de carrera (`RaceManager`)
- Cuenta atrás 3-2-1-GO (con input bloqueado hasta GO).
- Detección de vueltas por **checkpoint secuencial** (hay que pasar por los N checkpoints en orden + línea de meta; inmune a atajos).
- Cronómetro: tiempo total + mejor vuelta + vuelta actual.
- Posiciones en tiempo real → evento `position_changed` al HUD (`2º/4`).
- Fin de carrera del jugador → congelación progresiva (cámara lenta breve) → pantalla de resultados (posición, puntos si es torneo, mejor vuelta). Las IA terminan de calcularse al instante para la tabla.

---

## 6. Fases de desarrollo

### 🟦 FASE 1 — Configuración y Menú
**Objetivo:** el juego arranca, se navega completo por menús con teclado/mando y ya "se siente" como producto.
1. Scaffold Vite + Three.js, bucle de juego, `GameManager`, `SceneManager`, `EventBus`, `InputManager` (teclado + gamepad).
2. **Splash:** logo con animación de escala + desvanecido, saltable, transición fade al menú.
3. **Menú Principal** con las 5 opciones (Carrera Rápida, Torneo, Garaje/Selección, Ajustes, Salir): navegación por teclado/mando, estética neón, música de fondo.
4. Pantalla de **Ajustes** (volumen música/SFX, vueltas por carrera, dificultad IA) con guardado en localStorage.
5. Sistema de fades entre escenas reutilizable.
6. Pantallas de selección maquetadas con **datos dummy** (se rellenarán en Fase 2).

**Criterio de aceptación:** flujo Splash → Menú → Selección → (stub de carrera) → vuelta al menú, 100% navegable con teclado y mando, sin fugas de memoria entre escenas (dispose correcto de recursos Three.js).

### 🟩 FASE 2 — Mecánicas de Conducción
**Objetivo:** conducir es divertido antes de que exista ninguna carrera.
1. `VehicleController`: física arcade completa (aceleración, freno/marcha atrás, giro dependiente de velocidad, derrape ligero, off-track).
2. `CarFactory` + 3 modelos low-poly procedimentales con materiales emisivos neón; **stats de los 3 coches** funcionando.
3. `TrackBuilder`: malla de pista procedural desde puntos de control, con guardarraíles, línea de meta y entorno synthwave (sol retro, rejilla, niebla, bloom).
4. `CameraRig`: cámara de persecución suave.
5. Pista de pruebas ("playground") para ajustar la conducción.
6. **Personajes:** datos finales (avatares + historias + modificadores) y pantalla de selección personaje+coche con vista previa 3D giratoria y barras de stats.

**Criterio de aceptación:** conducir 3 vueltas en el playground se siente fluido; los 3 coches se diferencian claramente al mando; la selección aplica correctamente stats combinadas personaje+coche.

### 🟨 FASE 3 — IA y Carreras
**Objetivo:** Carreras Rápida completa y competitiva.
1. `WaypointSystem`: spline + nodos + API de progreso.
2. `AIDriver`: seguimiento de trazada, frenado en curva, personalidades, rubber-banding, esquivado básico entre rivales.
3. `LapSystem` por checkpoints secuenciales.
4. `RaceManager`: cuenta atrás, cronómetro, ranking en vivo, detección de fin de carrera.
5. **HUD** completo: velocímetro, posición 1º-4º, vuelta X/Y, cronómetro y minimapa simple (opcional).
6. Flujo **Carrera Rápida**: selección de pista → carrera vs 3 IA → pantalla de resultados.

**Criterio de aceptación:** carrera de 3 vueltas contra 3 IA con posiciones en tiempo real correctas, sin coches atascados en la pista, con margen competitivo (el jugador puede ganar y perder según su conducción).

### 🟥 FASE 4 — Torneos y Pulido
**Objetivo:** el modo largo y el acabado final.
1. **Modo Torneo:** intro del torneo, 3 carreras consecutivas (podio corto entre carreras), puntuación 10-7-5-3, **clasificación final** con desempates.
2. `SaveManager`: progreso del torneo (permite retomar), mejores tiempos por pista.
3. Audio completo: música por escena, motor del coche, cuenta atrás, choques, podio.
4. Pulido: partículas de derrape, chispas en choques, cámara lenta de meta, banners de vuelta rápida, screen-shake sutil.
5. Rendimiento: ver 60 fps estables (draw calls, materiales compartidos), resize responsivo de UI.
6. QA de mando y accesos de teclado; balance final de IA y stats.

**Criterio de aceptación:** torneo completo de principio a fin con clasificación correcta y persistente; el juego es jugable de punta a punta sin errores en consola.

---

## 7. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| IA que se atasca o recorta pista | Checkpoints secuenciales + nodos con anchura; testing con trazado de waypoints visible (modo debug). |
| Físicas arcade que se sienten "flotantes" | Iterar primero en el playground de la Fase 2 antes de meter IA; parámetros centralizados en `data/cars.js`. |
| Fugas de memoria al cambiar de escena (Three.js) | `SceneManager.dispose()` obligatorio por escena; texturas/geometrías compartidas. |
| Rendimiento con bloom en navegadores modestos | Postprocesado opcional desde Ajustes (calidad Baja/Alta). |
| Alcance excesivo | Las fases son entregables jugables: cada una produce algo probable de probar de principio a fin. |

---

## 8. Definiciones pendientes antes de la Fase 1 (opcionales)
- Nombre definitivo del juego (provisional: **"Neon Rush"**).
- ¿Voces/locución o solo SFX? (por defecto: sin voces).
- ¿Minimapa en HUD desde Fase 3 o se descarta?
