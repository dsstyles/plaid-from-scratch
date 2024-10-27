import { withIronSessionApiRoute } from 'iron-session/next';
import { plaidClient, sessionOptions } from '../../lib/plaid';

export default withIronSessionApiRoute(exchangePublicToken, sessionOptions);

async function exchangePublicToken(req, res) {
  const { public_token, product_type } = req.body;
  
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: public_token,
  });

  // Store token based on product type
  if (product_type === 'payroll') {
    req.session.payroll_access_token = exchangeResponse.data.access_token;
  } else {
    req.session.access_token = exchangeResponse.data.access_token;
  }

  await req.session.save();
  res.send({ ok: true });
}





