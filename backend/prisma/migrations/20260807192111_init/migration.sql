-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ADMINISTRADOR', 'EXPEDICAO', 'QUALIDADE', 'CONSULTA');

-- CreateEnum
CREATE TYPE "StatusNfe" AS ENUM ('PENDENTE', 'IMPORTADA', 'ERRO', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusPallet" AS ENUM ('MONTADO', 'EXPEDIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "FormatoEtiqueta" AS ENUM ('F100X150', 'F100X100', 'A4');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL DEFAULT 'CONSULTA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transportadoras" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transportadoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "codigo_produto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfe" (
    "id" TEXT NOT NULL,
    "chave_nfe" TEXT NOT NULL,
    "numero_nf" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "transportadoraId" TEXT,
    "data_emissao" TIMESTAMP(3),
    "status" "StatusNfe" NOT NULL DEFAULT 'PENDENTE',
    "origem" TEXT NOT NULL,
    "xml_raw" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nfe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfe_items" (
    "id" TEXT NOT NULL,
    "nfeId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "codigo_produto" TEXT NOT NULL,
    "lote" TEXT NOT NULL,
    "quantidade" DECIMAL(14,4) NOT NULL,
    "unidade" TEXT NOT NULL,
    "data_fabricacao" TIMESTAMP(3),
    "data_validade" TIMESTAMP(3),

    CONSTRAINT "nfe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lotes" (
    "id" TEXT NOT NULL,
    "lote" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "data_fabricacao" TIMESTAMP(3),
    "data_validade" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pallets" (
    "id" TEXT NOT NULL,
    "nfeId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "status" "StatusPallet" NOT NULL DEFAULT 'MONTADO',
    "data_expedicao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pallet_items" (
    "id" TEXT NOT NULL,
    "palletId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "lote" TEXT NOT NULL,
    "quantidade" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "pallet_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etiquetas" (
    "id" TEXT NOT NULL,
    "palletId" TEXT NOT NULL,
    "formato" "FormatoEtiqueta" NOT NULL,
    "qr_payload" TEXT NOT NULL,
    "gerada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "ip" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acao" TEXT NOT NULL,
    "antes" JSONB,
    "depois" JSONB,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_key" ON "clientes"("cnpj");

-- CreateIndex
CREATE INDEX "idx_cliente_nome" ON "clientes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "transportadoras_cnpj_key" ON "transportadoras"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigo_produto_key" ON "produtos"("codigo_produto");

-- CreateIndex
CREATE INDEX "idx_produto_codigo" ON "produtos"("codigo_produto");

-- CreateIndex
CREATE UNIQUE INDEX "nfe_chave_nfe_key" ON "nfe"("chave_nfe");

-- CreateIndex
CREATE INDEX "idx_nfe_chave" ON "nfe"("chave_nfe");

-- CreateIndex
CREATE INDEX "idx_nfe_numero" ON "nfe"("numero_nf");

-- CreateIndex
CREATE INDEX "idx_nfe_item_lote" ON "nfe_items"("lote");

-- CreateIndex
CREATE INDEX "idx_nfe_item_codigo_produto" ON "nfe_items"("codigo_produto");

-- CreateIndex
CREATE INDEX "idx_nfe_item_validade" ON "nfe_items"("data_validade");

-- CreateIndex
CREATE INDEX "idx_lote_lote" ON "lotes"("lote");

-- CreateIndex
CREATE INDEX "idx_lote_validade" ON "lotes"("data_validade");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_lote_por_produto" ON "lotes"("produtoId", "lote");

-- CreateIndex
CREATE INDEX "idx_pallet_item_lote" ON "pallet_items"("lote");

-- AddForeignKey
ALTER TABLE "nfe" ADD CONSTRAINT "nfe_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfe" ADD CONSTRAINT "nfe_transportadoraId_fkey" FOREIGN KEY ("transportadoraId") REFERENCES "transportadoras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfe_items" ADD CONSTRAINT "nfe_items_nfeId_fkey" FOREIGN KEY ("nfeId") REFERENCES "nfe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfe_items" ADD CONSTRAINT "nfe_items_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_nfeId_fkey" FOREIGN KEY ("nfeId") REFERENCES "nfe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallets" ADD CONSTRAINT "pallets_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallet_items" ADD CONSTRAINT "pallet_items_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "pallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pallet_items" ADD CONSTRAINT "pallet_items_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etiquetas" ADD CONSTRAINT "etiquetas_palletId_fkey" FOREIGN KEY ("palletId") REFERENCES "pallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
