import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DashboardView } from './dashboard-view'
import { SummaryView } from './summary-view'
import { viewport } from '../app/layout'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/dashboard',
}))

jest.mock('../lib/api', () => {
  const actual = jest.requireActual('../lib/api')
  return { ...actual, api: { dashboard: jest.fn(), summary: jest.fn() } }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api: mockApi } = jest.requireMock('../lib/api') as { api: Record<string, jest.Mock> }

const LUNCH = {
  id: 'e1',
  title: 'Lunch',
  amount: '12.50',
  date: '2026-10-20',
  category: 'food',
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
}
const BUS = { ...LUNCH, id: 'e2', title: 'Bus pass', amount: '40.00', category: 'transport' }

function summaryOf(month: string, food: string, transport: string, total: string, count: number) {
  return {
    month,
    total,
    count,
    breakdown: [
      { category: 'food', total: food, count: food === '0.00' ? 0 : 1 },
      { category: 'transport', total: transport, count: transport === '0.00' ? 0 : 1 },
      { category: 'shopping', total: '0.00', count: 0 },
      { category: 'education', total: '0.00', count: 0 },
      { category: 'bills', total: '0.00', count: 0 },
    ],
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Dashboard page', () => {
  it('[AC-14] shows the month total, the transaction count and the recent spending list', async () => {
    mockApi.dashboard.mockResolvedValue({ month: '2026-10', total: '52.50', count: 2, recent: [BUS, LUNCH] })
    render(<DashboardView />)
    await waitFor(() => expect(within(screen.getByTestId('stat-total')).getByText('52.50')).toBeInTheDocument())
    expect(within(screen.getByTestId('stat-count')).getByText('2')).toBeInTheDocument()
    expect(screen.getAllByTestId('expense-row')).toHaveLength(2)
    expect(screen.getByText('Bus pass')).toBeInTheDocument()
    expect(screen.getByText('Lunch')).toBeInTheDocument()
  })

  it('[AC-14] without expenses it shows a zero total, zero count and an empty-state message', async () => {
    mockApi.dashboard.mockResolvedValue({ month: '2026-10', total: '0.00', count: 0, recent: [] })
    render(<DashboardView />)
    await waitFor(() => expect(within(screen.getByTestId('stat-total')).getByText('0.00')).toBeInTheDocument())
    expect(within(screen.getByTestId('stat-count')).getByText('0')).toBeInTheDocument()
    expect(screen.getByText('No expenses yet')).toBeInTheDocument()
    expect(screen.queryAllByTestId('expense-row')).toHaveLength(0)
  })
})

describe('Monthly summary page', () => {
  it('[AC-20] displays the month total and the category breakdown returned by the API', async () => {
    mockApi.summary.mockResolvedValue(summaryOf('2026-10', '12.50', '40.00', '52.50', 2))
    render(<SummaryView />)
    await waitFor(() => expect(within(screen.getByTestId('summary-total')).getByText('52.50')).toBeInTheDocument())
    const rows = screen.getAllByTestId('breakdown-row')
    expect(rows).toHaveLength(5)
    // sorted by amount, highest first
    expect(within(rows[0]).getByText('Transport')).toBeInTheDocument()
    expect(within(rows[0]).getByText('40.00')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Food')).toBeInTheDocument()
    expect(within(rows[1]).getByText('12.50')).toBeInTheDocument()
  })

  it('[AC-20] selecting another month requests that month and shows its figures', async () => {
    mockApi.summary.mockImplementation((month: string) =>
      Promise.resolve(
        month === '2026-09' ? summaryOf('2026-09', '7.25', '0.00', '7.25', 1) : summaryOf('2026-10', '12.50', '40.00', '52.50', 2),
      ),
    )
    render(<SummaryView />)
    await waitFor(() => expect(screen.getByTestId('summary-total')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2026-09' } })
    await waitFor(() => expect(mockApi.summary).toHaveBeenCalledWith('2026-09'))
    await waitFor(() => expect(within(screen.getByTestId('summary-total')).getByText('7.25')).toBeInTheDocument())
  })

  it('[AC-20] a month without expenses shows a zero total and an empty-state message', async () => {
    mockApi.summary.mockResolvedValue(summaryOf('2026-08', '0.00', '0.00', '0.00', 0))
    render(<SummaryView />)
    await waitFor(() => expect(within(screen.getByTestId('summary-total')).getByText('0.00')).toBeInTheDocument())
    expect(screen.getByText('No expenses this month')).toBeInTheDocument()
  })
})

describe('Responsive layout', () => {
  // jsdom does not lay pages out, so this checks the rules that keep 375px free of horizontal scroll.
  const css = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8')

  it('[AC-22] the viewport follows the device width and the page never scrolls horizontally', () => {
    expect(viewport).toMatchObject({ width: 'device-width', initialScale: 1 })
    expect(css).toMatch(/overflow-x:\s*hidden/)
  })

  it('[AC-22] layouts are single-column by default and widen only from the tablet breakpoint', () => {
    expect(css).toMatch(/\.stat-grid\s*{[^}]*grid-template-columns:\s*1fr;/)
    expect(css).toMatch(/\.filters\s*{[^}]*grid-template-columns:\s*1fr;/)
    expect(css).toMatch(/@media \(min-width: 768px\)/)
    expect(css).toMatch(/\.btn\s*{[^}]*min-height:\s*44px/)
  })
})