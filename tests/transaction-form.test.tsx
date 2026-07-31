// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { createTransactionAction } = vi.hoisted(() => ({
  createTransactionAction: vi.fn(async (formData: FormData) => {
    void formData;
    return { ok: true as const };
  }),
}));

vi.mock("@/actions/finance", () => ({
  createTransactionAction,
  updateTransactionAction: vi.fn(async () => ({ ok: true })),
}));

import { MutationForm } from "@/components/mutation-form";
import { TransactionForm } from "@/components/transaction-form";

const masters = {
  accounts: [],
  wallets: [],
  categories: [],
  subcategories: [],
  paymentMethods: [],
  creditCards: [],
};

afterEach(cleanup);

describe("formulário de lançamento", () => {
  it("exige a data somente quando a receita é marcada como recebida", () => {
    render(<TransactionForm masters={masters as never} />);

    fireEvent.change(screen.getByLabelText(/Tipo/), { target: { value: "INCOME" } });
    const status = screen.getByLabelText(/Situação/) as HTMLSelectElement;
    expect([...status.options].map((option) => option.text)).toContain("Recebido");
    expect([...status.options].map((option) => option.text)).not.toContain("Pago");

    const pendingDate = screen.getByLabelText(/Data de recebimento/) as HTMLInputElement;
    expect(pendingDate).not.toBeRequired();

    fireEvent.change(status, { target: { value: "RECEIVED" } });
    const receivedDate = screen.getByLabelText(/Data de recebimento/) as HTMLInputElement;
    expect(receivedDate).toBeRequired();
    expect(receivedDate.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(receivedDate.closest("label")).toHaveTextContent("Data de recebimento*");
  });

  it("não oferece nem envia destino ou cartão em uma receita", async () => {
    createTransactionAction.mockClear();
    render(<TransactionForm masters={masters as never} />);

    fireEvent.change(screen.getByLabelText(/Tipo/), { target: { value: "INCOME" } });
    expect(screen.queryByLabelText(/Conta de destino/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Carteira de destino/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Cartão/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Descrição/), { target: { value: "Salário" } });
    fireEvent.change(screen.getByLabelText(/Valor/), { target: { value: "1000,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar lançamento" }));

    await waitFor(() => expect(createTransactionAction).toHaveBeenCalledTimes(1));
    const submitted = createTransactionAction.mock.calls[0]?.[0] as FormData;
    expect(submitted.get("type")).toBe("INCOME");
    expect(submitted.has("destinationAccountId")).toBe(false);
    expect(submitted.has("destinationWalletId")).toBe(false);
    expect(submitted.has("creditCardId")).toBe(false);
  });

  it("preserva os dados preenchidos quando o servidor rejeita o envio", async () => {
    const failingAction = vi.fn(async () => ({ ok: false as const, error: "Dados inválidos." }));
    render(
      <MutationForm action={failingAction}>
        <input aria-label="Descrição de teste" name="description" />
        <button type="submit">Salvar</button>
      </MutationForm>,
    );

    const description = screen.getByLabelText("Descrição de teste");
    fireEvent.change(description, { target: { value: "Valor preservado" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(failingAction).toHaveBeenCalledTimes(1));
    expect(description).toHaveValue("Valor preservado");
  });
});
