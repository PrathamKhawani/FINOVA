import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateFinancialReportPDF = (data: any, filters: any) => {
  const doc = new jsPDF();
  
  const { summary, topCategories, incomeCategories, topMerchants, recurringPayments } = data;
  
  // -- Setup
  const pageWidth = doc.internal.pageSize.width;
  let cursorY = 20;
  
  // -- Helper functions
  const addText = (text: string, x: number, y: number, fontSize: number, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(text, x, y, { align });
  };

  const formatCurrency = (val: number) => {
    return 'Rs. ' + (val || 0).toLocaleString('en-IN');
  };

  // -- Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  addText('FINOVA FINANCIAL REPORT', 14, 25, 22, true);
  
  // Report Period
  let periodText = 'All Time';
  if (filters.month) {
    periodText = new Date(filters.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } else if (filters.startDate && filters.endDate) {
    periodText = `${filters.startDate} to ${filters.endDate}`;
  }
  
  addText(`Period: ${periodText}`, pageWidth - 14, 25, 12, false, 'right');
  
  // Reset text color for body
  doc.setTextColor(30, 41, 59); // slate-800
  cursorY = 55;
  
  // -- Executive Summary
  addText('EXECUTIVE SUMMARY', 14, cursorY, 14, true);
  cursorY += 10;
  
  const metrics = [
    { label: 'Total Income:', value: formatCurrency(summary?.totalIncome) },
    { label: 'Total Expenses:', value: formatCurrency(summary?.totalExpenses) },
    { label: 'Net Cash Flow:', value: formatCurrency(summary?.netSavings) },
    { label: 'Savings Rate:', value: `${summary?.savingsRate || 0}%` },
    { label: 'Total Transactions:', value: `${summary?.totalTransactions || 0}` }
  ];
  
  metrics.forEach((m, idx) => {
    const x = idx % 2 === 0 ? 14 : pageWidth / 2 + 10;
    const y = cursorY + (Math.floor(idx / 2) * 10);
    addText(m.label, x, y, 10, true);
    addText(m.value, x + 40, y, 10, false);
  });
  
  cursorY += 35;
  
  // -- Top Categories Table
  if (topCategories && topCategories.length > 0) {
    addText('EXPENSE BREAKDOWN', 14, cursorY, 14, true);
    cursorY += 8;
    
    const tableData = topCategories.map((c: any) => [
      c.category, 
      formatCurrency(c.amount), 
      `${c.percentage}%`
    ]);
    
    autoTable(doc, {
      startY: cursorY,
      head: [['Category', 'Amount', '% of Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 14, right: 14 }
    });
    
    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }
  
  // Check page break
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }
  
  // -- Top Merchants
  if (topMerchants && topMerchants.length > 0) {
    addText('TOP MERCHANTS', 14, cursorY, 14, true);
    cursorY += 8;
    
    const merchantData = topMerchants.map((m: any) => [
      m.name,
      m.count.toString(),
      formatCurrency(m.amount)
    ]);
    
    autoTable(doc, {
      startY: cursorY,
      head: [['Merchant', 'Transactions', 'Total Amount']],
      body: merchantData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 14, right: 14 }
    });
    
    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }

  // Check page break
  if (cursorY > 230) {
    doc.addPage();
    cursorY = 20;
  }
  
  // -- Recurring Payments
  if (recurringPayments && recurringPayments.length > 0) {
    addText('RECURRING PAYMENTS DETECTED', 14, cursorY, 14, true);
    cursorY += 8;
    
    const recurringData = recurringPayments.map((r: any) => [
      r.name,
      r.category,
      formatCurrency(r.avgAmount),
      r.lastDate
    ]);
    
    autoTable(doc, {
      startY: cursorY,
      head: [['Name', 'Category', 'Avg Amount', 'Last Paid']],
      body: recurringData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 10, cellPadding: 3 },
      margin: { left: 14, right: 14 }
    });
  }
  
  // -- Footer (Page Numbers & Date)
  const pageCount = (doc as any).internal.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString('en-IN');
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${dateStr} - Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  // Save the PDF
  doc.save(`FINOVA_Financial_Report_${periodText.replace(/ /g, '_')}.pdf`);
};
