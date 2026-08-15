import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing GEMINI_API_KEY:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET');

  if (!apiKey) return;

  const genAI = new GoogleGenerativeAI(apiKey);
  const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];

  for (const modelName of candidateModels) {
    try {
      console.log(`Testing model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say hello in 3 words');
      const response = await result.response;
      console.log(`✅ SUCCESS with ${modelName}: "${response.text().trim()}"\n`);
      return modelName;
    } catch (err: any) {
      console.error(`❌ FAILED with ${modelName}:`, err.message || err);
    }
  }
}

testModels();
