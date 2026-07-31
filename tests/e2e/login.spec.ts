import { expect, test } from "@playwright/test";

test("exibe login e não oferece cadastro público", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bem-vindo ao Clareza" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByText("Não há cadastro público")).toBeVisible();
});

test("protege rotas privadas e preserva a tela de acesso", async ({ page }) => {
  await page.goto("/configuracoes");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Bem-vindo ao Clareza" })).toBeVisible();
});
