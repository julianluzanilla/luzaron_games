/**
 * Jugadores de Memoria: cada carta es un sticker coleccionable con la foto
 * del jugador (public/art/memoria/{id}.webp, recorte 9:10 de 216×240) y su
 * nombre corto. Cada partida toma al azar los que necesita de esta lista.
 *
 * Listado base y origen de las fotos: claude/memoria-jugadores.md.
 */

export interface MemoriaPlayer {
  id: string
  /** Nombre corto que va en la franja del sticker. */
  name: string
  /** Nombre completo, para lectores de pantalla. */
  fullName: string
}

export const MEMORIA_PLAYERS: readonly MemoriaPlayer[] = [
  { id: 'vinicius', name: 'Vinícius', fullName: 'Vinícius Júnior' },
  { id: 'bellingham', name: 'Bellingham', fullName: 'Jude Bellingham' },
  { id: 'courtois', name: 'Courtois', fullName: 'Thibaut Courtois' },
  { id: 'yamal', name: 'Yamal', fullName: 'Lamine Yamal' },
  { id: 'pedri', name: 'Pedri', fullName: 'Pedri' },
  { id: 'rodri', name: 'Rodri', fullName: 'Rodri' },
  { id: 'dembele', name: 'Dembélé', fullName: 'Ousmane Dembélé' },
  { id: 'doue', name: 'Doué', fullName: 'Désiré Doué' },
  { id: 'vitinha', name: 'Vitinha', fullName: 'Vitinha' },
  { id: 'haaland', name: 'Haaland', fullName: 'Erling Haaland' },
  { id: 'enzo', name: 'Enzo', fullName: 'Enzo Fernández' },
  { id: 'kane', name: 'Kane', fullName: 'Harry Kane' },
  { id: 'olise', name: 'Olise', fullName: 'Michael Olise' },
  { id: 'musiala', name: 'Musiala', fullName: 'Jamal Musiala' },
  { id: 'saka', name: 'Saka', fullName: 'Bukayo Saka' },
  { id: 'rice', name: 'Rice', fullName: 'Declan Rice' },
  { id: 'gyokeres', name: 'Gyökeres', fullName: 'Viktor Gyökeres' },
  { id: 'wirtz', name: 'Wirtz', fullName: 'Florian Wirtz' },
  { id: 'isak', name: 'Isak', fullName: 'Alexander Isak' },
  { id: 'barcola', name: 'Barcola', fullName: 'Bradley Barcola' },
  { id: 'lautaro', name: 'Lautaro', fullName: 'Lautaro Martínez' },
  { id: 'barella', name: 'Barella', fullName: 'Nicolò Barella' },
  { id: 'thuram', name: 'Thuram', fullName: 'Marcus Thuram' },
  { id: 'julian', name: 'Julián', fullName: 'Julián Álvarez' },
  { id: 'oblak', name: 'Oblak', fullName: 'Jan Oblak' },
  { id: 'romero', name: 'Romero', fullName: 'Cristian Romero' },
  { id: 'debruyne', name: 'De Bruyne', fullName: 'Kevin De Bruyne' },
  { id: 'cristiano', name: 'Cristiano', fullName: 'Cristiano Ronaldo' },
  { id: 'messi', name: 'Messi', fullName: 'Lionel Messi' },
  { id: 'raul', name: 'Raúl', fullName: 'Raúl Jiménez' },
  { id: 'mora', name: 'Morita', fullName: 'Gilberto Mora' },
  { id: 'vozinha', name: 'Vozinha', fullName: 'Vozinha' },
]

const BY_ID = new Map(MEMORIA_PLAYERS.map((player) => [player.id, player]))

export function getMemoriaPlayer(id: string): MemoriaPlayer {
  return BY_ID.get(id) ?? MEMORIA_PLAYERS[0]
}

export function playerPhotoUrl(id: string): string {
  return `/art/memoria/${id}.webp`
}
