import { BookOpenCheck } from "lucide-react";
import { PageHeader } from "@/components/page";

const topics = [
  ["1. Primeiro acesso", "Configure o Neon, execute as migrations e rode npm run user:init com as variáveis INITIAL_USER_* preenchidas."],
  ["2. Contas e cartões", "Cadastre contas, carteiras e categorias em Configurações. Cartões e limites são gerenciados na página Cartões."],
  ["3. Receitas e despesas", "Em Lançamentos, informe data, tipo, categoria, origem, valor e situação. Valores só entram nos indicadores após a liquidação."],
  ["4. Orçamentos", "Defina um limite por categoria a cada mês. Verde indica até 80%, amarelo até 100% e vermelho indica excesso."],
  ["5. Dashboard", "Escolha mês e ano para ver indicadores, alertas e gráficos calculados pelo regime de caixa."],
  ["6. Metas", "Informe objetivo, valor já acumulado e prazo. O sistema calcula o aporte mensal necessário e o ritmo esperado."],
  ["7. Dívidas", "Cadastre saldo, parcela e taxa. Use o simulador para estimar o impacto de um valor extra mensal."],
  ["8. Exportar backup", "Acesse Backup e baixe o JSON. Guarde o arquivo em local privado e seguro."],
  ["9. Restaurar backup", "Selecione o JSON, confira o resumo, escolha substituir ou mesclar e confirme com sua senha."],
  ["10. Alterar a senha", "Abra Configurações, informe a senha atual e uma nova senha com ao menos 12 caracteres."],
  ["11. Atualizar o sistema", "Faça backup, atualize o código, instale dependências, execute migrations e valide o build antes do deploy."],
  ["12. Executar migrations", "Use npm run db:generate após alterações de schema e npm run db:migrate para aplicar os arquivos no banco configurado."],
];

export default function HelpPage() {
  return <>
    <PageHeader eyebrow="Documentação" title="Ajuda" description="Um guia rápido para configurar e usar seu controle financeiro com segurança." />
    <div className="grid gap-4 md:grid-cols-2">
      {topics.map(([title, content]) => <article className="card p-5" key={title}><div className="mb-3 flex items-center gap-2"><BookOpenCheck size={17} className="text-[var(--primary)]" /><h2 className="font-bold">{title}</h2></div><p className="text-sm leading-6 text-[var(--muted)]">{content}</p></article>)}
    </div>
  </>;
}
