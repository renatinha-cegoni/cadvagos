import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const cadastros = pgTable("cadastros", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  alcunha: text("alcunha"),
  rg: text("rg"),
  cpf: text("cpf"),
  dataNascimento: text("data_nascimento"),
  orcrim: text("orcrim"),
  situacao: text("situacao"),
  codigoPreso: text("codigo_preso"),
  pai: text("pai"),
  mae: text("mae"),
  endereco: text("endereco"),
  antecedentes: text("antecedentes"),
  observacoes: text("observacoes"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCadastroSchema = createInsertSchema(cadastros).omit({ id: true, createdAt: true });

export type Cadastro = typeof cadastros.$inferSelect;
export type InsertCadastro = z.infer<typeof insertCadastroSchema>;
export type UpdateCadastroRequest = Partial<InsertCadastro>;
