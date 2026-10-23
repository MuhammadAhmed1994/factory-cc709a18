import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ToastProvider } from './toast'
import { ExpenseForm } from './expense-form'
import { AddExpense, EditExpense } from './expense-pages'
import { ExpensesView } from './expenses-view'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  usePathname: () => '/expenses',
}))

jest.mock('../lib/api', () => {
  const actual = jest.requireActual('../lib/api')
  return {
    ...actual,
    api: {
      listExpenses: jest.fn(),
      getExpense: jest.fn(),
      createExpense: jest.fn(),
      updateExpense: jest.fn(),
      deleteExpense: jest.fn(),
    },
  }
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

function page(items: unknown[]) {
  return { items, page: 1, limit: 20, total: items.length }
}

function wrap(ui: ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

function fillForm() {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Coffee' } })
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '3.5' } })
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-21' } })
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'food' } })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Expense form', () => {
  it('[AC-11] submitting with every field missing shows field-level errors and does not call the API', () => {
    const onSubmit = jest.fn()
    render(<ExpenseForm submitLabel="Add expense" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(screen.getByText('Title is required.')).toBeInTheDocument()
    expect(screen.getByText('Amount is required.')).toBeInTheDocument()
    expect(screen.getByText('Date is required.')).toBeInTheDocument()
    expect(screen.getByText('Select a category.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('[AC-11] the add page does not call the API when the category is missing', () => {
    wrap(<AddExpense />)
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Coffee' } })
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '3.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(screen.getByText('Select a category.')).toBeInTheDocument()
    expect(mockApi.createExpense).not.toHaveBeenCalled()
  })
})

describe('Expenses list', () => {
  it('[AC-12] lists expenses with title, amount, date and category and edit/delete actions', async () => {
    mockApi.listExpenses.mockResolvedValue(page([LUNCH, BUS]))
    wrap(<ExpensesView />)
    expect(await screen.findByText('Lunch')).toBeInTheDocument()
    expect(screen.getByText('12.50')).toBeInTheDocument()
    expect(screen.getAllByText('2026-10-20', { selector: 'span' }).length).toBe(2)
    expect(screen.getAllByText('Food').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Edit Lunch' })).toHaveAttribute('href', '/expenses/e1/edit')
    expect(screen.getByRole('button', { name: 'Delete Bus pass' })).toBeInTheDocument()
  })

  it('[AC-12] delete asks for confirmation before removing', async () => {
    mockApi.listExpenses.mockResolvedValue(page([LUNCH]))
    mockApi.deleteExpense.mockResolvedValue(undefined)
    wrap(<ExpensesView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Lunch' }))
    const dialog = screen.getByRole('dialog')
    expect(mockApi.deleteExpense).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockApi.deleteExpense).not.toHaveBeenCalled()
  })

  it('[AC-17] search, category and date filters update the list and a no-match result shows an empty state', async () => {
    mockApi.listExpenses.mockImplementation(async (filters: { search?: string }) =>
      filters.search === 'zzz' ? page([]) : page([LUNCH, BUS]),
    )
    wrap(<ExpensesView />)
    await screen.findByText('Lunch')

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'food' } })
    await waitFor(() => expect(mockApi.listExpenses).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'food' })))

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-31' } })
    await waitFor(() =>
      expect(mockApi.listExpenses).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-10-01', to: '2026-10-31' })),
    )

    fireEvent.change(screen.getByLabelText('Search by title'), { target: { value: 'zzz' } })
    expect(await screen.findByText('No matching expenses')).toBeInTheDocument()
    expect(mockApi.listExpenses).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'zzz' }))
  })
})

describe('Confirmation messages', () => {
  it('[AC-21] adding an expense shows "Expense added"', async () => {
    mockApi.createExpense.mockResolvedValue(LUNCH)
    wrap(<AddExpense />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(await screen.findByText('Expense added')).toBeInTheDocument()
    expect(mockApi.createExpense).toHaveBeenCalledWith({ title: 'Coffee', amount: '3.50', date: '2026-10-21', category: 'food' })
    expect(mockPush).toHaveBeenCalledWith('/expenses')
  })

  it('[AC-21] a failed add shows an error message instead', async () => {
    mockApi.createExpense.mockRejectedValue(new Error('Server exploded'))
    wrap(<AddExpense />)
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    expect((await screen.findAllByText('Server exploded')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Expense added')).not.toBeInTheDocument()
  })

  it('[AC-21] updating an expense shows "Expense updated"', async () => {
    mockApi.getExpense.mockResolvedValue(LUNCH)
    mockApi.updateExpense.mockResolvedValue({ ...LUNCH, title: 'Late lunch' })
    wrap(<EditExpense id="e1" />)
    await screen.findByDisplayValue('Lunch')
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Late lunch' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Expense updated')).toBeInTheDocument()
    expect(mockApi.updateExpense).toHaveBeenCalledWith('e1', expect.objectContaining({ title: 'Late lunch' }))
  })

  it('[AC-21] deleting an expense shows "Expense deleted"', async () => {
    mockApi.listExpenses.mockResolvedValue(page([LUNCH]))
    mockApi.deleteExpense.mockResolvedValue(undefined)
    wrap(<ExpensesView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Lunch' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Expense deleted')).toBeInTheDocument()
    expect(mockApi.deleteExpense).toHaveBeenCalledWith('e1')
  })

  it('[AC-21] a failed delete shows an error message', async () => {
    mockApi.listExpenses.mockResolvedValue(page([LUNCH]))
    mockApi.deleteExpense.mockRejectedValue(new Error('Cannot delete'))
    wrap(<ExpensesView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Lunch' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect((await screen.findAllByText('Cannot delete')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Expense deleted')).not.toBeInTheDocument()
  })
})