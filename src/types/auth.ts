export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin' | 'barber'
}

export type AuthResponse = {
  token: string
  user: AuthUser
}
