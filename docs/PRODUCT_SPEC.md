# Luzaron Games — Product Spec

## 1. Descripción general

Luzaron Games será una plataforma familiar de juegos mentales, gratuita, sin anuncios, instalable como PWA y usable offline.

La app estará publicada en:

https://games.luzaron.uk

La plataforma contendrá inicialmente:

- Queens
- Sudoku
- Wordle

La app debe funcionar como aplicación instalada en:

- Windows PC
- iPhone
- Android/tablet
- Navegador web moderno

---

## 2. Objetivo del producto

Crear una plataforma privada/familiar de juegos mentales que permita:

- Jugar sin anuncios.
- Descargar niveles para jugar offline.
- Tener perfiles de usuario.
- Guardar records.
- Guardar progreso.
- Usar timer por puzzle.
- Actualizar niveles periódicamente.
- Crecer con nuevos juegos y packs de niveles.

---

## 3. Stack técnico aprobado

Frontend:

- Vite
- TypeScript
- HTML
- CSS
- PWA
- Service Worker
- Web App Manifest

Hosting:

- GitHub
- Cloudflare Pages

Dominio:

- https://games.luzaron.uk

Almacenamiento local:

- IndexedDB
- Cache Storage

Backend futuro:

- Cloudflare Pages Functions
- Cloudflare D1

---

## 4. Reglas generales de la PWA

La app debe:

- Instalarse como standalone app.
- Abrir sin mostrar pestañas ni barra normal del navegador.
- Tener modo offline.
- Cargar desde cache cuando no haya internet.
- Verificar conexión al iniciar.
- Buscar nuevos niveles cuando haya internet.
- Descargar nuevos packs de niveles.
- Mostrar progreso de actualización.
- Omitir actualización si no hay internet.
- Funcionar en HTTPS.

---

## 5. Usuarios

La app tendrá usuarios creados desde base de datos.

Campos mínimos de usuario:

- Correo
- Nombre completo
- Nombre de usuario
- Contraseña simple
- Rol
- Estado activo/inactivo

La contraseña simple tendrá estas reglas:

- 4 caracteres o más.
- Solo números o letras.
- Sin restricciones normales de contraseña compleja.

Roles:

- admin
- player
- guest

El administrador podrá autorizar y crear usuarios nuevos para familiares o amigos.

---

## 6. Invitado

La app siempre debe permitir entrar como Invitado.

El usuario Invitado:

- Puede jugar todos los juegos.
- Puede usar niveles descargados.
- No guarda records remotos.
- No aparece en rankings familiares.
- Puede tener progreso local temporal si se decide implementarlo.

---

## 7. Niveles y biblioteca

Los niveles estarán organizados en packs descargables.

La app debe tener una Biblioteca de niveles con estados:

- Disponible
- Descargando
- Descargado
- Actualización disponible
- Error de descarga

Los packs deberán poder actualizarse sin modificar la estructura principal de la app.

Formato recomendado:

- JSON para distribución de niveles.
- IndexedDB para almacenamiento local.
- D1 para catálogo remoto futuro.

---

## 8. Timer

El timer será la base del record.

Reglas:

- Inicia con el primer movimiento.
- Corre solo cuando la app está en primer plano.
- Se pausa cuando la app pierde foco.
- Se reanuda automáticamente cuando vuelve al primer plano.
- No requiere botón de Continuar.
- Se reinicia con Reset.
- Se detiene al completar el puzzle.

Al perder foco, la app debe oscurecer o difuminar el tablero para evitar trampas.

---

## 9. Records

Cada record deberá guardar como mínimo:

- user_id
- game_id
- pack_id
- level_id / puzzle_id
- raw_time_ms
- final_time_ms
- hints_used
- hint_penalty_ms
- completed_at
- is_clean_record

Los records de Invitado no se guardan en base remota.

---

## 10. Hints

Los hints estarán preparados desde el inicio, aunque no todos se implementen en la primera versión.

Cada partida debe guardar:

- hints_used
- hint_penalty_ms
- is_clean_record

A futuro, los hints podrán afectar el tiempo final o separar records con pistas y sin pistas.

---

# 11. Queens

## 11.1 Tamaños

Queens tendrá niveles:

- 7x7
- 8x8
- 9x9
- 10x10
- 11x11
- 12x12

