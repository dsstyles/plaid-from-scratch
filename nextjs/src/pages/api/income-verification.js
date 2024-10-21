import { withIronSessionApiRoute } from 'iron-session/next';
import { plaidClient, sessionOptions } from '../../lib/plaid';

// export default withIronSessionApiRoute(async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ message: 'Method not allowed' });
//   }

//   const access_token = req.session.access_token;

//   if (!access_token) {
//     return res.status(401).json({ message: 'No access token' });
//   }

//   try {
//     // First, we need to create an income verification instance
//     const createResponse = await plaidClient.incomeVerificationCreate({
//       access_token: access_token,
//       webhook: 'https://www.example.com/webhook',
//       options: {
//         income_source_types: ['bank'],
//       },
//     });

//     const income_verification_id = createResponse.data.income_verification_id;

//     // Then, we can get the income verification
//     const getResponse = await plaidClient.incomeVerificationGet({
//       income_verification_id: income_verification_id,
//     });

//     res.status(200).json({ income: getResponse.data });
//   } catch (error) {
//     console.error('Error verifying income:', error);
//     res.status(500).json({ message: 'An error occurred while verifying income' });
//   }
// }, sessionOptions);


async function handleIncomeVerification(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const access_token = req.session.access_token;

  if (!access_token) {
    return res.status(401).json({ message: 'No access token' });
  }

  try {
    // First, get the Item ID associated with the access token
    const itemResponse = await plaidClient.itemGet({ access_token });
    const item_id = itemResponse.data.item.item_id;

    // Now, create an income verification instance
    const createResponse = await plaidClient.incomeVerificationCreate({
      webhook: 'https://www.example.com/webhook',
      precheck_id: null,
      options: {
        access_tokens: [access_token],
      },
    });

    console.log('Income verification create response:', createResponse.data);

    res.status(200).json({ income: createResponse.data });
  } catch (error) {
    console.error('Error performing income verification:', error.response?.data || error);
    res.status(500).json({ 
      message: 'Failed to perform income verification', 
      error: error.response?.data || error.message 
    });
  }
}

  
  export default withIronSessionApiRoute(handleIncomeVerification, sessionOptions);
  