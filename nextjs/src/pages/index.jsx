import Router from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export default function PlaidLink() {
  console.log('PlaidLink component rendered');
  const [token, setToken] = useState(null);
  const [payroll_token, setPayroll] = useState(null);
  const [bankConnected, setBankConnected] = useState(false);
  const [payrollConnected, setPayrollConnected] = useState(false);


  useEffect(() => {
    const createLinkToken = async () => {
      console.log('Fetching link token');
      const response = await fetch('/api/create-link-token', { method: 'POST' });
      console.log('Link token response received');
      const { link_token } = await response.json();
      setToken(link_token);

      console.log('Fetching payroll link token');
      const payrollResponse = await fetch('/api/create-payroll-link-token', {
        method: 'POST',
      });
      const { link_token: payroll_link_token } = await payrollResponse.json();
      console.log('Payroll link token received:', payroll_link_token);
      setPayroll(payroll_link_token);
    };
    createLinkToken();
  }, []);

  useEffect(() => {
    if (bankConnected && payrollConnected) {
      (async () => {
        try {
          await Router.push('/dash');
          console.log('Navigation to /dash completed');
        } catch (err) {
          console.error('Navigation failed:', err);
        }
      })();
    }
  }, [bankConnected, payrollConnected]);

  const onSuccess = useCallback(async (publicToken, metadata) => {
    console.log('Bank onSuccess called:', { publicToken, metadata });
    try {
      if (!publicToken) {
        throw new Error('Public token is missing');
      }

      const response = await fetch('/api/exchange-public-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token: publicToken,
          account_id: metadata.accounts[0].id,
          product_type: 'income',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange public token');
      }

      const data = await response.json();
      console.log('Token exchange response:', data);

      setBankConnected(true);
      console.log('Updated bank connection status:', true);
    } catch (error) {
      console.error('Error in bank onSuccess callback:', error);
    }
  }, []);

  const onPayrollSuccess = useCallback(async (publicToken, metadata) => {
    console.log('Payroll onSuccess called:', { publicToken, metadata });
    try {
      if (!publicToken) {
        throw new Error('Public token is missing');
      }

      let accountId = null;
      if (metadata && metadata.accounts && metadata.accounts.length > 0) {
        accountId = metadata.accounts[0].id;
        console.log('Payroll account ID:', accountId);
      } else {
        console.log('No payroll account ID found');
        console.log('Metadata received:', metadata);
      }

      const response = await fetch('/api/exchange-public-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token: publicToken,
          account_id: accountId,
          product_type: 'payroll',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange public token');
      }

      const data = await response.json();
      console.log('Payroll token exchange response:', data);

      // Store payroll token in session
      // await fetch('/api/store-payroll-token', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     payroll_access_token: data.payroll_access_token
      //   })
      // });

      setPayrollConnected(true);
      console.log('Updated payroll connection status:', true);
    } catch (error) {
      console.error('Error in payroll onSuccess callback:', error);
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
  });

  const { open: openPayroll, ready: readyPayroll } = usePlaidLink({
    token: payroll_token,
    onSuccess: onPayrollSuccess
  });

  return (
    <div>
      <h1>Plaid Link Debug Info</h1>
      <p>Bank Connected: {bankConnected ? 'Yes' : 'No'}</p>
      <p>Payroll Connected: {payrollConnected ? 'Yes' : 'No'}</p>
      <p>Bank Token: {token ? 'Set' : 'Not Set'}</p>
      <p>Payroll Token: {payroll_token ? 'Set' : 'Not Set'}</p>

      <button onClick={() => console.log('Console Log Test')}>Clg</button>
      <button onClick={() => {
        console.log('Bank connect button clicked');
        open();
      }} disabled={!ready || bankConnected}>
        <strong>{bankConnected ? 'Bank Account Connected' : 'Link Bank Account'}</strong>
      </button>
      <button onClick={() => {
        console.log('Payroll connect button clicked');
        openPayroll();
      }} disabled={!readyPayroll || payrollConnected}>
        <strong>{payrollConnected ? 'Payroll Account Connected' : 'Link Payroll Account'}</strong>
      </button>

      {bankConnected && payrollConnected && (
        <p>Both accounts connected. Redirecting to dashboard...</p>
      )}

      <h2>Debug Log</h2>
      <pre>
        {JSON.stringify({
          bankConnected,
          payrollConnected,
          tokenSet: !!token,
          payrollTokenSet: !!payroll_token,
          ready,
          readyPayroll
        }, null, 2)}
      </pre>
    </div>
  );
}