Meta inicial:

- Por lo menos 300 puzzles por tamaño.

## 11.2 Interacción

Queens no usa teclado.

La celda cicla así:

Vacía → X → Reina → Vacía

Reglas:

- 1 clic sobre celda vacía: pone X.
- 1 clic sobre X: pone reina.
- 1 clic sobre reina: deja vacía.
- Clic sostenido y arrastre: permite llenar varias celdas con X.
- El arrastre no sirve para poner reinas ni para vaciar celdas.

## 11.3 Autollenado de X

Al colocar una reina, la app debe marcar automáticamente con X:

- Todas las celdas de la misma fila.
- Todas las celdas de la misma columna.
- Las celdas alrededor de la reina.

El usuario puede modificar manualmente esas X después.

## 11.4 Victoria

El puzzle termina cuando todas las reinas correctas están colocadas.

No es necesario que el tablero esté lleno de X.

## 11.5 Botones

Queens debe tener:

- Deshacer
- Reset
- Hint

Deshacer:

- Revierte el último movimiento completo.
- Si el movimiento generó X automáticas, también las revierte.
- No afecta el timer.
- No borra hints usados.

Reset:

- Limpia el tablero.
- Borra historial.
- Reinicia timer.
- Borra hints de la partida.
- Pide confirmación.

Hint:

Orden de prioridad:

1. Reina incorrecta.
2. X incorrecta.
3. Falta una reina en esta fila.
4. Falta una reina en esta columna.
5. Falta una reina en esta región.
6. Aquí debe ir una reina.

## 11.6 Modal de puzzle completado

Al completar un puzzle, se muestra una ventana modal sobre el tablero.

Debe mostrar:

- Puzzle completado.
- Número de puzzle.
- Tiempo.
- Pistas utilizadas.

No debe mostrar:

- Sección social.
- Botón Try Ranked.
- Botón Share.

Botones:

- Siguiente Puzzle
- Cerrar

Siguiente Puzzle:

- Avanza secuencialmente dentro del mismo nivel/pack.
- Puzzle 1 → Puzzle 2 → Puzzle 3.
- Si es el último puzzle del pack, el botón queda oculto o desactivado.

---

# 12. Sudoku

## 12.1 Tipos

Sudoku tendrá:

- Mini Sudoku 6x6.
- Sudoku Regular 9x9.

No se incluirá 4x4.

## 12.2 Dificultades

Dificultades iniciales:

- Fácil
- Medio
- Difícil

Inicialmente, la dificultad dependerá de cuántos números visibles tiene el puzzle.

## 12.3 Interacción

Sudoku debe permitir:

- Seleccionar celda con mouse/touch.
- Escribir número con teclado físico.
- Escribir número con listado inferior de números.
- Usar notas/candidatos.

---

# 13. Wordle

## 13.1 Diccionarios

Wordle tendrá inicialmente:

- Español 5 letras.
- Inglés 5 letras.

Preparado para futuro:

- Español 6 letras.
- Español 7 letras.
- Inglés 6 letras.
- Inglés 7 letras.

## 13.2 Interacción

Wordle debe permitir:

- Escribir con teclado físico.
- Escribir con teclado virtual.
- Insertar letra en la siguiente celda activa.
- Marcar letras en teclado virtual.

Estados de letras:

- No utilizada.
- No existe en la palabra.
- Existe en la palabra.
- Correcta en posición.

## 13.3 Normalización

Para simplificar el juego:

- Ñ y N se igualan.
- NIÑOS se trata como NINOS.
- NIÑAS se trata como NINAS.

---

# 14. Rankings futuros

A futuro, el modal de puzzle completado podrá mostrar rankings.

Reglas:

- Mostrar top 3 por puzzle específico.
- Solo records sin pistas.
- Ordenados por mejor tiempo.
- Si el usuario actual entra en top 3, resaltar su fila.
- Si no entra en top 3, no mostrar su nombre.

---

# 15. Fuera de alcance de la primera etapa

Quedan para versiones futuras:

- Rankings completos.
- Hints avanzados.
- Sincronización completa entre dispositivos.
- Panel admin avanzado.
- Estadísticas familiares avanzadas.
- Exportar/importar progreso.
- Más juegos.
- Más packs de niveles.
