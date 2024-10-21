// import { Configuration, OpenAIApi } from 'openai';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { balance, identity, investments, transactions } = req.body;

  try {
    const prompt = `
      Analyze the following financial data for a mortgage application:

      Balance: ${JSON.stringify(balance)}
      Identity: ${JSON.stringify(identity)}
      Investments: ${JSON.stringify(investments)}
      Transactions: ${JSON.stringify(transactions)}

      Please provide an analysis of the applicant's financial situation, including:
      1. Income stability
      2. Savings and assets
      3. Debt-to-income ratio
      4. Credit utilization
      5. Overall financial health
      6. Recommendations for improving mortgage application chances

      Based on this analysis, estimate the likelihood of mortgage approval and suggest a suitable mortgage amount.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });

    const analysis = response.choices[0].message.content;
    res.status(200).json({ analysis });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ message: 'An error occurred while analyzing the data' });
  }
}