# Luzaron Games — Backlog Operativo

Este backlog organiza el desarrollo por capítulos. Cada tarea debe marcarse como:

- [ ] Pendiente
- [x] Terminado

---

# Capítulo 1 — Planeación de la versión inicial

## Estado general

Capítulo casi cerrado. Pendiente únicamente formalizar los documentos del repo.

## Tareas

- [x] Definir alcance de la versión 1.0.
- [x] Definir juegos iniciales: Queens, Sudoku y Wordle.
- [x] Definir arquitectura general: Cloudflare Pages + GitHub + PWA.
- [x] Definir funcionamiento offline-first.
- [x] Definir instalación como app en Windows e iPhone.
- [x] Definir prioridad de desarrollo: plataforma base → Queens → Sudoku → Wordle.
- [x] Definir elementos futuros: rankings, hints avanzados, sincronización completa y panel admin avanzado.
- [x] Crear roadmap general del proyecto.
- [x] Crear PRODUCT_SPEC.md.
- [x] Crear BACKLOG.md.

---

# Capítulo 2 — Base técnica del proyecto

## Objetivo

Dejar el proyecto técnico listo para desarrollo continuo.

## Tareas

- [x] Crear repo en GitHub.
- [x] Crear app base con Vite.
- [x] Confirmar funcionamiento local con npm run dev.
- [x] Configurar manifest.webmanifest.
- [x] Configurar iconos PWA.
- [x] Configurar screenshots provisionales PWA.
- [x] Configurar service worker inicial.
- [x] Confirmar instalación como app de escritorio en Windows.
- [x] Confirmar instalación como app en iPhone.
- [x] Crear guía práctica para GitHub, npm y VS Code.
- [ ] Revisar estructura final de carpetas.
- [ ] Crear README técnico actualizado.
- [ ] Crear CONTRIBUTING.md o guía interna de flujo de trabajo.
- [ ] Definir estrategia de ramas.
- [ ] Configurar reglas básicas de formato.
- [ ] Confirmar despliegue estable en Cloudflare Pages.
- [ ] Confirmar dominio https://games.luzaron.uk.

---

# Capítulo 3 — Estructura principal de la app

## Objetivo

Crear la carcasa principal de navegación y pantallas base.

## Tareas

- [ ] Crear sistema base de navegación.
- [ ] Crear layout responsivo principal.
- [ ] Crear pantalla Home.
- [ ] Crear pantalla Usuarios.
- [ ] Crear pantalla Biblioteca.
- [ ] Crear pantalla Records.
- [ ] Crear pantalla Ajustes.
- [ ] Crear placeholder de Queens.
- [ ] Crear placeholder de Sudoku.
- [ ] Crear placeholder de Wordle.
- [ ] Crear navegación entre pantallas.
- [ ] Crear estado global mínimo de app.

---

# Capítulo 4 — Configuración y experiencia de usuario

## Objetivo

Crear experiencia base para usuarios familiares.

## Tareas

- [ ] Crear modo claro.
- [ ] Crear modo oscuro.
- [ ] Crear modo automático según sistema.
- [ ] Crear preferencias locales.
- [ ] Crear selección de usuario actual.
- [ ] Crear usuario Invitado.
- [ ] Crear selector visual de perfiles.
- [ ] Crear ajustes de sonido.
- [ ] Crear ajustes de vibración.
- [ ] Crear ajustes de accesibilidad básica.
- [ ] Probar diseño en desktop.
- [ ] Probar diseño en iPhone.
- [ ] Probar diseño en tablet.

---

# Capítulo 5 — Datos locales y funcionamiento offline

## Objetivo

Crear almacenamiento local sólido para jugar offline.

## Tareas

