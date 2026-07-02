export type Route =
  'home' | 'users' | 'library' | 'records' | 'settings' | 'queens' | 'sudoku' | 'wordle'

export type GameId = 'queens' | 'sudoku' | 'wordle'

export interface AppState {
  route: Route
  currentUserName: string
  isGuest: boolean
}
