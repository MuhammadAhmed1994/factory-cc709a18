import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthForm } from './auth-form'
import { ApiError } from '../lib/api-client'
import { api } from '../lib/api'
import { redirectTarget } from '../lib/auth-routing'

const push = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
  usePathname: () => '/login',
}))

jest.mock('../lib/api', () => ({
  api: { login: jest.fn(), register: jest.fn() },
}))

const mockedApi = api as unknown as { login: jest.Mock; register: jest.Mock }

function fill(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
}

describe('Auth pages', () => {
  beforeEach(() => {
    push.mockClear()
    mockedApi.login.mockReset()
    mockedApi.register.mockReset()
  })

  it('[AC-7] the login page submits valid credentials and redirects to the dashboard', async () => {
    mockedApi.login.mockResolvedValue({ id: '1', email: 'a@example.com' })
    render(<AuthForm mode="login" />)
    fill('a@example.com', 'correct-horse')
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'))
    expect(mockedApi.login).toHaveBeenCalledWith('a@example.com', 'correct-horse')
  })

  it('[AC-7] invalid credentials show an inline error and stay on the login page', async () => {
    mockedApi.login.mockRejectedValue(new ApiError(401, 'Invalid credentials'))
    render(<AuthForm mode="login" />)
    fill('a@example.com', 'wrong-password')
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
    expect(push).not.toHaveBeenCalled()
  })

  it('[AC-7] the register page submits valid credentials and redirects to the dashboard', async () => {
    mockedApi.register.mockResolvedValue({ id: '2', email: 'b@example.com' })
    render(<AuthForm mode="register" />)
    fill('b@example.com', 'correct-horse')
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'))
    expect(mockedApi.register).toHaveBeenCalledWith('b@example.com', 'correct-horse')
  })

  it('[AC-7] a registration the api rejects shows an inline error and stays on the page', async () => {
    mockedApi.register.mockRejectedValue(new ApiError(409, 'Email already registered'))
    render(<AuthForm mode="register" />)
    fill('b@example.com', 'correct-horse')
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
    expect(push).not.toHaveBeenCalled()
  })

  it('[AC-7] unauthenticated visits to the dashboard or expense pages redirect to login', () => {
    expect(redirectTarget('/dashboard', false)).toBe('/login')
    expect(redirectTarget('/expenses', false)).toBe('/login')
    expect(redirectTarget('/expenses/abc/edit', false)).toBe('/login')
    expect(redirectTarget('/summary', false)).toBe('/login')
    expect(redirectTarget('/dashboard', true)).toBeNull()
    expect(redirectTarget('/login', false)).toBeNull()
  })
})