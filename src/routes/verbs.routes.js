import fp from 'fastify-plugin';
import { Verbs } from '../models/verbs.model.js';

async function verbsRoutes(fastify) {
  // Create
  fastify.post('/api/verbs', async (request, reply) => {
    const payload = request.body;
    const created = await Verbs.create(payload);
    reply.code(201).send(created);
  });

  // Read all with basic pagination
  fastify.get('/api/verbs', async (request, reply) => {
    const { page = 1, limit = 20, q } = request.query ?? {};
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const filter = q
      ? { word: { $regex: String(q), $options: 'i' } }
      : {};
    const [items, total] = await Promise.all([
      Verbs.find(filter)
        .sort({ word: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Verbs.countDocuments(filter),
    ]);
    reply.send({ items, total, page: pageNum, limit: limitNum });
  });


  //search verbs with query 
  fastify.get('/api/verbs/search', async (request, reply) => {
    const { q } = request.query ?? {};
    const filter = q
      ? { word: { $regex: String(q), $options: 'i' } }
      : {};
    const items = await Verbs.find(filter);
    const returnItems = items.map((item) => {
      return {
        _id: item._id,
        word: item.word,
      };
    });
    reply.send(returnItems);
  });

  // Read one
  fastify.get('/api/verbs/:id', async (request, reply) => {
    const { id } = request.params;
    const doc = await Verbs.findById(id);
    if (!doc) return reply.code(404).send({ message: 'Not found' });
    reply.send(doc);
  });

  // Update
  fastify.put('/api/verbs/:id', async (request, reply) => {
    const { id } = request.params;
    const update = request.body;
    const doc = await Verbs.findByIdAndUpdate(id, update, { new: true, timestamps: true });
    if (!doc) return reply.code(404).send({ message: 'Not found' });
    reply.send(doc);
  });

  // Delete
  fastify.delete('/api/verbs/:id', async (request, reply) => {
    const { id } = request.params;
    const res = await Verbs.findByIdAndDelete(id);
    if (!res) return reply.code(404).send({ message: 'Not found' });
    reply.code(204).send();
  });
}

export default fp(verbsRoutes);

