import fp from 'fastify-plugin';
import { Translations } from '../models/translations.model.js';
import { config } from '../config/env.js';

async function translationsRoutes(fastify) {
  fastify.post('/api/translations', async (request, reply) => {
    const { password, ...payload } = request.body;
    
    const trimmedPassword = password ? String(password).trim() : '';
    const configPassword = String(config.adminPassword).trim();
    
    // Check password
    if (!trimmedPassword || trimmedPassword !== configPassword) {
      reply.code(403).send({ error: 'Forbidden: Invalid password' });
      return;
    }
    
    const created = await Translations.create(payload);
    reply.code(201).send(created);
  });

  fastify.get('/api/translations', async (request, reply) => {
    const { page = 1, limit = 20, q } = request.query ?? {};
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const filter = q
      ? { word: { $regex: String(q), $options: 'i' } }
      : {};
    const [items, total] = await Promise.all([
      Translations.find(filter)
        .sort({ word: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Translations.countDocuments(filter),
    ]);
    reply.send({ items, total, page: pageNum, limit: limitNum });
  });

  fastify.get('/api/translations/random/:number', async (request, reply) => {
    const { number } = request.params;
    
    const items = await Translations.aggregate([
      { $match: { memorized: false } },
      { $sample: { size: parseInt(number) } },
    ]);
    reply.send(items);
  });

  fastify.put('/api/translations/:id', async (request, reply) => {
    const { id } = request.params;
    const { password, ...updateData } = request.body;
    
    const trimmedPassword = password ? String(password).trim() : '';
    const configPassword = String(config.adminPassword).trim();
    
    // Check password
    if (!trimmedPassword || trimmedPassword !== configPassword) {
      reply.code(403).send({ error: 'Forbidden: Invalid password' });
      return;
    }
    
    const updated = await Translations.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      reply.code(404).send({ error: 'Translation not found' });
      return;
    }
    
    reply.send(updated);
  });

  fastify.delete('/api/translations/:id', async (request, reply) => {
    const { id } = request.params;
    const { password } = request.body;
    
    const trimmedPassword = password ? String(password).trim() : '';
    const configPassword = String(config.adminPassword).trim();
    
    // Check password
    if (!trimmedPassword || trimmedPassword !== configPassword) {
      reply.code(403).send({ error: 'Forbidden: Invalid password' });
      return;
    }
    
    const deleted = await Translations.findByIdAndDelete(id);
    if (!deleted) {
      reply.code(404).send({ error: 'Translation not found' });
      return;
    }
    
    reply.code(204).send();
  });
}

export default fp(translationsRoutes);