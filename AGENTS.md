# AGENTS.md

## Ejecutar

Abrir `index.html` directamente en el navegador, o usar `npx serve .` y visitar `http://localhost:3000`. No hay build ni dependencias.

## Arquitectura

- Toda la lógica vive en un solo archivo `game.js` (clases: `Ship`, `Asteroid`, `Bullet`, `Particle`).
- Canvas fijo de 800×600 con envolvimiento de bordes toroidal (todo se wrappea).
- Sin tests, sin linter, sin typecheck — verificar cambios jugando en el navegador.

## Convenciones

- Comentarios y strings de UI en español.
- Constantes de gameplay cerca de cada clase: `RADII`, `SPEEDS`, `POINTS`, `ROT`, `THRUST`, `DRAG`.

## Gotchas

- El README menciona power-ups y "estrella fugaz" que **no existen** en el código — fiarse de `game.js`.
- El tamaño del canvas está duplicado: las constantes JS `W`/`H` deben coincidir con los atributos `width`/`height` del `<canvas>` en `index.html` (cambiar solo uno rompe el wrap de bordes en silencio).
- El input es por flanco: `pressed()` consume el evento al leerlo; para input continuo usar `keys`.
- Tamaños de asteroide son 1..3 (el índice 0 de `RADII`/`SPEEDS`/`POINTS` es un placeholder); `new Asteroid(x, y)` crea uno grande por defecto.