- [ ] Crear módulo IndexedDB.
- [ ] Crear store de perfiles locales.
- [ ] Crear store de sesiones.
- [ ] Crear store de configuración.
- [ ] Crear store de packs descargados.
- [ ] Crear store de niveles.
- [ ] Crear store de progreso.
- [ ] Crear store de records.
- [ ] Crear store de cola de sincronización.
- [ ] Crear verificación real de conexión al iniciar.
- [ ] Crear flujo de actualización al iniciar.
- [ ] Crear flujo offline si no hay internet.
- [ ] Crear guardado automático de estado.

---

# Capítulo 6 — Biblioteca de niveles

## Objetivo

Crear sistema de packs descargables y seleccionables.

## Tareas

- [ ] Definir formato final de level manifest.
- [ ] Definir formato final de pack JSON.
- [ ] Crear manifest inicial de niveles.
- [ ] Crear pantalla Biblioteca.
- [ ] Mostrar packs por juego.
- [ ] Mostrar packs por categoría/dificultad.
- [ ] Mostrar estado de pack.
- [ ] Descargar pack.
- [ ] Actualizar pack.
- [ ] Guardar pack en IndexedDB.
- [ ] Leer pack desde IndexedDB.
- [ ] Crear selector de puzzle/nivel.

---

# Capítulo 7 — Motores comunes de juego

## Objetivo

Crear componentes reutilizables para todos los juegos.

## Tareas

- [ ] Crear motor común de timer.
- [ ] Crear pausa automática al perder foco.
- [ ] Crear overlay de privacidad al perder foco.
- [ ] Crear reanudación automática al volver a primer plano.
- [ ] Crear motor común de records.
- [ ] Crear motor común de progreso.
- [ ] Crear historial de movimientos.
- [ ] Crear sistema común de deshacer.
- [ ] Crear sistema común de reset.
- [ ] Crear sistema común de hints.
- [ ] Crear modal común de puzzle completado.
- [ ] Crear botón Siguiente Puzzle.
- [ ] Crear guardado automático después de movimiento.

---

# Capítulo 8 — Queens

## Objetivo

Implementar Queens como primer juego completo.

## Tareas

- [ ] Definir formato final de nivel Queens.
- [ ] Crear validador de nivel Queens.
- [ ] Crear pack de prueba Queens 7x7.
- [ ] Crear pack de prueba Queens 8x8.
- [ ] Crear tablero Queens responsivo.
- [ ] Renderizar regiones por color.
- [ ] Implementar ciclo de celda: vacía → X → reina → vacía.
- [ ] Implementar clic sostenido y arrastre para X.
- [ ] Implementar autollenado de X al colocar reina.
- [ ] Guardar cada movimiento en historial.
- [ ] Implementar Deshacer.
- [ ] Implementar Reset con confirmación.
- [ ] Implementar Hint.
- [ ] Implementar validación de victoria.
- [ ] Implementar modal de completado.
- [ ] Implementar Siguiente Puzzle.
- [ ] Guardar record local.
- [ ] Probar en desktop.
- [ ] Probar en iPhone.
- [ ] Probar offline.

---

# Capítulo 9 — Sudoku

## Objetivo

Implementar Sudoku Mini 6x6 y Sudoku Regular 9x9.

## Tareas

- [ ] Definir formato final de nivel Sudoku.
- [ ] Crear pack de prueba Sudoku 6x6.
- [ ] Crear pack de prueba Sudoku 9x9.
- [ ] Crear tablero Sudoku responsivo.
- [ ] Implementar selección de celda.
- [ ] Implementar teclado físico.
- [ ] Implementar listado inferior de números.
- [ ] Implementar notas/candidatos.
- [ ] Implementar validación.
- [ ] Implementar condición de victoria.
- [ ] Implementar modal de completado.
- [ ] Guardar record local.
- [ ] Probar en desktop.
- [ ] Probar en iPhone.
- [ ] Probar offline.

---

# Capítulo 10 — Wordle

## Objetivo

Implementar Wordle español e inglés de 5 letras.

## Tareas

