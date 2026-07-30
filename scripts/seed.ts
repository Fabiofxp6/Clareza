import {
  accounts,
  categories,
  creditCardPurchases,
  creditCards,
  debts,
  financialGoals,
  monthlyBudgets,
  paymentMethods,
  settings,
  subcategories,
  transactions,
  users,
  wallets,
} from "../db/schema";
import { scriptDb } from "./db";

const categorySeed = [
  ["Receitas", "INCOME", ["Salário", "Renda extra", "Freelance", "Benefícios", "Aluguel recebido", "Rendimentos de investimentos", "Reembolso", "Venda de produtos", "Outros recebimentos"]],
  ["Moradia", "EXPENSE", ["Aluguel", "Financiamento", "Condomínio", "Energia elétrica", "Água", "Gás", "Internet", "Telefone", "Manutenção", "IPTU"]],
  ["Alimentação", "EXPENSE", ["Supermercado", "Feira", "Padaria", "Restaurantes", "Lanches", "Delivery"]],
  ["Transporte", "EXPENSE", ["Combustível", "Transporte público", "Aplicativos", "Estacionamento", "Manutenção do veículo", "Seguro", "IPVA", "Financiamento do veículo"]],
  ["Saúde", "EXPENSE", ["Plano de saúde", "Consultas", "Exames", "Medicamentos", "Dentista", "Terapias", "Academia"]],
  ["Educação", "EXPENSE", ["Escola", "Faculdade", "Cursos", "Livros", "Materiais", "Mensalidades", "Congressos"]],
  ["Cuidados pessoais", "EXPENSE", ["Cabeleireiro", "Cosméticos", "Vestuário", "Calçados", "Higiene pessoal"]],
  ["Lazer", "EXPENSE", ["Viagens", "Cinema", "Festas", "Assinaturas", "Passeios", "Restaurantes", "Presentes"]],
  ["Família", "EXPENSE", ["Filhos", "Mesada", "Animais de estimação", "Ajuda familiar", "Cuidados com idosos"]],
  ["Obrigações financeiras", "EXPENSE", ["Empréstimos", "Financiamentos", "Parcelamentos", "Juros", "Tarifas bancárias", "Impostos"]],
  ["Investimentos", "INVESTMENT", ["Reserva de emergência", "Renda fixa", "Tesouro Direto", "Fundos de investimento", "Ações", "Previdência privada", "Criptomoedas", "Outros investimentos"]],
] as const;
const colors = ["#10b981", "#6366f1", "#f59e0b", "#06b6d4", "#ef4444", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#64748b", "#5557e8"];

const [user] = await scriptDb.select().from(users).limit(1);
if (!user) throw new Error("Crie o usuário com npm run user:init antes do seed.");

const inserted = new Map<string, string>();
for (let index = 0; index < categorySeed.length; index++) {
  const [name, type, children] = categorySeed[index];
  const [category] = await scriptDb
    .insert(categories)
    .values({
      userId: user.id,
      name,
      type,
      color: colors[index],
      isDefault: true,
      budgetGroup: type === "INVESTMENT" ? "INVESTMENTS" : name === "Lazer" || name === "Cuidados pessoais" ? "WANTS" : name === "Obrigações financeiras" ? "DEBTS" : "NEEDS",
    })
    .onConflictDoUpdate({
      target: [categories.userId, categories.name, categories.type],
      set: { isDefault: true },
    })
    .returning();
  inserted.set(name, category.id);
  for (const child of children) {
    await scriptDb.insert(subcategories).values({ userId: user.id, categoryId: category.id, name: child }).onConflictDoNothing();
  }
}
for (const name of ["Pix", "Débito", "Crédito", "Dinheiro", "Boleto", "Débito automático"]) {
  await scriptDb.insert(paymentMethods).values({ userId: user.id, name }).onConflictDoNothing();
}
await scriptDb.insert(settings).values({ userId: user.id }).onConflictDoNothing();

if (process.env.DEMO_SEED === "true") {
  const [account] = await scriptDb.insert(accounts).values({ userId: user.id, name: "Conta principal", institution: "Banco Demo", type: "CHECKING", initialBalance: 500_000, currentBalance: 825_000, color: "#5557e8" }).returning();
  const [wallet] = await scriptDb.insert(wallets).values({ userId: user.id, name: "Carteira", initialBalance: 10_000, currentBalance: 10_000 }).returning();
  const incomeCategory = inserted.get("Receitas")!;
  const foodCategory = inserted.get("Alimentação")!;
  const investmentCategory = inserted.get("Investimentos")!;
  const today = new Date();
  const day = today.toISOString().slice(0, 10);
  await scriptDb.insert(transactions).values([
    { userId: user.id, date: day, paymentDate: day, type: "INCOME", description: "Salário de demonstração", categoryId: incomeCategory, accountId: account.id, amount: 500_000, status: "RECEIVED" },
    { userId: user.id, date: day, paymentDate: day, type: "EXPENSE", description: "Supermercado", categoryId: foodCategory, accountId: account.id, amount: 125_000, status: "PAID", isEssential: true },
  ]);
  const [card] = await scriptDb.insert(creditCards).values({ userId: user.id, name: "Cartão principal", institution: "Banco Demo", totalLimit: 800_000, closingDay: 20, dueDay: 28, bestPurchaseDay: 21, color: "#111827" }).returning();
  await scriptDb.insert(creditCardPurchases).values({ userId: user.id, creditCardId: card.id, purchaseDate: day, description: "Notebook", categoryId: inserted.get("Educação")!, totalAmount: 360_000, installmentAmount: 60_000, totalInstallments: 6, invoiceMonth: today.getMonth() + 1, invoiceYear: today.getFullYear() });
  await scriptDb.insert(financialGoals).values({ userId: user.id, name: "Reserva de emergência", category: "Segurança", targetAmount: 3_000_000, currentAmount: 850_000, startDate: day, targetDate: `${today.getFullYear() + 2}-${String(today.getMonth() + 1).padStart(2, "0")}-01`, priority: "HIGH" });
  await scriptDb.insert(debts).values({ userId: user.id, name: "Financiamento", creditor: "Banco Demo", debtType: "Financiamento", originalAmount: 2_000_000, currentBalance: 1_400_000, totalInstallments: 36, paidInstallments: 10, installmentAmount: 75_000, interestRate: "1.2", startDate: day, status: "ACTIVE" });
  await scriptDb.insert(monthlyBudgets).values({ userId: user.id, categoryId: foodCategory, month: today.getMonth() + 1, year: today.getFullYear(), plannedAmount: 160_000 }).onConflictDoNothing();
  void wallet;
  void investmentCategory;
}
console.log(`Seed concluído${process.env.DEMO_SEED === "true" ? " com dados de demonstração" : ""}.`);
