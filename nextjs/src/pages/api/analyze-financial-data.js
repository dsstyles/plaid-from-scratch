import OpenAI from 'openai';
import PDFDocument from 'pdfkit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { balance, identity, investments, transactions, incomeVerificationData } = req.body;

  try {
    const prompt = `
      The following financial data for a mortgage application:

      Balance: ${JSON.stringify(balance)}
      Identity: ${JSON.stringify(identity)}
      Investments: ${JSON.stringify(investments)}
      Transactions: ${JSON.stringify(transactions)}
      Income Verification: ${JSON.stringify(incomeVerificationData)}

      You are a professional mortgage brocker and you need to create a professional mortgage application form the data provided. The application should include the following:
      1. Income stability
      2. Savings and assets
      3. Debt-to-income ratio
      4. Credit utilization
      5. Overall financial health
      6. Recommendations for improving mortgage application chances

    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',  // Fixed typo in model name
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
    });

    const analysis = response.choices[0].message.content;
    console.log('Analysis:', analysis);

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=mortgage_analysis.pdf');

    // Create and pipe PDF document
    const doc = new PDFDocument();
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('Mortgage Application Analysis', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(new Date().toLocaleDateString(), { align: 'right' });
    doc.moveDown();
    doc.fontSize(12).text(analysis);

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error processing request:', error);
    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ message: 'An error occurred while analyzing the data' });
    }
  }
}