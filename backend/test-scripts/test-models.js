import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log('🔍 Fetching available Gemini models...\n');
    
    // Try to list models
    const models = await genAI.listModels();
    
    console.log('✅ Available Models:');
    console.log('==================\n');
    
    for (const model of models) {
      console.log(`Model: ${model.name}`);
      console.log(`Display Name: ${model.displayName}`);
      console.log(`Description: ${model.description}`);
      console.log(`Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
    
    // If listing fails, try common model names
    console.log('\n🔄 Trying common model names...\n');
    
    const modelNamesToTry = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-2.0-flash-exp',
      'models/gemini-pro',
      'models/gemini-1.5-pro',
      'models/gemini-1.5-flash'
    ];
    
    for (const modelName of modelNamesToTry) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        console.log(`✅ ${modelName} - WORKS!`);
      } catch (err) {
        console.log(`❌ ${modelName} - Failed: ${err.message.split('\n')[0]}`);
      }
    }
  }
  
  process.exit(0);
}

listModels();
