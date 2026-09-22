/**
 * FINOVA Financial Intelligence & Predictive Analytics Engine
 *
 * Performs real-time financial analysis on actual user transaction data:
 *  1. Recurring Subscriptions & Fixed Commitments Detection
 *  2. Smart Financial Insights with data-backed explanations ("Why")
 *  3. Predictive Financial Forecast (Upcoming commitments, projected balance)
 *  4. Cash-Flow & Discretionary Spending Patterns
 */

export interface TransactionInput {
  id?: string;
  date: Date | string;
  description: string;
  rawNarration?: string | null;
  merchantName?: string | null;
  counterparty?: string | null;
  channel?: string | null;
  amount: number;
  type: string; // 'credit' | 'debit'
  category: string;
  subcategory?: string | null;
  confidence?: string | null;
  balance?: number | null;
  transactionType?: string | null;
  source?: string | null;
}

export interface RecurringItem {
  name: string;
  amount: number;
  category: string;
  frequency: 'Monthly' | 'Biweekly' | 'Annual';
  confidence: string;
  lastDate: string;
}

export interface SmartInsight {
  type: 'success' | 'warning' | 'info' | 'alert';
  title: string;
  message: string;
  explanation: string; // Data-driven explanation of WHY this insight was generated
  metric?: string;
}

export interface ForecastModel {
  expectedIncome: number;
  expectedFixedCommitments: number;
  estimatedDiscretionaryExpenses: number;
  projectedMonthEndBalance: number;
  recurringItems: RecurringItem[];
  basisExplanation: string;
  hasHistoricalData: boolean;
}

export interface FinancialIntelligenceOutput {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRate: number;
    discretionarySpendRatio: number;
    debtToIncomeRatio: number;
    totalTransactions: number;
  };
  insights: SmartInsight[];
  forecast: ForecastModel;
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
  incomeCategories: Array<{ category: string; amount: number; percentage: number }>;
  topMerchants: Array<{ name: string; amount: number; count: number }>;
}

