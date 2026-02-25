import { z } from 'zod';
import { insertCadastroSchema, cadastros } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  cadastros: {
    list: {
      method: 'GET' as const,
      path: '/api/cadastros' as const,
      responses: {
        200: z.array(z.custom<typeof cadastros.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/cadastros/:id' as const,
      responses: {
        200: z.custom<typeof cadastros.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/cadastros' as const,
      input: insertCadastroSchema,
      responses: {
        201: z.custom<typeof cadastros.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/cadastros/:id' as const,
      input: insertCadastroSchema.partial(),
      responses: {
        200: z.custom<typeof cadastros.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/cadastros/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  upload: {
    create: {
      method: 'POST' as const,
      path: '/api/upload' as const,
      responses: {
        200: z.object({ imageUrl: z.string() }),
        400: errorSchemas.validation,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type CadastroInput = z.infer<typeof api.cadastros.create.input>;
export type CadastroResponse = z.infer<typeof api.cadastros.create.responses[201]>;
export type CadastroUpdateInput = z.infer<typeof api.cadastros.update.input>;
export type CadastrosListResponse = z.infer<typeof api.cadastros.list.responses[200]>;
