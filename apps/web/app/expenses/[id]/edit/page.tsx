import { AppShell } from '../../../../components/app-shell'
import { EditExpense } from '../../../../components/expense-pages'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <AppShell>
      <EditExpense id={id} />
    </AppShell>
  )
}