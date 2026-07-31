import { updateProfileAction } from "@/actions/auth";
import {
  createAccountAction,
  createCategoryAction,
  createPaymentMethodAction,
  createSubcategoryAction,
  createWalletAction,
  updateSettingsAction,
} from "@/actions/finance";
import { AccountManager } from "@/components/account-manager";
import { ChangePasswordForm } from "@/components/change-password-form";
import { DangerZone } from "@/components/danger-zone";
import { MutationForm } from "@/components/mutation-form";
import { Field, FormDetails, PageHeader, SectionTitle, Submit } from "@/components/page";
import { getSettingsData } from "@/lib/queries";

export default async function SettingsPage() {
  const data = await getSettingsData();
  return <>
    <PageHeader eyebrow="Preferências" title="Configurações" description="Gerencie seu acesso, parâmetros financeiros e cadastros auxiliares." />
    <section className="card mb-6 p-5"><SectionTitle title="Perfil" description="O e-mail alterado será usado no próximo login." /><MutationForm action={updateProfileAction} successMessage="Perfil atualizado." className="grid gap-4 sm:grid-cols-3"><Field label="Nome"><input className="field" name="name" maxLength={120} defaultValue={data.user.name} required /></Field><Field label="E-mail"><input className="field" name="email" type="email" maxLength={320} defaultValue={data.user.email} required /></Field><div className="flex items-end"><Submit>Salvar perfil</Submit></div></MutationForm></section>
    <section className="card mb-6 p-5"><SectionTitle title="Planejamento financeiro" description="A distribuição deve somar exatamente 100%." /><MutationForm action={updateSettingsAction} successMessage="Parâmetros atualizados." className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Renda mensal média"><input className="field" name="monthlyIncome" inputMode="decimal" defaultValue={(data.settings?.monthlyIncome ?? 0) / 100} required /></Field>
      <Field label="Limite máximo de gastos"><input className="field" name="maximumMonthlySpending" inputMode="decimal" defaultValue={(data.settings?.maximumMonthlySpending ?? 0) / 100} required /></Field>
      <Field label="Meta da reserva"><input className="field" name="emergencyFundTarget" inputMode="decimal" defaultValue={(data.settings?.emergencyFundTarget ?? 0) / 100} required /></Field>
      <Field label="Meses da reserva"><input className="field" name="emergencyFundMonths" type="number" min="1" max="120" defaultValue={data.settings?.emergencyFundMonths ?? 6} required /></Field>
      <Field label="Necessidades (%)"><input className="field" name="needsPercentage" type="number" min="0" max="100" step=".1" defaultValue={data.settings?.needsPercentage ?? "50"} required /></Field>
      <Field label="Desejos (%)"><input className="field" name="wantsPercentage" type="number" min="0" max="100" step=".1" defaultValue={data.settings?.wantsPercentage ?? "30"} required /></Field>
      <Field label="Investimentos (%)"><input className="field" name="investmentPercentage" type="number" min="0" max="100" step=".1" defaultValue={data.settings?.investmentPercentage ?? "20"} required /></Field>
      <Field label="Dívidas (%)"><input className="field" name="debtPercentage" type="number" min="0" max="100" step=".1" defaultValue={data.settings?.debtPercentage ?? "0"} required /></Field>
      <Field label="Margem (%)"><input className="field" name="safetyMarginPercentage" type="number" min="0" max="100" step=".1" defaultValue={data.settings?.safetyMarginPercentage ?? "0"} required /></Field>
      <Field label="Tema"><select className="field" name="theme" defaultValue={data.settings?.theme ?? "SYSTEM"} required><option value="SYSTEM">Sistema</option><option value="LIGHT">Claro</option><option value="DARK">Escuro</option></select></Field>
      <div className="flex items-end"><Submit>Salvar parâmetros</Submit></div>
    </MutationForm></section>
    <div className="grid gap-4 lg:grid-cols-2">
      <FormDetails title="Contas bancárias">
        <h3 className="mb-3 text-sm font-semibold">Adicionar nova conta</h3>
        <MutationForm action={createAccountAction} successMessage="Conta adicionada." className="grid gap-4 sm:grid-cols-2"><Field label="Nome"><input className="field" name="name" required /></Field><Field label="Instituição"><input className="field" name="institution" /></Field><Field label="Tipo"><select className="field" name="type" required><option value="CHECKING">Conta corrente</option><option value="SAVINGS">Poupança</option><option value="PAYMENT">Conta de pagamento</option><option value="INVESTMENT">Investimentos</option><option value="OTHER">Outra</option></select></Field><Field label="Saldo inicial"><input className="field" name="initialBalance" defaultValue="0,00" required /></Field><Field label="Cor"><input className="field" name="color" type="color" defaultValue="#6366f1" required /></Field><div className="flex items-end"><Submit>Adicionar conta</Submit></div></MutationForm>
        <AccountManager accounts={data.accounts} />
      </FormDetails>
      <FormDetails title="Adicionar categoria">
        <MutationForm action={createCategoryAction} successMessage="Categoria adicionada." className="grid gap-4 sm:grid-cols-2"><Field label="Nome"><input className="field" name="name" required /></Field><Field label="Tipo"><select className="field" name="type" required><option value="EXPENSE">Despesa</option><option value="INCOME">Receita</option><option value="INVESTMENT">Investimento</option></select></Field><Field label="Grupo"><select className="field" name="budgetGroup" required><option value="NEEDS">Necessidades</option><option value="WANTS">Desejos</option><option value="INVESTMENTS">Investimentos</option><option value="DEBTS">Dívidas</option></select></Field><Field label="Cor"><input className="field" name="color" type="color" defaultValue="#64748b" required /></Field><input type="hidden" name="icon" value="circle" /><div className="flex items-end"><Submit>Adicionar categoria</Submit></div></MutationForm>
        <div className="mt-5 flex flex-wrap gap-2">{data.categories.map((item) => <span className="badge" key={item.id}><i className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span>)}</div>
      </FormDetails>
      <FormDetails title="Adicionar carteira">
        <MutationForm action={createWalletAction} successMessage="Carteira adicionada." className="grid gap-4 sm:grid-cols-2"><Field label="Nome"><input className="field" name="name" required /></Field><Field label="Saldo inicial"><input className="field" name="initialBalance" defaultValue="0,00" required /></Field><div className="flex items-end"><Submit>Adicionar carteira</Submit></div></MutationForm>
      </FormDetails>
      <FormDetails title="Formas de pagamento e subcategorias">
        <div className="grid gap-6 sm:grid-cols-2"><MutationForm action={createPaymentMethodAction} successMessage="Forma de pagamento adicionada." className="space-y-3"><Field label="Forma de pagamento"><input className="field" name="name" placeholder="Ex.: Pix" required /></Field><Submit>Adicionar forma</Submit></MutationForm><MutationForm action={createSubcategoryAction} successMessage="Subcategoria adicionada." className="space-y-3"><Field label="Categoria"><select className="field" name="categoryId" required>{data.categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Subcategoria"><input className="field" name="name" required /></Field><Submit>Adicionar subcategoria</Submit></MutationForm></div>
      </FormDetails>
    </div>
    <section className="card mt-2 p-5"><SectionTitle title="Segurança" description="A alteração revoga imediatamente todas as sessões anteriores." /><ChangePasswordForm /></section>
    <section className="card mt-6 p-5"><SectionTitle title="Zona de risco" description="Ações irreversíveis exigem sua senha atual e confirmação explícita." /><DangerZone /></section>
  </>;
}
