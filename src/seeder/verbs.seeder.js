import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Verbs } from '../models/verbs.model.js';
import { connectToDatabase, disconnectFromDatabase } from '../config/db.js';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the verbs folder
const VERBS_FOLDER = path.join(__dirname, 'verbs');
const SEEDED_FILES_PATH = path.join(__dirname, 'seeded-files.json');

/**
 * Load the list of already seeded files
 * @returns {string[]} Array of seeded file names
 */
function loadSeededFiles() {
  try {
    if (fs.existsSync(SEEDED_FILES_PATH)) {
      const data = fs.readFileSync(SEEDED_FILES_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Could not load seeded files list:', error.message);
  }
  return [];
}

/**
 * Save the list of seeded files
 * @param {string[]} seededFiles - Array of seeded file names
 */
function saveSeededFiles(seededFiles) {
  try {
    fs.writeFileSync(SEEDED_FILES_PATH, JSON.stringify(seededFiles, null, 2));
  } catch (error) {
    console.error('Could not save seeded files list:', error.message);
  }
}

/**
 * Get all JSON files in the verbs folder
 * @returns {string[]} Array of JSON file names
 */
function getVerbFiles() {
  try {
    const files = fs.readdirSync(VERBS_FOLDER);
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    console.error('Could not read verbs folder:', error.message);
    return [];
  }
}

/**
 * Load and parse a verb file
 * @param {string} filename - Name of the file to load
 * @returns {Object[]} Array of verb objects
 */
function loadVerbFile(filename) {
  try {
    const filePath = path.join(VERBS_FOLDER, filename);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading file ${filename}:`, error.message);
    return [];
  }
}

/**
 * Ensure indexes are correct for seeding
 * - Drop legacy unique index on `infinitive`
 * - Ensure unique index on `word`
 */
async function ensureIndexes() {
  try {
    const indexes = await Verbs.collection.indexes();
    const hasInfinitiveIndex = indexes.find(
      (idx) => idx.name === 'infinitive_1' || (idx.key && idx.key.infinitive === 1)
    );
    if (hasInfinitiveIndex) {
      try {
        await Verbs.collection.dropIndex(hasInfinitiveIndex.name || 'infinitive_1');
        console.log('🧹 Dropped legacy index: infinitive_1');
      } catch (e) {
        console.warn('⚠️  Could not drop legacy index infinitive_1:', e.message);
      }
    }

    const wordIndex = indexes.find((idx) => idx.name === 'word_1' || (idx.key && idx.key.word === 1));
    if (wordIndex && !wordIndex.unique) {
      try {
        await Verbs.collection.dropIndex(wordIndex.name || 'word_1');
        console.log('🧹 Dropped non-unique word index to recreate as unique');
      } catch (e) {
        console.warn('⚠️  Could not drop existing word index:', e.message);
      }
    }

    // Create/ensure unique index on word
    try {
      await Verbs.collection.createIndex({ word: 1 }, { unique: true });
      console.log('✅ Ensured unique index on word');
    } catch (e) {
      console.warn('⚠️  Could not ensure unique index on word:', e.message);
    }
  } catch (error) {
    console.warn('⚠️  Index inspection failed:', error.message);
  }
}

/**
 * Seed a single verb into the database
 * @param {Object} verbData - Verb data object
 * @returns {Promise<boolean>} Success status
 */
async function seedVerb(verbData) {
  try {
    // Check if verb already exists
    const existingVerb = await Verbs.findOne({ word: verbData.word });
    
    if (existingVerb) {
      console.log(`Verb "${verbData.word}" already exists, skipping...`);
      return true;
    }

    // Create new verb
    const verb = new Verbs(verbData);
    await verb.save();
    console.log(`✅ Successfully seeded verb: "${verbData.word}"`);
    return true;
  } catch (error) {
    console.error(`❌ Error seeding verb "${verbData.word}":`, error.message);
    return false;
  }
}

/**
 * Seed all verbs from a file
 * @param {string} filename - Name of the file to process
 * @returns {Promise<{success: number, failed: number}>} Results summary
 */
async function seedVerbFile(filename) {
  console.log(`\n📁 Processing file: ${filename}`);
  
  const verbs = loadVerbFile(filename);
  if (!verbs || verbs.length === 0) {
    console.log(`⚠️  No verbs found in ${filename}`);
    return { success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const verbData of verbs) {
    const success = await seedVerb(verbData);
    if (success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`📊 Results for ${filename}: ${successCount} successful, ${failedCount} failed`);
  return { success: successCount, failed: failedCount };
}

/**
 * Main seeder function
 * Processes only newly added files and tracks seeded files
 */
export async function seedVerbs() {
  console.log('🌱 Starting Spanish Verbs Seeder...\n');

  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await connectToDatabase(config.mongoUri);
    console.log('✅ Database connected successfully\n');

    // Ensure indexes are correct before seeding
    await ensureIndexes();

    // Load previously seeded files
    const seededFiles = loadSeededFiles();
    console.log(`📋 Previously seeded files: ${seededFiles.length}`);
    if (seededFiles.length > 0) {
      console.log(`   Files: ${seededFiles.join(', ')}`);
    }

    // Get all verb files
    const allFiles = getVerbFiles();
    console.log(`\n📂 Found ${allFiles.length} verb files in folder`);

    if (allFiles.length === 0) {
      console.log('⚠️  No verb files found to process');
      return;
    }

    // Filter for new files
    const newFiles = allFiles.filter(file => !seededFiles.includes(file));
    console.log(`\n🆕 New files to process: ${newFiles.length}`);

    if (newFiles.length === 0) {
      console.log('✅ All files have already been seeded');
      return;
    }

    console.log(`   New files: ${newFiles.join(', ')}\n`);

    // Process new files
    let totalSuccess = 0;
    let totalFailed = 0;
    const newlySeededFiles = [];

    for (const filename of newFiles) {
      const results = await seedVerbFile(filename);
      totalSuccess += results.success;
      totalFailed += results.failed;
      
      // Only mark as seeded if at least one verb was successfully processed
      if (results.success > 0) {
        newlySeededFiles.push(filename);
      }
    }

    // Update seeded files list
    if (newlySeededFiles.length > 0) {
      const updatedSeededFiles = [...seededFiles, ...newlySeededFiles];
      saveSeededFiles(updatedSeededFiles);
      console.log(`\n💾 Updated seeded files list with: ${newlySeededFiles.join(', ')}`);
    }

    // Summary
    console.log('\n📈 SEEDING SUMMARY:');
    console.log(`   Files processed: ${newFiles.length}`);
    console.log(`   Verbs seeded successfully: ${totalSuccess}`);
    console.log(`   Verbs failed: ${totalFailed}`);
    console.log(`   Total seeded files: ${seededFiles.length + newlySeededFiles.length}`);

  } catch (error) {
    console.error('❌ Seeder error:', error.message);
    throw error;
  } finally {
    // Disconnect from database
    console.log('\n🔌 Disconnecting from database...');
    await disconnectFromDatabase();
    console.log('✅ Database disconnected');
  }
}

/**
 * Reset seeded files tracking (use with caution)
 * This will cause all files to be re-processed on next run
 */
export function resetSeededFiles() {
  try {
    if (fs.existsSync(SEEDED_FILES_PATH)) {
      fs.unlinkSync(SEEDED_FILES_PATH);
      console.log('🗑️  Seeded files tracking reset');
    } else {
      console.log('ℹ️  No seeded files tracking found to reset');
    }
  } catch (error) {
    console.error('❌ Error resetting seeded files:', error.message);
  }
}

/**
 * Show current seeding status
 */
export function showSeedingStatus() {
  const seededFiles = loadSeededFiles();
  const allFiles = getVerbFiles();
  const newFiles = allFiles.filter(file => !seededFiles.includes(file));

  console.log('📊 SEEDING STATUS:');
  console.log(`   Total files in folder: ${allFiles.length}`);
  console.log(`   Already seeded: ${seededFiles.length}`);
  console.log(`   New files: ${newFiles.length}`);
  
  if (seededFiles.length > 0) {
    console.log(`   Seeded files: ${seededFiles.join(', ')}`);
  }
  
  if (newFiles.length > 0) {
    console.log(`   New files: ${newFiles.join(', ')}`);
  }
}

// CLI support
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const command = process.argv[2] || 'seed';

  switch (command) {
    case 'seed':
      await seedVerbs();
      break;
    case 'reset':
      resetSeededFiles();
      break;
    case 'status':
      showSeedingStatus();
      break;
    default:
      console.log('Usage: node verbs.seeder.js [seed|reset|status]');
      console.log('  seed   - Run the seeder (default)');
      console.log('  reset  - Reset seeded files tracking');
      console.log('  status - Show current seeding status');
      // Fallback to seed by default
      await seedVerbs();
  }
}
