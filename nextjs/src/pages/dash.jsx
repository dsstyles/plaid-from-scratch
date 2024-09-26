import { useState } from 'react';
import { withIronSessionSsr } from 'iron-session/next';
import { plaidClient, sessionOptions } from '../lib/plaid';

export default function Dashboard({ balance, identity, investments, transactions, error, isTransactionsPending }) {
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

      {investments && (
        <section>
          <h2>Investment Holdings</h2>
          {investments.holdings.map((holding, i) => (
            <div key={`holding-${i}`}>
              <p>Security: {holding.security.name}</p>
              <p>Quantity: {holding.quantity}</p>
              <p>Current Value: ${holding.institution_value}</p>
            </div>
          ))}
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
      const [balanceResponse, identityResponse] = await Promise.all([
        plaidClient.accountsBalanceGet({ access_token }),
        plaidClient.identityGet({ access_token }),
      ]);

      let investmentsResponse = null;
      try {
        investmentsResponse = await plaidClient.investmentsHoldingsGet({ access_token });
      } catch (investmentError) {
        if (investmentError.response?.data?.error_code !== 'NO_INVESTMENT_ACCOUNTS') {
          console.error('Error fetching investment data:', investmentError);
        }
        // If it is NO_INVESTMENT_ACCOUNTS, we just leave investmentsResponse as null
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
          throw transactionError;  // Re-throw if it's not the PRODUCT_NOT_READY error
        }
      }

      return {
        props: {
          balance: balanceResponse.data,
          identity: identityResponse.data,
          investments: investmentsResponse?.data || null,
          transactions: transactionsResponse?.data || null,
          isTransactionsPending,
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