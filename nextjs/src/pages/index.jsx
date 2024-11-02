import Router from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';

export default function PlaidLink() {
  const [token, setToken] = useState(null);
  const [payroll_token, setPayroll] = useState(null);
  const [bankConnected, setBankConnected] = useState(false);
  const [payrollConnected, setPayrollConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Connect Your Financial Accounts
          </h1>
          <p className="text-gray-600">
            Securely link your accounts to get started with your mortgage application
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Bank Connection Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l9-4 9 4v12l-9 4-9-4V6z" />
                </svg>
              </div>
              <h2 className="ml-4 text-xl font-semibold text-gray-800">Bank Account</h2>
            </div>
            <button
              onClick={() => open()}
              disabled={!ready || bankConnected}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors
                ${bankConnected 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {bankConnected ? '✓ Connected' : 'Link Bank Account'}
            </button>
          </div>

          {/* Payroll Connection Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="ml-4 text-xl font-semibold text-gray-800">Payroll</h2>
            </div>
            <button
              onClick={() => openPayroll()}
              disabled={!readyPayroll || payrollConnected}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors
                ${payrollConnected 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {payrollConnected ? '✓ Connected' : 'Link Payroll'}
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-12">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">Connection Progress</span>
              <span className="text-sm font-medium text-gray-600">
                {((bankConnected ? 50 : 0) + (payrollConnected ? 50 : 0))}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 rounded-full h-2 transition-all duration-500"
                style={{ width: `${((bankConnected ? 50 : 0) + (payrollConnected ? 50 : 0))}%` }}
              />
            </div>
          </div>
        </div>

        {bankConnected && payrollConnected && (
          <div className="mt-8 text-center">
            <div className="animate-pulse bg-green-100 text-green-800 p-4 rounded-lg">
              All accounts connected successfully! Redirecting to dashboard...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}