# Luzaron Games

PWA offline-first para iPad, pensada para uso privado familiar.

## Arquitectura

La app separa:

- `index.html`: carcasa de la aplicación.
- `manifest.json`: instalación como PWA.
- `service-worker.js`: caché de archivos estáticos y funcionamiento offline.
- `app/`: shell, ruteo, perfiles, almacenamiento y sincronización.
- `games/queens/`: motor, reglas, UI y carga de niveles de Queens.
- `seed-data/`: niveles iniciales disponibles desde la primera instalación.
- `levels/`: ejemplo de manifest remoto y paquetes descargables.

Los niveles no están en HTML. Viven en JSON y se guardan localmente en IndexedDB.

## Ejecutar localmente

Desde la carpeta del proyecto:

```bash
python -m http.server 8080
```

Abre:

```text
http://localhost:8080
```

Importante: no abras `index.html` directo con doble clic, porque el Service Worker necesita HTTP o HTTPS.

## Servirlo en privado

Puedes publicarlo en:

- un subdominio propio
- Cloudflare Pages
- GitHub Pages privado/publicado con URL no listada
- tu home server
- una PC local en la red

Para iPad fuera de casa, lo ideal es HTTPS.

## Instalar en iPad

1. Abre la URL en Safari.
2. Toca el botón Compartir.
3. Selecciona “Agregar a pantalla de inicio”.
4. Abre desde el ícono instalado.
5. Carga una vez con internet para que se guarde offline.

## Probar modo offline

1. Abre la app una vez con internet.
2. Entra a Queens.
3. Cierra la app.
4. Activa modo avión.
5. Abre de nuevo desde el ícono.
6. Debe cargar la app y los niveles guardados.

## Agregar nuevos paquetes de niveles

Publica un archivo:

```text
levels/manifest.json
```

Con este formato:

```json
{
  "packs": [
    {
      "game": "queens",
      "packId": "queens-pack-002",
      "version": 1,
      "url": "./levels/queens/queens-pack-002.json",
      "levelCount": 100,
      "checksum": null
    }
  ]
}
```

Y publica el pack:

```text
levels/queens/queens-pack-002.json
```

Cuando la app tenga internet, toca “Actualizar niveles”. Los nuevos niveles se guardarán en IndexedDB y quedarán disponibles sin conexión.

## Nota sobre niveles de ejemplo

La primera versión incluye 10 niveles funcionales de 7x7. Están diseñados como seed-data para probar arquitectura, guardado, victoria, errores, perfiles y sincronización.

Para producción conviene generar niveles más variados, con regiones irregulares tipo LinkedIn Queens.

## Responsive

La interfaz está ajustada para:

- Laptop/desktop: tablero y panel de controles en dos columnas.
- iPad/tablet: tablero grande y controles debajo.
- iPhone: layout de una columna, botones en cuadrícula y tablero limitado al alto visible.
- iPhone en horizontal: modo compacto para evitar scroll excesivo.