- [ ] Definir formato final de diccionario Wordle.
- [ ] Crear diccionario de prueba español 5 letras.
- [ ] Crear diccionario de prueba inglés 5 letras.
- [ ] Crear normalizador de palabras.
- [ ] Igualar Ñ y N.
- [ ] Crear tablero Wordle.
- [ ] Crear teclado virtual.
- [ ] Implementar teclado físico.
- [ ] Validar palabra ingresada.
- [ ] Marcar letras correctas.
- [ ] Marcar letras presentes.
- [ ] Marcar letras ausentes.
- [ ] Crear condición de victoria.
- [ ] Crear condición de derrota.
- [ ] Guardar estadísticas.
- [ ] Probar en desktop.
- [ ] Probar en iPhone.
- [ ] Probar offline.

---

# Capítulo 11 — Backend y usuarios remotos

## Objetivo

Crear usuarios reales y administración desde Cloudflare.

## Tareas

- [ ] Crear base Cloudflare D1.
- [ ] Crear Pages Functions.
- [ ] Crear tabla users.
- [ ] Crear tabla games.
- [ ] Crear tabla level_packs.
- [ ] Crear tabla records.
- [ ] Crear tabla user_progress.
- [ ] Crear tabla hint_events.
- [ ] Crear usuario admin inicial.
- [ ] Crear login.
- [ ] Crear logout.
- [ ] Crear alta de usuarios por admin.
- [ ] Crear desactivación de usuarios.
- [ ] Crear sesión local para offline.
- [ ] Mantener Invitado sin records remotos.

---

# Capítulo 12 — Sincronización y rankings

## Objetivo

Sincronizar records y crear rankings familiares.

## Tareas

- [ ] Crear subida de records.
- [ ] Crear cola de records pendientes.
- [ ] Crear sync automático al recuperar internet.
- [ ] Crear ranking por juego.
- [ ] Crear ranking por puzzle.
- [ ] Crear top 3 por puzzle sin pistas.
- [ ] Resaltar usuario actual si entra en top 3.
- [ ] No mostrar usuario actual si no entra en top 3.
- [ ] Preparar ranking en modal de completado.
- [ ] Crear exportación local de datos.
- [ ] Crear importación local de datos.

---

# Capítulo 13 — Pruebas y calidad

## Objetivo

Asegurar que la app funcione correctamente en dispositivos reales.

## Tareas

- [ ] Crear pruebas unitarias de timer.
- [ ] Crear pruebas unitarias de records.
- [ ] Crear pruebas unitarias de Queens.
- [ ] Crear pruebas unitarias de Sudoku.
- [ ] Crear pruebas unitarias de Wordle.
- [ ] Probar instalación PWA en Windows.
- [ ] Probar instalación PWA en iPhone.
- [ ] Probar instalación PWA en Android/tablet.
- [ ] Probar offline completo.
- [ ] Probar actualización de niveles.
- [ ] Probar rendimiento de packs grandes.
- [ ] Optimizar assets.
- [ ] Optimizar tamaño de JSON.

---

# Capítulo 14 — Lanzamiento familiar

## Objetivo

Preparar la app para uso familiar.

## Tareas

- [ ] Preparar datos iniciales definitivos.
- [ ] Crear usuarios familiares iniciales.
- [ ] Publicar beta familiar.
- [ ] Recopilar feedback.
- [ ] Corregir errores.
- [ ] Publicar versión 1.0.
- [ ] Crear manual de uso familiar.
- [ ] Crear changelog.

---

# Capítulo 15 — Mejoras futuras

## Objetivo

Planear crecimiento posterior.

## Tareas

- [ ] Agregar rankings completos.
- [ ] Agregar hints avanzados.
- [ ] Agregar más packs de Queens.
- [ ] Agregar Wordle 6 letras.
- [ ] Agregar Wordle 7 letras.
- [ ] Agregar más categorías de Sudoku.
- [ ] Mejorar panel admin.
- [ ] Agregar estadísticas familiares.
- [ ] Agregar exportación/importación avanzada.
- [ ] Reemplazar screenshots provisionales por capturas finales.
- [ ] Planear versión 1.1.
