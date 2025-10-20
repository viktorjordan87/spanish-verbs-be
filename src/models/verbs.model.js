import mongoose from 'mongoose';

const { Schema } = mongoose;

const tenseConjugationSchema = new Schema(
  {
    yo: { type: String },
    tu: { type: String },
    el: { type: String },
    nosotros: { type: String },
    vosotros: { type: String },
    ellos: { type: String },
  },
  { _id: false, timestamps: false }
);

const verbsSchema = new Schema(
  {
    word: { type: String, required: true, index: true, trim: true, unique: true },
    tenses: {
      present: tenseConjugationSchema,
      preterite: tenseConjugationSchema,
      imperfect: tenseConjugationSchema,
      future: tenseConjugationSchema,
      conditional: tenseConjugationSchema,
      presentSubjunctive: tenseConjugationSchema,
      imperfectSubjunctive: tenseConjugationSchema,
      presentPerfect: tenseConjugationSchema,
      pastPerfect: tenseConjugationSchema,
      futurePerfect: tenseConjugationSchema,
      conditionalPerfect: tenseConjugationSchema,
    },
  },
  { collection: 'verbs', timestamps: true }
);

export const Verbs = mongoose.models.Verbs || mongoose.model('Verbs', verbsSchema);

