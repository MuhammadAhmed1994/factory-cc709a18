import { apiRequest } from './api-client'

export const CATEGORIES = ['food', 'transport', 'shopping', 'education', 'bills'] as const
export type CategoryName = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<CategoryName, string> = {
  food: 'Food',
  transport: 'Transport',
  shopping: 'Shopping',
  education: 'Education',
  bills: 'Bills',
}

export interface User {
  id: string
  email: string
}

export interface Expense {
  id: string
  title: string
  amount: string
  date: string
  category: CategoryName
  createdAt: string
  updatedAt: string
}

export interface ExpensePage {
  items: Expense[]
  page: number
  limit: number
  total: number
}

export interface ExpenseInput {
  title: string
  amount: string
  date: string
  category: CategoryName
}

export interface ExpenseFilters {
  search?: string
  category?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface DashboardData {
  month: string
  total: string
  count: number
  recent: Expense[]
}

export interface SummaryData {
  month: string
  total: string
  count: number
  breakdown: { category: CategoryName; total: string; count: number }[]
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

const json = (body: unknown) => JSON.stringify(body)

export const api = {
  register: (email: string, password: string) =>
    apiRequest<User>('/auth/register', { method: 'POST', body: json({ email, password }) }),
  login: (email: string, password: string) =>
    apiRequest<User>('/auth/login', { method: 'POST', body: json({ email, password }) }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  me: () => apiRequest<User>('/auth/me'),
  listExpenses: (filters: ExpenseFilters = {}) => apiRequest<ExpensePage>(`/expenses${query({ ...filters })}`),
  getExpense: (id: string) => apiRequest<Expense>(`/expenses/${encodeURIComponent(id)}`),
  createExpense: (input: ExpenseInput) => apiRequest<Expense>('/expenses', { method: 'POST', body: json(input) }),
  updateExpense: (id: string, input: Partial<ExpenseInput>) =>
    apiRequest<Expense>(`/expenses/${encodeURIComponent(id)}`, { method: 'PATCH', body: json(input) }),
  deleteExpense: (id: string) => apiRequest<void>(`/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  dashboard: (month?: string) => apiRequest<DashboardData>(`/dashboard${query({ month })}`),
  summary: (month: string) => apiRequest<SummaryData>(`/summary${query({ month })}`),
}

/** Today's calendar date and month in the browser's own time zone (YYYY-MM-DD / YYYY-MM). */
export function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function localMonth(): string {
  return localToday().slice(0, 7)
}

export function formatAmount(amount: string): string {
  return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
