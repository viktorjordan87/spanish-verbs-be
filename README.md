Spanish Verbs Backend (Fastify + Mongoose)

Requirements
- Node.js 18+
- MongoDB running locally or in the cloud

Setup
1. Copy `.env.example` to `.env` and adjust values.
2. Install dependencies:
   - npm install

Scripts
- npm run dev — start in watch mode
- npm start — start normally

API
- GET /health — health check
- CRUD under /api/verbs

Model shape (example)
```json
{
  "infinitive": "hablar",
  "definition": "to speak",
  "type": "-ar",
  "regular": true,
  "tenses": {
    "present": { "yo": "hablo", "tu": "hablas" }
  }
}
```

