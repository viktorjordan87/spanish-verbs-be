import mongoose from 'mongoose';

const { Schema } = mongoose;

const translationSchema = new Schema({
  english: { type: String, required: true },
  hungarian: { type: String, required: true }, 
}, { _id: false, timestamps: false });

const translationsSchema = new Schema({
  word: { type: String, required: true },
  translations: { type: translationSchema, required: true },
  memorized: { type: Boolean, default: false, required: false },
}, { collection: 'translations', timestamps: true });

export const Translations = mongoose.models.Translations || mongoose.model('Translations', translationsSchema);
