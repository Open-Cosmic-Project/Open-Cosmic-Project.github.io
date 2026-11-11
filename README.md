# Open-Cosmic-Project.github.io

Web de la organización **Open-Cosmic-Project** (CosmicOS / SPS): Angular 22 (componentes standalone y signals), AnimeJS 4, Material 3 con vidrio líquido (*liquid glass*). Se actualiza en vivo con la actividad de la organización.

## Cómo se mantiene al día

| Qué | De dónde | Cuándo |
|---|---|---|
| Repos, estrellas, forks, licencias, lenguajes | `GET /orgs/Open-Cosmic-Project/repos` | al cargar, cada ~5 sondeos y tras eventos relevantes |
| Commits, PR, merges, issues, estrellas, forks, releases | `GET /orgs/…/events` (sondeo) | cada 60 s o lo que indique `X-Poll-Interval`; en pausa con la pestaña oculta |
| Miembros públicos | `GET /orgs/…/public_members` | al detectar eventos de comunidad |
| PR abiertas | `GET /search/issues?q=org:…+type:pr+state:open` | junto con los repos |
| Respaldo | `public/snapshot.json` | lo regenera `scripts/snapshot.mjs` en cada despliegue y cada 30 min |

- Sin servidor ni *webhooks*: el navegador sondea la API pública (60 peticiones/hora por IP sin token; las respuestas `304` no cuentan). Si se agota el límite, la web sigue con la instantánea y lo indica en la etiqueta del hero.
- La API de eventos de GitHub puede tardar entre unos segundos y varios minutos: «en vivo» es «casi en vivo».
- Los contadores se suman al instante con cada evento y se concilian con la API después, así que alguno puede corregirse solo.
- «Commits · 7 días» suma los commits de los últimos 100 eventos: es un mínimo.
- `?demo` carga `public/demo.json` (datos **inventados**) y simula eventos cada pocos segundos para probar las animaciones.

## Documentación (`/docs`)

`scripts/build-docs.mjs` convierte el repositorio **Docs** en JSON estático (`public/docs-data/`, no se versiona) en cada `npm start` / `npm run build`. Descubre solo cualquier `.md` nuevo, incluidas subcarpetas como `References/` (cada subcarpeta es una sección del índice).

- Orden: primero los archivos de la raíz según `ORDER` en el script, luego el resto alfabético; `References/` va al final.
- El título de cada página es su primer `# encabezado`; los enlaces relativos entre `.md` y las imágenes relativas se reescriben solos.
- El HTML se sanea al generarlo (sin `<script>`, sin `javascript:`), el código se resalta sin JavaScript en el cliente y `[Acordado]`, `[Propuesto]`, `[Abierto]` y `[Aplazado]` salen como etiquetas de color.
- Búsqueda en el navegador (acentos ignorados), índice lateral, tabla de contenidos, «Editar en GitHub» y anterior/siguiente.
- Local: `git clone https://github.com/Open-Cosmic-Project/Docs.git .docs-src` (o `OCP_DOCS=/ruta/a/Docs npm start`). El workflow lo clona solo.
- Las rutas `/docs/<página>` se sirven con un `404.html` que es copia de `index.html` (lo hace `postbuild`). GitHub Pages responde esas URL con código 404 aunque la página se vea bien; para indexación habría que prerenderizar.

## Desarrollo

```bash
npm ci
node scripts/snapshot.mjs      # opcional: instantánea real (GITHUB_TOKEN sube el límite)
npm start                      # http://localhost:4200  (añade ?demo para eventos simulados)
npm run build                  # dist/site/browser
```

Requiere Node ≥ 22.22.3 o 24 (lo pide el CLI de Angular 22).

## Despliegue

`.github/workflows/pages.yml` construye y publica en GitHub Pages en cada *push* a `main`, cada 30 min y a mano. Ajustes → Pages → *Source: GitHub Actions*. El repositorio debe llamarse `Open-Cosmic-Project.github.io`.

## Privacidad

Sin cookies, sin analítica y sin CDN: las fuentes (Roboto Flex y un subconjunto de Material Symbols, ~8 KB) están en `public/fonts`. Al cargar, el navegador del visitante consulta `api.github.com` y descarga avatares de `avatars.githubusercontent.com`; la web lo declara en el pie.

## Estructura

```
src/app/core/        modelos, servicio de GitHub (sondeo, eventos → feed), directivas (vidrio, tilt, ripple, reveal), widgets
src/app/sections/    hero, feed, channels, architecture, repos, community, contribute, stars (canvas)
scripts/snapshot.mjs instantánea para CI
public/              snapshot.json, demo.json, fuentes, favicon
```

Los textos de canales y arquitectura salen de la especificación de CosmicOS (secciones 7.5, 8.7 y 20.3); si cambian allí, hay que cambiarlos en `channels.ts` y `architecture.ts`.