export function analyzeFinancials(transactions: TransactionInput[]): FinancialIntelligenceOutput {
  // Sort ascending by date
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalEmi = 0;
  let totalInvestments = 0;
  let totalDiscretionary = 0;
  let bankTxnCount = 0;
  let walletTxnCount = 0;

  let largestTransaction: TransactionInput | null = null;

  const categoryMap: Record<string, number> = {};
  const incomeCatMap: Record<string, number> = {};
  const merchantMap: Record<string, { amount: number; count: number }> = {};
  const recurringItems: RecurringItem[] = [];

  // Group transactions for processing
  sorted.forEach(t => {
    const amt = Math.round(t.amount * 100) / 100;
    const cat = t.category;
    const txType = t.transactionType || (t.type === 'credit' ? 'Income' : 'Expense'); // fallback

    // Safely exclude internal transfers & P2P entirely from maths
    if (txType === 'Transfer' || txType === 'P2P') {
      return; 
    }

    if (t.source === 'WALLET') walletTxnCount++;
    else bankTxnCount++;

    if (txType === 'Refund') {
      // Refunds are effectively negative expenses
      totalExpenses -= amt;
      return;
    }

    if (txType === 'Income') {
      totalIncome += amt;
      incomeCatMap[cat] = (incomeCatMap[cat] || 0) + amt;
    }

    if (txType === 'Expense' || txType === 'EMI/Loan' || txType === 'Investment') {
      totalExpenses += amt;
      categoryMap[cat] = (categoryMap[cat] || 0) + amt;

      if (!largestTransaction || amt > largestTransaction.amount) {
        largestTransaction = t;
      }

      const merchant = t.merchantName || t.description.slice(0, 30);
      if (!merchantMap[merchant]) merchantMap[merchant] = { amount: 0, count: 0 };
      merchantMap[merchant].amount += amt;
      merchantMap[merchant].count += 1;

      // Track discretionary vs fixed
      if (cat.includes('Food') || cat.includes('Shopping') || cat.includes('Entertainment')) {
        totalDiscretionary += amt;
      }
      if (txType === 'EMI/Loan' || cat.includes('EMI') || cat.includes('Loan')) {
        totalEmi += amt;
      }
      if (txType === 'Investment' || cat.includes('Investment') || cat.includes('SIP')) {
        totalInvestments += amt;
      }

      // Identify recurring subscription/fixed commitment patterns
      const lowerDesc = t.description.toLowerCase();
      const isRecurring =
        cat.includes('EMI') ||
        cat.includes('Rent') ||
        cat.includes('Insurance') ||
        cat.includes('Streaming') ||
        cat.includes('SIP') ||
        lowerDesc.includes('netflix') ||
        lowerDesc.includes('spotify') ||
        lowerDesc.includes('jio') ||
        lowerDesc.includes('airtel') ||
        lowerDesc.includes('broadband') ||
        lowerDesc.includes('direct debit');

      if (isRecurring) {
        const name = t.merchantName || t.description.slice(0, 35);
        if (!recurringItems.some(r => r.name.toLowerCase() === name.toLowerCase())) {
          recurringItems.push({
            name,
            amount: amt,
            category: cat,
            frequency: 'Monthly',
            confidence: 'High',
            lastDate: new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          });
        }
      }
    }
  });

  // Prevent negative totals from massive refunds
  if (totalExpenses < 0) totalExpenses = 0;

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpenses = Math.round(totalExpenses * 100) / 100;
  const netSavings = Math.round((totalIncome - totalExpenses) * 100) / 100;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 1000) / 10 : 0;
  const discretionarySpendRatio = totalExpenses > 0 ? Math.round((totalDiscretionary / totalExpenses) * 1000) / 10 : 0;
  const debtToIncomeRatio = totalIncome > 0 ? Math.round((totalEmi / totalIncome) * 1000) / 10 : 0;

  // Build top categories
  const topCategories = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const incomeCategories = Object.entries(incomeCatMap)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const allMerchants = Object.entries(merchantMap)
    .map(([name, data]) => ({
      name,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
    }));

  const topMerchants = [...allMerchants].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const mostFrequentMerchant = [...allMerchants].sort((a, b) => b.count - a.count)[0];

  // ── Smart Insights Generation with "WHY" Data-Driven Explanations ──────────────
  const insights: SmartInsight[] = [];

  if (transactions.length === 0) {
    insights.push({
      type: 'info',
      title: 'Upload Bank Statement',
      message: 'No transactions detected.',
      explanation: 'Upload your bank statement PDF to trigger real-time AI spending & cash flow analysis.',
    });
  } else {
    // 1. Savings Rate Insight
    if (savingsRate >= 20) {
      insights.push({
        type: 'success',
        title: 'Healthy Savings Rate',
        message: `You saved ${savingsRate}% of your total income this period.`,
        explanation: `Generated because your total income (₹${totalIncome.toLocaleString('en-IN')}) exceeded expenses (₹${totalExpenses.toLocaleString('en-IN')}) by ₹${netSavings.toLocaleString('en-IN')}, exceeding the recommended 20% benchmark.`,
        metric: `${savingsRate}%`,
      });
    } else if (savingsRate >= 0) {
      insights.push({
        type: 'warning',
        title: 'Sub-Optimal Savings Rate',
        message: `Your savings rate is ${savingsRate}%, which is below the 20% target.`,
        explanation: `Generated because total debits (₹${totalExpenses.toLocaleString('en-IN')}) consumed ${100 - savingsRate}% of your total credits (₹${totalIncome.toLocaleString('en-IN')}).`,
        metric: `${savingsRate}%`,
      });
    } else {
      insights.push({
        type: 'alert',
        title: 'Negative Net Cash Flow',
        message: `Expenses exceed income by ₹${Math.abs(netSavings).toLocaleString('en-IN')}.`,
        explanation: `Generated because total outflows (₹${totalExpenses.toLocaleString('en-IN')}) exceeded inflows (₹${totalIncome.toLocaleString('en-IN')}).`,
        metric: `-₹${Math.abs(netSavings).toLocaleString('en-IN')}`,
      });
    }

    // 2. Highest Spending Category Insight
    if (topCategories.length > 0) {
      const top = topCategories[0];
      if (top.percentage > 25) {
        insights.push({
          type: 'warning',
          title: `High Spending in ${top.category}`,
          message: `${top.category} accounts for ${top.percentage}% of your total expenses.`,
          explanation: `Generated because ₹${top.amount.toLocaleString('en-IN')} out of ₹${totalExpenses.toLocaleString('en-IN')} total expenses were spent on ${top.category}.`,
          metric: `₹${top.amount.toLocaleString('en-IN')}`,
        });
      }
    }

    // 3. Investment Discipline Insight
    if (totalInvestments > 0) {
      insights.push({
        type: 'success',
        title: 'Disciplined Investment Allocation',
        message: `You allocated ₹${totalInvestments.toLocaleString('en-IN')} to investments & SIPs.`,
        explanation: `Generated from detected investment transactions in Mutual Funds/SIPs totaling ₹${totalInvestments.toLocaleString('en-IN')}.`,
        metric: `₹${totalInvestments.toLocaleString('en-IN')}`,
      });
    } else {
      insights.push({
        type: 'info',
        title: 'No Investment Transactions Found',
        message: 'Consider creating an automated monthly SIP.',
        explanation: 'Generated because zero investment/SIP transactions were detected in the processed bank statement.',
      });
    }

    // 4. EMI Debt Burden Insight
    if (debtToIncomeRatio > 35) {
      insights.push({
        type: 'alert',
        title: 'High Debt Servicing Burden',
        message: `EMIs absorb ${debtToIncomeRatio}% of your total income.`,
        explanation: `Generated because monthly loan EMI payments (₹${totalEmi.toLocaleString('en-IN')}) consume over 35% of income (₹${totalIncome.toLocaleString('en-IN')}).`,
        metric: `${debtToIncomeRatio}%`,
      });
    }

    // 5. Largest Single Transaction
    const lt = largestTransaction as TransactionInput | null;
    if (lt) {
      insights.push({
        type: 'info',
        title: 'Largest Single Expense',
        message: `Your largest expense was ₹${lt.amount.toLocaleString('en-IN')} at ${lt.merchantName || 'Unknown Merchant'}.`,
        explanation: `Generated from the single largest debit recorded on ${new Date(lt.date).toLocaleDateString('en-IN')}, categorized under ${lt.category}.`,
        metric: `₹${lt.amount.toLocaleString('en-IN')}`,
      });
    }

    // 6. Excessive Discretionary Spending
    if (discretionarySpendRatio > 40) {
      insights.push({
        type: 'warning',
        title: 'High Discretionary Spending',
        message: `Non-essential spending accounts for ${discretionarySpendRatio}% of expenses.`,
        explanation: `Generated because spending on Food, Shopping, and Entertainment combined (₹${totalDiscretionary.toLocaleString('en-IN')}) is taking up over 40% of total expenses.`,
        metric: `${discretionarySpendRatio}%`,
      });
    }

    // 7. Frequent Merchant
    if (mostFrequentMerchant && mostFrequentMerchant.count >= 5) {
      insights.push({
        type: 'info',
        title: 'Most Frequented Merchant',
        message: `You transacted at ${mostFrequentMerchant.name} ${mostFrequentMerchant.count} times.`,
        explanation: `Generated because you had ${mostFrequentMerchant.count} separate transactions with ${mostFrequentMerchant.name}, totaling ₹${mostFrequentMerchant.amount.toLocaleString('en-IN')}.`,
        metric: `${mostFrequentMerchant.count} txns`,
      });
    }

    // 8. Bank vs Wallet Usage
    if (walletTxnCount > 0 && bankTxnCount > 0) {
      const walletRatio = Math.round((walletTxnCount / (walletTxnCount + bankTxnCount)) * 100);
      insights.push({
        type: 'success',
        title: 'Wallet Adoption',
        message: `${walletRatio}% of your transaction volume was processed via Wallet.`,
        explanation: `Generated because ${walletTxnCount} out of ${walletTxnCount + bankTxnCount} total transactions were sourced from uploaded Wallet statements rather than Bank statements.`,
        metric: `${walletRatio}%`,
      });
    }
  }

  // ── Predictive Forecast Model ──────────────────────────────────────────────
  const fixedCommitmentTotal = Math.round(
    recurringItems.reduce((sum, item) => sum + item.amount, 0) * 100
  ) / 100;

  // Calculate historical timespan
  let hasHistoricalData = false;
  let basisExplanation = '';
  
  if (sorted.length > 0) {
    const minDate = new Date(sorted[0].date).getTime();
    const maxDate = new Date(sorted[sorted.length - 1].date).getTime();
    const daysDiff = (maxDate - minDate) / (1000 * 3600 * 24);
    
    if (daysDiff >= 14) {
      hasHistoricalData = true;
      basisExplanation = `Forecast calculated directly from ${recurringItems.length} detected recurring payment patterns (EMIs, Subscriptions, Utilities, Rent) totaling ₹${fixedCommitmentTotal.toLocaleString('en-IN')} per month over a ${Math.round(daysDiff)}-day historical period.`;
    } else {
      basisExplanation = `Insufficient historical data to generate a reliable monthly forecast. The provided transactions only span ${Math.round(daysDiff)} days. A minimum of 14 days of history is required.`;
    }
  }

  const estimatedDiscretionary = hasHistoricalData 
    ? Math.round((totalExpenses > fixedCommitmentTotal ? totalExpenses - fixedCommitmentTotal : totalExpenses * 0.3) * 100) / 100
    : 0;

  const projectedBalance = hasHistoricalData
    ? Math.round((totalIncome - (fixedCommitmentTotal + estimatedDiscretionary)) * 100) / 100
    : 0;

  const forecast: ForecastModel = {
    expectedIncome: hasHistoricalData ? totalIncome : 0,
    expectedFixedCommitments: hasHistoricalData ? fixedCommitmentTotal : 0,
    estimatedDiscretionaryExpenses: estimatedDiscretionary,
    projectedMonthEndBalance: projectedBalance,
    recurringItems,
    basisExplanation,
    hasHistoricalData,
  };

  return {
    summary: {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      discretionarySpendRatio,
      debtToIncomeRatio,
      totalTransactions: sorted.length,
    },
    insights,
    forecast,
    topCategories,
    incomeCategories,
    topMerchants,
  };
}
