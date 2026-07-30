import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page";
import { TransactionForm } from "@/components/transaction-form";
import { getMasters, getTransaction } from "@/lib/queries";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [transaction, masters] = await Promise.all([getTransaction(id), getMasters()]);
  if (!transaction) notFound();
  return <>
    <PageHeader eyebrow="Livro financeiro" title="Editar lançamento" description="Altere os dados; o saldo anterior será revertido e recalculado de forma atômica." actions={<Link className="btn btn-secondary" href="/lancamentos">Voltar</Link>} />
    <section className="card p-5"><TransactionForm masters={masters} transaction={transaction} /></section>
  </>;
}
