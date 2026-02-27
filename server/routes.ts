import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploader = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  })
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  app.get(api.cadastros.list.path, async (req, res) => {
    const data = await storage.getCadastros();
    res.json(data);
  });

  app.get(api.cadastros.get.path, async (req, res) => {
    const item = await storage.getCadastro(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: 'Cadastro não encontrado' });
    }
    res.json(item);
  });

  app.post(api.cadastros.create.path, async (req, res) => {
    try {
      const input = api.cadastros.create.input.parse(req.body);
      const item = await storage.createCadastro(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.cadastros.update.path, async (req, res) => {
    try {
      const input = api.cadastros.update.input.parse(req.body);
      const item = await storage.updateCadastro(Number(req.params.id), input);
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.cadastros.delete.path, async (req, res) => {
    await storage.deleteCadastro(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.organogramas.list.path, async (req, res) => {
    const data = await storage.getOrganogramas();
    res.json(data);
  });

  app.get(api.organogramas.get.path, async (req, res) => {
    const item = await storage.getOrganograma(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Organograma não encontrado" });
    res.json(item);
  });

  app.post(api.organogramas.create.path, async (req, res) => {
    const input = api.organogramas.create.input.parse(req.body);
    const item = await storage.createOrganograma(input);
    res.status(201).json(item);
  });

  app.put(api.organogramas.update.path, async (req, res) => {
    const input = api.organogramas.update.input.parse(req.body);
    const item = await storage.updateOrganograma(Number(req.params.id), input);
    res.json(item);
  });

  app.delete(api.organogramas.delete.path, async (req, res) => {
    await storage.deleteOrganograma(Number(req.params.id));
    res.status(204).send();
  });

  app.post(api.upload.create.path, uploader.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  // Seed database
  seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getCadastros();
  if (existing.length === 0) {
    await storage.createCadastro({
      nome: "JOÃO DA SILVA",
      alcunha: "JOÃOZINHO",
      rg: "12.345.678-9",
      cpf: "123.456.789-00",
      dataNascimento: "01/01/1990",
      orcrim: "PCC",
      situacao: "PRESO",
      codigoPreso: "123456",
      pai: "JOSÉ DA SILVA",
      mae: "MARIA DA SILVA",
      endereco: "RUA A, 123",
      antecedentes: "ROUBO",
      observacoes: "NADA A DECLARAR",
    });
  }
}
