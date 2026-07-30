CREATE TYPE "public"."account_type" AS ENUM('CHECKING', 'SAVINGS', 'PAYMENT', 'INVESTMENT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('INCOME', 'EXPENSE', 'INVESTMENT');--> statement-breakpoint
CREATE TYPE "public"."debt_status" AS ENUM('ACTIVE', 'OVERDUE', 'PAID', 'RENEGOTIATED');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('OPEN', 'PAID', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."rate_period" AS ENUM('MONTHLY', 'ANNUAL');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('LIGHT', 'DARK', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PAID', 'RECEIVED', 'PENDING', 'OVERDUE', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('INCOME', 'EXPENSE', 'INVESTMENT', 'TRANSFER');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"institution" text,
	"type" "account_type" NOT NULL,
	"initial_balance" bigint DEFAULT 0 NOT NULL,
	"current_balance" bigint DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "category_type" NOT NULL,
	"color" text DEFAULT '#64748b' NOT NULL,
	"icon" text DEFAULT 'circle' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"budget_group" text DEFAULT 'NEEDS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_card_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"purchase_date" date NOT NULL,
	"description" text NOT NULL,
	"category_id" uuid NOT NULL,
	"total_amount" bigint NOT NULL,
	"installment_amount" bigint NOT NULL,
	"current_installment" integer DEFAULT 1 NOT NULL,
	"total_installments" integer DEFAULT 1 NOT NULL,
	"invoice_month" integer NOT NULL,
	"invoice_year" integer NOT NULL,
	"status" "purchase_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"institution" text,
	"total_limit" bigint NOT NULL,
	"closing_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"best_purchase_day" integer,
	"color" text DEFAULT '#111827' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"creditor" text NOT NULL,
	"debt_type" text NOT NULL,
	"original_amount" bigint NOT NULL,
	"current_balance" bigint NOT NULL,
	"total_installments" integer,
	"paid_installments" integer DEFAULT 0 NOT NULL,
	"installment_amount" bigint,
	"interest_rate" numeric(9, 4) DEFAULT '0' NOT NULL,
	"interest_rate_period" "rate_period" DEFAULT 'MONTHLY' NOT NULL,
	"start_date" date NOT NULL,
	"estimated_payoff_date" date,
	"next_due_date" date,
	"status" "debt_status" DEFAULT 'ACTIVE' NOT NULL,
	"priority" "priority" DEFAULT 'MEDIUM' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"target_amount" bigint NOT NULL,
	"current_amount" bigint DEFAULT 0 NOT NULL,
	"start_date" date NOT NULL,
	"target_date" date NOT NULL,
	"priority" "priority" DEFAULT 'MEDIUM' NOT NULL,
	"status" "goal_status" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"average_amount" bigint NOT NULL,
	"due_day" integer NOT NULL,
	"payment_method_id" uuid,
	"account_id" uuid,
	"automatic_debit" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"adjustment_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip_hash" text NOT NULL,
	"succeeded" boolean DEFAULT false NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"planned_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'wallet-cards' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"monthly_income" bigint DEFAULT 0 NOT NULL,
	"maximum_monthly_spending" bigint DEFAULT 0 NOT NULL,
	"desired_investment_percentage" numeric(5, 2) DEFAULT '20' NOT NULL,
	"emergency_fund_target" bigint DEFAULT 0 NOT NULL,
	"emergency_fund_months" integer DEFAULT 6 NOT NULL,
	"control_start_month" date,
	"theme" "theme" DEFAULT 'SYSTEM' NOT NULL,
	"needs_percentage" numeric(5, 2) DEFAULT '50' NOT NULL,
	"wants_percentage" numeric(5, 2) DEFAULT '30' NOT NULL,
	"investment_percentage" numeric(5, 2) DEFAULT '20' NOT NULL,
	"debt_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"safety_margin_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"type" "transaction_type" NOT NULL,
	"description" text NOT NULL,
	"category_id" uuid,
	"subcategory_id" uuid,
	"account_id" uuid,
	"wallet_id" uuid,
	"destination_account_id" uuid,
	"destination_wallet_id" uuid,
	"transfer_group_id" uuid,
	"payment_method_id" uuid,
	"credit_card_id" uuid,
	"credit_card_purchase_id" uuid,
	"fixed_expense_id" uuid,
	"reference_month" integer,
	"reference_year" integer,
	"amount" bigint NOT NULL,
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"due_date" date,
	"payment_date" date,
	"is_fixed" boolean DEFAULT false NOT NULL,
	"is_essential" boolean DEFAULT false NOT NULL,
	"installment_number" integer,
	"total_installments" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"initial_balance" bigint DEFAULT 0 NOT NULL,
	"current_balance" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "credit_card_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "credit_card_purchases_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_purchases" ADD CONSTRAINT "credit_card_purchases_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_expenses" ADD CONSTRAINT "fixed_expenses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD CONSTRAINT "monthly_budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_destination_account_id_accounts_id_fk" FOREIGN KEY ("destination_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_destination_wallet_id_wallets_id_fk" FOREIGN KEY ("destination_wallet_id") REFERENCES "public"."wallets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_credit_card_id_credit_cards_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_cards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_credit_card_purchase_id_credit_card_purchases_id_fk" FOREIGN KEY ("credit_card_purchase_id") REFERENCES "public"."credit_card_purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fixed_expense_id_fixed_expenses_id_fk" FOREIGN KEY ("fixed_expense_id") REFERENCES "public"."fixed_expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_active_idx" ON "accounts" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name_type_uidx" ON "categories" USING btree ("user_id","name","type");--> statement-breakpoint
CREATE INDEX "categories_user_active_idx" ON "categories" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "card_purchases_user_invoice_idx" ON "credit_card_purchases" USING btree ("user_id","invoice_year","invoice_month");--> statement-breakpoint
CREATE INDEX "card_purchases_card_status_idx" ON "credit_card_purchases" USING btree ("credit_card_id","status");--> statement-breakpoint
CREATE INDEX "credit_cards_user_active_idx" ON "credit_cards" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "debts_user_status_due_idx" ON "debts" USING btree ("user_id","status","next_due_date");--> statement-breakpoint
CREATE INDEX "financial_goals_user_status_idx" ON "financial_goals" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "fixed_expenses_user_active_idx" ON "fixed_expenses" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "login_attempts_lookup_idx" ON "login_attempts" USING btree ("email","ip_hash","attempted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_budgets_user_category_period_uidx" ON "monthly_budgets" USING btree ("user_id","category_id","month","year");--> statement-breakpoint
CREATE INDEX "monthly_budgets_user_period_idx" ON "monthly_budgets" USING btree ("user_id","year","month");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_user_name_uidx" ON "payment_methods" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_uidx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_expires_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_user_uidx" ON "settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subcategories_category_name_uidx" ON "subcategories" USING btree ("category_id","name");--> statement-breakpoint
CREATE INDEX "subcategories_user_category_idx" ON "subcategories" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "transactions_user_payment_date_idx" ON "transactions" USING btree ("user_id","payment_date");--> statement-breakpoint
CREATE INDEX "transactions_user_status_due_idx" ON "transactions" USING btree ("user_id","status","due_date");--> statement-breakpoint
CREATE INDEX "transactions_user_category_idx" ON "transactions" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_fixed_expense_period_uidx" ON "transactions" USING btree ("fixed_expense_id","reference_year","reference_month");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "wallets_user_active_idx" ON "wallets" USING btree ("user_id","is_active");