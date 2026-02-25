import { db } from "./db";
import {
  cadastros,
  organogramas,
  type Cadastro,
  type InsertCadastro,
  type UpdateCadastroRequest,
  type Organograma,
  type InsertOrganograma,
} from "@shared/schema";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  getCadastros(): Promise<Cadastro[]>;
  getCadastro(id: number): Promise<Cadastro | undefined>;
  createCadastro(cadastro: InsertCadastro): Promise<Cadastro>;
  updateCadastro(id: number, updates: UpdateCadastroRequest): Promise<Cadastro>;
  deleteCadastro(id: number): Promise<void>;
  
  getOrganogramas(): Promise<Organograma[]>;
  createOrganograma(organograma: InsertOrganograma): Promise<Organograma>;
  updateOrganograma(id: number, updates: Partial<InsertOrganograma>): Promise<Organograma>;
  deleteOrganograma(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getCadastros(): Promise<Cadastro[]> {
    return await db.select().from(cadastros).orderBy(asc(cadastros.nome));
  }

  async getCadastro(id: number): Promise<Cadastro | undefined> {
    const [cadastro] = await db.select().from(cadastros).where(eq(cadastros.id, id));
    return cadastro;
  }

  async createCadastro(insertCadastro: InsertCadastro): Promise<Cadastro> {
    const [cadastro] = await db.insert(cadastros).values(insertCadastro).returning();
    return cadastro;
  }

  async updateCadastro(id: number, updates: UpdateCadastroRequest): Promise<Cadastro> {
    const [updated] = await db.update(cadastros)
      .set(updates)
      .where(eq(cadastros.id, id))
      .returning();
    return updated;
  }

  async deleteCadastro(id: number): Promise<void> {
    await db.delete(cadastros).where(eq(cadastros.id, id));
  }

  async getOrganogramas(): Promise<Organograma[]> {
    return await db.select().from(organogramas);
  }

  async createOrganograma(organograma: InsertOrganograma): Promise<Organograma> {
    const [item] = await db.insert(organogramas).values(organograma).returning();
    return item;
  }

  async updateOrganograma(id: number, updates: Partial<InsertOrganograma>): Promise<Organograma> {
    const [updated] = await db.update(organogramas)
      .set(updates)
      .where(eq(organogramas.id, id))
      .returning();
    return updated;
  }

  async deleteOrganograma(id: number): Promise<void> {
    await db.delete(organogramas).where(eq(organogramas.id, id));
  }
}

export const storage = new DatabaseStorage();
