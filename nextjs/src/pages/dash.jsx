import { useState } from 'react';
import { withIronSessionSsr } from 'iron-session/next';
import { plaidClient, sessionOptions } from '../lib/plaid';

export default function Dashboard({ balance, identity, investments, transactions, error, incomeVerification, isTransactionsPending }) {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [incomeVerificationData, setIncomeVerificationData] = useState(incomeVerification);

  const handleAnalyzeData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analyze-financial-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ balance, identity, investments, transactions }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze data');
      }

      const result = await response.json();
      setAnalysis(result.analysis);
    } catch (error) {
      console.error('Error analyzing data:', error);
      setAnalysis('An error occurred while analyzing the data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncomeVerification = async () => {
    console.log('Initiating income verification');
    try {
      const response = await fetch('/api/income-verification', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch income verification');
      }
      const data = await response.json();
      console.log('Income verification data received:', data);
      setIncomeVerificationData(data);
    } catch (error) {
      console.error('Error fetching income verification:', error);
    }
  };
  

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Financial Dashboard</h1>
      
      <section>
        <h2>Account Balances</h2>
        {balance.accounts.map((account, i) => (
          <div key={`balance-${i}`}>
            <h3>{account.name} ({account.type})</h3>
            <p>Current Balance: ${account.balances.current}</p>
            <p>Available Balance: ${account.balances.available || 'N/A'}</p>
          </div>
        ))}
      </section>

      <section>
        <h2>Identity Information</h2>
        {identity.accounts.map((account, i) => (
          <div key={`identity-${i}`}>
            <h3>Account: {account.name}</h3>
            {account.owners.map((owner, j) => (
              <div key={`owner-${j}`}>
                <p>Name: {owner.names.join(', ')}</p>
                <p>Email: {owner.emails.map(e => e.data).join(', ')}</p>
                <p>Phone: {owner.phone_numbers.map(p => p.data).join(', ')}</p>
                <p>Address: {owner.addresses.map(a => `${a.data.street}, ${a.data.city}, ${a.data.region} ${a.data.postal_code}`).join('; ')}</p>
              </div>
            ))}
          </div>
        ))}
      </section>

      {investments && investments.holdings && (
        <section>
          <h2>Investment Holdings</h2>
          {investments.holdings.map((holding, i) => {
            const security = investments.securities.find(s => s.security_id === holding.security_id);
            return (
              <div key={`holding-${i}`}>
                <p>Security: {security ? security.name : 'Unknown'}</p>
                <p>Ticker: {security ? security.ticker_symbol : 'N/A'}</p>
                <p>Quantity: {holding.quantity}</p>
                <p>Current Value: ${holding.institution_value.toFixed(2)}</p>
                <p>Price: ${holding.institution_price.toFixed(2)}</p>
              </div>
            );
          })}
        </section>
      )}

      <section>
        <h2>Recent Transactions</h2>
        {isTransactionsPending ? (
          <p>Transaction data is still being processed. Please check back later.</p>
        ) : (
          transactions.transactions.map((transaction, i) => (
            <div key={`transaction-${i}`}>
              <p>Date: {transaction.date}</p>
              <p>Description: {transaction.name}</p>
              <p>Amount: ${transaction.amount}</p>
              <p>Category: {transaction.category.join(', ')}</p>
            </div>
          ))
        )}
      </section>

      <button onClick={handleIncomeVerification}>
        Verify Income
      </button>

      {incomeVerificationData && incomeVerificationData.paystubs && (
        <section>
          <h2>Income Verification</h2>
          {incomeVerificationData.paystubs.map((paystub, index) => (
            <div key={`paystub-${index}`}>
              <h3>Paystub {index + 1}</h3>
              <p>Employer: {paystub.employer.name}</p>
              {/* Rest of your paystub rendering code */}
            </div>
          ))}
        </section>
      )}


      <button onClick={handleAnalyzeData} disabled={isLoading}>
        {isLoading ? 'Analyzing...' : 'Analyze Data for Mortgage Application'}
      </button>

      {analysis && (
        <section>
          <h2>Mortgage Application Analysis</h2>
          <pre>{analysis}</pre>
        </section>
      )}
    </div>
  );
}

export const getServerSideProps = withIronSessionSsr(
  async function getServerSideProps({ req }) {
    const access_token = req.session.access_token;

    if (!access_token) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }

    try {
      const [balanceResponse, identityResponse, incomeVerificationResponse] = await Promise.all([
        plaidClient.accountsBalanceGet({ access_token }),
        plaidClient.identityGet({ access_token }),
        plaidClient.incomeVerificationPaystubsGet({ access_token }).catch(e => null)
      ]);

      console.log('Income Verification Data:', incomeVerificationResponse?.data);

      let investmentsResponse = null;
      try {
        investmentsResponse = await plaidClient.investmentsHoldingsGet({ access_token });
      } catch (investmentError) {
        if (investmentError.response?.data?.error_code !== 'NO_INVESTMENT_ACCOUNTS') {
          console.error('Error fetching investment data:', investmentError);
        }
      }

      let transactionsResponse = null;
      let isTransactionsPending = false;
      try {
        transactionsResponse = await plaidClient.transactionsGet({
          access_token,
          start_date: '2023-01-01',
          end_date: '2023-12-31',
        });
      } catch (transactionError) {
        if (transactionError.response?.data?.error_code === 'PRODUCT_NOT_READY') {
          console.log('Transactions not ready yet');
          isTransactionsPending = true;
        } else {
          throw transactionError;
        }
      }

      return {
        props: {
          balance: balanceResponse.data || null,
          identity: identityResponse.data || null,
          investments: investmentsResponse?.data || null,
          transactions: transactionsResponse?.data || null,
          isTransactionsPending,
          incomeVerification: incomeVerificationResponse?.data || null,
        },
      };
    } catch (error) {
      console.error('Error fetching data from Plaid:', error);
      return {
        props: {
          error: error.response?.data?.error_message || 'An error occurred while fetching data',
        },
      };
    }
  },
  sessionOptions
);
