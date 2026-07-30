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
import { Field, FormDetails, PageHeader, SectionTitle, Submit } from "@/components/page";
import { getSettingsData } from "@/lib/queries";

export default async function SettingsPage() {
  const data = await getSettingsData();
  async function saveAccount(fd: FormData) { "use server"; await createAccountAction(fd); }
  async function saveCategory(fd: FormData) { "use server"; await createCategoryAction(fd); }
  async function saveSettings(fd: FormData) { "use server"; await updateSettingsAction(fd); }
  return <>
    <PageHeader eyebrow="Preferências" title="Configurações" description="Gerencie seu acesso, parâmetros financeiros e cadastros auxiliares." />
    <section className="card mb-6 p-5"><SectionTitle title="Perfil" description="O e-mail alterado será usado no próximo login." /><form action={updateProfileAction} className="grid gap-4 sm:grid-cols-3"><Field label="Nome"><input className="field" name="name" defaultValue={data.user.name} required /></Field><Field label="E-mail"><input className="field" name="email" type="email" defaultValue={data.user.email} required /></Field><div className="flex items-end"><Submit>Salvar perfil</Submit></div></form></section>
    <section className="card mb-6 p-5"><SectionTitle title="Planejamento financeiro" description="A distribuição deve somar exatamente 100%." /><form action={saveSettings} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Renda mensal média"><input className="field" name="monthlyIncome" defaultValue={(data.settings?.monthlyIncome ?? 0) / 100} /></Field>
      <Field label="Limite máximo de gastos"><input className="field" name="maximumMonthlySpending" defaultValue={(data.settings?.maximumMonthlySpending ?? 0) / 100} /></Field>
      <Field label="Meta da reserva"><input className="field" name="emergencyFundTarget" defaultValue={(data.settings?.emergencyFundTarget ?? 0) / 100} /></Field>
      <Field label="Meses da reserva"><input className="field" name="emergencyFundMonths" type="number" defaultValue={data.settings?.emergencyFundMonths ?? 6} /></Field>
      <Field label="Necessidades (%)"><input className="field" name="needsPercentage" type="number" step=".1" defaultValue={data.settings?.needsPercentage ?? "50"} /></Field>
      <Field label="Desejos (%)"><input className="field" name="wantsPercentage" type="number" step=".1" defaultValue={data.settings?.wantsPercentage ?? "30"} /></Field>
      <Field label="Investimentos (%)"><input className="field" name="investmentPercentage" type="number" step=".1" defaultValue={data.settings?.investmentPercentage ?? "20"} /></Field>
      <Field label="Dívidas (%)"><input className="field" name="debtPercentage" type="number" step=".1" defaultValue={data.settings?.debtPercentage ?? "0"} /></Field>
      <Field label="Margem (%)"><input className="field" name="safetyMarginPercentage" type="number" step=".1" defaultValue={data.settings?.safetyMarginPercentage ?? "0"} /></Field>
      <Field label="Tema"><select className="field" name="theme" defaultValue={data.settings?.theme ?? "SYSTEM"}><option value="SYSTEM">Sistema</option><option value="LIGHT">Claro</option><option value="DARK">Escuro</option></select></Field>
      <div className="flex items-end"><Submit>Salvar parâmetros</Submit></div>
    </form></section>
    <div className="grid gap-4 lg:grid-cols-2">
      <FormDetails title="Contas bancárias">
        <h3 className="mb-3 text-sm font-semibold">Adicionar nova conta</h3>
        <form action={saveAccount} className="grid gap-4 sm:grid-cols-2"><Field label="Nome"><input className="field" name="name" required /></Field><Field label="Instituição"><input className="field" name="institution" /></Field><Field label="Tipo"><select className="field" name="type"><option value="CHECKING">Conta corrente</option><option value="SAVINGS">Poupança</option><option value="PAYMENT">Conta de pagamento</option><option value="INVESTMENT">Investimentos</option><option value="OTHER">Outra</option></select></Field><Field label="Saldo inicial"><input className="field" name="initialBalance" defaultValue="0,00" /></Field><Field label="Cor"><input className="field" name="color" type="color" defaultValue="#6366f1" /></Field><div className="flex items-end"><Submit>Adicionar conta</Submit></div></form>
        <AccountManager accounts={data.accounts} />
      </FormDetails>
      <FormDetails title="Adicionar categoria">
        <form action={saveCategory} className="grid gap-4 sm:grid-cols-2"><Field label="Nome"><input className="field" name="name" required /></Field><Field label="Tipo"><select className="field" name="type"><option value="EXPENSE">Despesa</option><option value="INCOME">Receita</option><option value="INVESTMENT">Investimento</option></select></Field><Field label="Grupo"><select className="field" name="budgetGroup"><option value="NEEDS">Necessidades</option><option value="WANTS">Desejos</option><option value="INVESTMENTS">Investimentos</option><option value="DEBTS">Dívidas</option></select></Field><Field label="Cor"><input className="field" name="color" type="color" defaultValue="#64748b" /></Field><input type="hidden" name="icon" value="circle" /><div className="flex items-end"><Submit>Adicionar categoria</Submit></div></form>
        <div className="mt-5 flex flex-wrap gap-2">{data.categories.map((item) => <span className="badge" key={item.id}><i className="h-2 w-2 rounded-full" style={{ background: item.color }} />{item.name}</span>)}</div>
      </FormDetails>
      <FormDetails title="Adicionar carteira">
        <form action={createWalletAction} className="grid gap-4 sm:grid-cols-2"><Field label="Nome"><input className="field" name="name" required /></Field><Field label="Saldo inicial"><input className="field" name="initialBalance" defaultValue="0,00" /></Field><div className="flex items-end"><Submit>Adicionar carteira</Submit></div></form>
      </FormDetails>
      <FormDetails title="Formas de pagamento e subcategorias">
        <div className="grid gap-6 sm:grid-cols-2"><form action={createPaymentMethodAction} className="space-y-3"><Field label="Forma de pagamento"><input className="field" name="name" placeholder="Ex.: Pix" required /></Field><Submit>Adicionar forma</Submit></form><form action={createSubcategoryAction} className="space-y-3"><Field label="Categoria"><select className="field" name="categoryId">{data.categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field><Field label="Subcategoria"><input className="field" name="name" required /></Field><Submit>Adicionar subcategoria</Submit></form></div>
      </FormDetails>
    </div>
    <section className="card mt-2 p-5"><SectionTitle title="Segurança" description="A alteração revoga imediatamente todas as sessões anteriores." /><ChangePasswordForm /></section>
    <section className="card mt-6 p-5"><SectionTitle title="Zona de risco" description="Ações irreversíveis exigem sua senha atual e confirmação explícita." /><DangerZone /></section>
  </>;
}
