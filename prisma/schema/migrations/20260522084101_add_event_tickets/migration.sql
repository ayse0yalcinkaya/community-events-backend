-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('FREE', 'PAID', 'DONATION');

-- CreateEnum
CREATE TYPE "TicketPurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "event_tickets" (
    "id" UUID NOT NULL,
    "eventID" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "type" "TicketType" NOT NULL DEFAULT 'FREE',
    "price" DECIMAL(10,2),
    "currency" VARCHAR(3) DEFAULT 'TRY',
    "quota" INTEGER,
    "available" INTEGER NOT NULL DEFAULT 0,
    "salesStart" TIMESTAMP(3),
    "salesEnd" TIMESTAMP(3),
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_ticket_purchases" (
    "id" UUID NOT NULL,
    "ticketID" UUID NOT NULL,
    "userID" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'TRY',
    "status" "TicketPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_ticket_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_tickets_eventID_idx" ON "event_tickets"("eventID");

-- CreateIndex
CREATE INDEX "event_ticket_purchases_ticketID_idx" ON "event_ticket_purchases"("ticketID");

-- CreateIndex
CREATE INDEX "event_ticket_purchases_userID_idx" ON "event_ticket_purchases"("userID");

-- AddForeignKey
ALTER TABLE "event_tickets" ADD CONSTRAINT "event_tickets_eventID_fkey" FOREIGN KEY ("eventID") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ticket_purchases" ADD CONSTRAINT "event_ticket_purchases_ticketID_fkey" FOREIGN KEY ("ticketID") REFERENCES "event_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_ticket_purchases" ADD CONSTRAINT "event_ticket_purchases_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
