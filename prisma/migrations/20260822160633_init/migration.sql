-- CreateEnum
CREATE TYPE "TradeCode" AS ENUM ('ELECTRICAL', 'ELECTRONICS', 'AUTOMOTIVE');

-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('PENDING', 'DIAGNOSING', 'WAITING_PARTS', 'REPAIRING', 'QC_PENDING', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignatureType" AS ENUM ('SUPERVISOR', 'CUSTOMER', 'REGISTRAR');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('LINE', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role_id" TEXT NOT NULL,
    "center_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "region" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "mission_id" TEXT NOT NULL,
    "line_group_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "national_id_enc" TEXT NOT NULL,
    "first_name_enc" TEXT NOT NULL,
    "last_name_enc" TEXT NOT NULL,
    "phone" TEXT,
    "phone_hash" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_orders" (
    "id" TEXT NOT NULL,
    "queue_number" TEXT NOT NULL,
    "trade_code" "TradeCode" NOT NULL,
    "status" "RepairStatus" NOT NULL DEFAULT 'PENDING',
    "mission_id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "assigned_to_id" TEXT,
    "device_category" TEXT NOT NULL,
    "device_brand" TEXT,
    "device_model" TEXT,
    "serial_number" TEXT,
    "problem_desc" TEXT NOT NULL,
    "problem_images" TEXT[],
    "parts_cost" DECIMAL(12,2),
    "market_repair_cost" DECIMAL(12,2),
    "economic_value_saved" DECIMAL(12,2),
    "qr_token" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "technician_notes" TEXT,
    "supervisor_notes" TEXT,

    CONSTRAINT "repair_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_history" (
    "id" TEXT NOT NULL,
    "repair_order_id" TEXT NOT NULL,
    "from_status" "RepairStatus",
    "to_status" "RepairStatus" NOT NULL,
    "changed_by_id" TEXT,
    "note" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_queue_counters" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,
    "trade_code" "TradeCode" NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_queue_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_items" (
    "id" TEXT NOT NULL,
    "repair_order_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(10,2) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "is_procured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" TEXT NOT NULL,
    "repair_order_id" TEXT NOT NULL,
    "type" "SignatureType" NOT NULL,
    "data_base64" TEXT NOT NULL,
    "signer_name" TEXT,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_checklists" (
    "id" TEXT NOT NULL,
    "repair_order_id" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "overall_passed" BOOLEAN NOT NULL,
    "checked_by_id" TEXT,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "inspection_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "repair_order_id" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "repair_order_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_action_key" ON "permissions"("action");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_center_id_idx" ON "users"("center_id");

-- CreateIndex
CREATE INDEX "missions_fiscal_year_idx" ON "missions"("fiscal_year");

-- CreateIndex
CREATE INDEX "missions_is_active_idx" ON "missions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_centers_code_key" ON "service_centers"("code");

-- CreateIndex
CREATE INDEX "service_centers_mission_id_idx" ON "service_centers"("mission_id");

-- CreateIndex
CREATE INDEX "customers_phone_hash_idx" ON "customers"("phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "repair_orders_queue_number_key" ON "repair_orders"("queue_number");

-- CreateIndex
CREATE UNIQUE INDEX "repair_orders_qr_token_key" ON "repair_orders"("qr_token");

-- CreateIndex
CREATE INDEX "repair_orders_center_id_idx" ON "repair_orders"("center_id");

-- CreateIndex
CREATE INDEX "repair_orders_mission_id_idx" ON "repair_orders"("mission_id");

-- CreateIndex
CREATE INDEX "repair_orders_status_idx" ON "repair_orders"("status");

-- CreateIndex
CREATE INDEX "repair_orders_trade_code_idx" ON "repair_orders"("trade_code");

-- CreateIndex
CREATE INDEX "repair_orders_qr_token_idx" ON "repair_orders"("qr_token");

-- CreateIndex
CREATE INDEX "repair_orders_registered_at_idx" ON "repair_orders"("registered_at");

-- CreateIndex
CREATE INDEX "status_history_repair_order_id_idx" ON "status_history"("repair_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "trade_queue_counters_center_id_mission_id_trade_code_key" ON "trade_queue_counters"("center_id", "mission_id", "trade_code");

-- CreateIndex
CREATE INDEX "repair_items_repair_order_id_idx" ON "repair_items"("repair_order_id");

-- CreateIndex
CREATE INDEX "signatures_repair_order_id_idx" ON "signatures"("repair_order_id");

-- CreateIndex
CREATE INDEX "inspection_checklists_repair_order_id_idx" ON "inspection_checklists"("repair_order_id");

-- CreateIndex
CREATE INDEX "notifications_repair_order_id_idx" ON "notifications"("repair_order_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_repair_order_id_idx" ON "audit_logs"("repair_order_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "service_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_centers" ADD CONSTRAINT "service_centers_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "service_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_orders" ADD CONSTRAINT "repair_orders_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_repair_order_id_fkey" FOREIGN KEY ("repair_order_id") REFERENCES "repair_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_queue_counters" ADD CONSTRAINT "trade_queue_counters_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "service_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_queue_counters" ADD CONSTRAINT "trade_queue_counters_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_repair_order_id_fkey" FOREIGN KEY ("repair_order_id") REFERENCES "repair_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_repair_order_id_fkey" FOREIGN KEY ("repair_order_id") REFERENCES "repair_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_checklists" ADD CONSTRAINT "inspection_checklists_repair_order_id_fkey" FOREIGN KEY ("repair_order_id") REFERENCES "repair_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_repair_order_id_fkey" FOREIGN KEY ("repair_order_id") REFERENCES "repair_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_repair_order_id_fkey" FOREIGN KEY ("repair_order_id") REFERENCES "repair_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
