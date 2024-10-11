import { plaidClient } from '../../lib/plaid';

export default async function handler(req, res) {
  try {
    const clientUserId = `user-${Date.now()}`;

    // Step 1: Create a user and get the user_token
    const createUserResponse = await plaidClient.userCreate({
      client_user_id: clientUserId,
    });
    const userToken = createUserResponse.data.user_token;

    // Step 2: Create the link token
    const tokenResponse = await plaidClient.linkTokenCreate({
      user: { 
        client_user_id: clientUserId
      },
      client_name: "custom_payroll",
      products: ['income_verification'],
      country_codes: ['US'],
      language: 'en',
      webhook: process.env.WEBHOOK_URL,
      redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI,
      income_verification: {
        income_source_types: ['payroll'],
        payroll_income: {
          flow_types: ['payroll_digital_income'],
          is_update_mode: false
        }
      },
      user_token: userToken // Move user_token here, outside of income_verification
    });

    return res.json(tokenResponse.data);
  } catch (error) {
    console.error('Error creating payroll link token:', error.response?.data || error.message);
    return res.status(500).json({ error: error.message });
  }
}