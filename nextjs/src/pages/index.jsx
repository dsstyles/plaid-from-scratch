import Router from 'next/router';

import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export default function PlaidLink() {
  const [token, setToken] = useState(null);
  const [payroll_token, setPayroll] = useState(null);

  useEffect(() => {
    const createLinkToken = async () => {
      const response = await fetch('/api/create-link-token', {
        method: 'POST',
      });
      const { link_token } = await response.json();
      setToken(link_token);

      const payrollResponse = await fetch('/api/create-payroll-link-token', {
        method: 'POST',
      });
      const { link_token: payroll_link_token } = await payrollResponse.json();
      setPayroll(payroll_link_token);
    };
    createLinkToken();
  }, []);

  const onSuccess = useCallback(async (publicToken, metadata) => {
    try {
      if (!publicToken) {
        throw new Error('Public token is missing');
      }

      let accountId = null;
      let productType = 'income'; // Default to 'income' if we can't determine

      if (metadata && metadata.accounts && metadata.accounts.length > 0) {
        accountId = metadata.accounts[0].id;
        if (metadata.accounts[0].type === 'payroll') {
          productType = 'payroll';
        }
      } else {
        console.warn('Metadata or accounts information is missing or incomplete');
      }

      const response = await fetch('/api/exchange-public-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token: publicToken,
          account_id: accountId,
          product_type: productType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange public token');
      }

      const data = await response.json();
      console.log('Token exchange successful:', data);

      Router.push('/dash');
    } catch (error) {
      console.error('Error in onSuccess callback:', error);
      // Here you might want to show an error message to the user
      // For example: setError(error.message);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
  });
  const { open: openPayroll, ready: readyPayroll } = usePlaidLink({
    token: payroll_token,
    onSuccess
  });


  return (
    <div>
      <button onClick={() => open()} disabled={!ready}>
        <strong>Link account</strong>
      </button>
      <button onClick={() => openPayroll()} disabled={!readyPayroll}>
          <strong>Link Payroll account</strong>
      </button>
    </div>
  );
}
