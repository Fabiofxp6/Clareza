ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "card_purchases_amounts_ck" CHECK ("credit_card_purchases"."total_amount" > 0 and "credit_card_purchases"."installment_amount" > 0);--> statement-breakpoint
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "card_purchases_installments_ck" CHECK ("credit_card_purchases"."current_installment" > 0 and "credit_card_purchases"."total_installments" > 0 and "credit_card_purchases"."current_installment" <= "credit_card_purchases"."total_installments");--> statement-breakpoint
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "card_purchases_invoice_month_ck" CHECK ("credit_card_purchases"."invoice_month" between 1 and 12);--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_limit_ck" CHECK ("credit_cards"."total_limit" > 0);--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_closing_day_ck" CHECK ("credit_cards"."closing_day" between 1 and 31);--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_due_day_ck" CHECK ("credit_cards"."due_day" between 1 and 31);--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_amounts_ck" CHECK ("debts"."original_amount" >= 0 and "debts"."current_balance" >= 0);--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_installments_ck" CHECK ("debts"."paid_installments" >= 0 and ("debts"."total_installments" is null or "debts"."total_installments" > 0));--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_amounts_ck" CHECK ("financial_goals"."target_amount" > 0 and "financial_goals"."current_amount" >= 0);--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_dates_ck" CHECK ("financial_goals"."target_date" >= "financial_goals"."start_date");--> statement-breakpoint
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_amount_ck" CHECK ("fixed_expenses"."average_amount" >= 0);--> statement-breakpoint
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_due_day_ck" CHECK ("fixed_expenses"."due_day" between 1 and 31);--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_month_ck" CHECK ("monthly_budgets"."month" between 1 and 12);--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_year_ck" CHECK ("monthly_budgets"."year" between 2000 and 2200);--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_amount_ck" CHECK ("monthly_budgets"."planned_amount" >= 0);--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_percentages_ck" CHECK ("settings"."needs_percentage" >= 0 and "settings"."wants_percentage" >= 0 and "settings"."investment_percentage" >= 0 and "settings"."debt_percentage" >= 0 and "settings"."safety_margin_percentage" >= 0 and "settings"."needs_percentage" + "settings"."wants_percentage" + "settings"."investment_percentage" + "settings"."debt_percentage" + "settings"."safety_margin_percentage" = 100);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_ck" CHECK ("transactions"."amount" > 0);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_liquidation_ck" CHECK ("transactions"."status" not in ('PAID', 'RECEIVED') or "transactions"."payment_date" is not null);