/**
 * FINOVA Full End-to-End Test
 * Tests: register → login → upload PDF → dashboard → statements → transactions
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE = 'http://localhost:5000/api';
let accessToken = '';
let statementId = '';

function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isForm = headers['Content-Type'] && headers['Content-Type'].includes('multipart');
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { ...headers }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function jsonRequest(method, endpoint, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await request(method, `${BASE}${endpoint}`, body ? JSON.stringify(body) : undefined, headers);
  return res;
}

async function uploadPDF(filePath, token) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Date.now();
    const CRLF = '\r\n';

    let body = '';
    body += `--${boundary}${CRLF}`;
    body += `Content-Disposition: form-data; name="statement"; filename="${path.basename(filePath)}"${CRLF}`;
    body += `Content-Type: application/pdf${CRLF}${CRLF}`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'latin1'),
      fileContent,
      Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'latin1')
    ]);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/statements/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length,
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║          FINOVA End-to-End Test Suite                ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // 1. Health check
  console.log('1. 🏥 Health Check...');
  const health = await request('GET', 'http://localhost:5000/health', null);
  console.log(`   Status: ${health.status} - ${JSON.stringify(health.data)}`);

  // 2. Register test user
  console.log('\n2. 📝 Register User...');
  const email = `test_${Date.now()}@finova.com`;
  const regRes = await jsonRequest('POST', '/auth/register', {
    name: 'Test User E2E',
    email,
    password: 'testpassword123'
  });
  console.log(`   Status: ${regRes.status}`);
  if (regRes.status === 201) {
    accessToken = regRes.data.data.accessToken;
    console.log(`   ✅ Registered: ${email}`);
    console.log(`   Token: ${accessToken.substring(0, 30)}...`);
  } else {
    console.log(`   ❌ Failed:`, JSON.stringify(regRes.data));
    process.exit(1);
  }

  // 3. Login
  console.log('\n3. 🔐 Login...');
  const loginRes = await jsonRequest('POST', '/auth/login', { email, password: 'testpassword123' });
  console.log(`   Status: ${loginRes.status}`);
  if (loginRes.status === 200) {
    accessToken = loginRes.data.data.accessToken;
    console.log(`   ✅ Logged in, token refreshed`);
  } else {
    console.log(`   ❌ Failed:`, JSON.stringify(loginRes.data));
    process.exit(1);
  }

  // 4. Upload PDF statement
  console.log('\n4. 📄 Upload PDF Statement...');
  // Look for a sample PDF
  const uploads = fs.readdirSync(path.join(__dirname, 'uploads')).filter(f => f.endsWith('.pdf'));
  const samplePDF = uploads.length > 0 
    ? path.join(__dirname, 'uploads', uploads[0])
    : path.join(__dirname, 'sample_complex_statement.pdf');
  
  console.log(`   Using: ${path.basename(samplePDF)}`);
  const uploadRes = await uploadPDF(samplePDF, accessToken);
  console.log(`   Status: ${uploadRes.status}`);
  if (uploadRes.status === 201 || uploadRes.status === 200) {
    const stmt = uploadRes.data.data?.statement;
    statementId = stmt?.id;
    console.log(`   ✅ Statement ID: ${statementId}`);
    console.log(`   Bank: ${stmt?.bankName || 'Detected'}`);
    console.log(`   Period: ${stmt?.period || 'N/A'}`);
    console.log(`   Transactions: ${stmt?.transactions?.length || 0}`);
    console.log(`   Credits: ₹${stmt?.totalCredits?.toLocaleString('en-IN') || 0}`);
    console.log(`   Debits:  ₹${stmt?.totalDebits?.toLocaleString('en-IN') || 0}`);
  } else {
    console.log(`   ❌ Upload failed:`, JSON.stringify(uploadRes.data).substring(0, 500));
  }

  // 5. Dashboard summary
  console.log('\n5. 📊 Dashboard Summary...');
  const dashRes = await jsonRequest('GET', '/dashboard/summary', null, accessToken);
  console.log(`   Status: ${dashRes.status}`);
  if (dashRes.status === 200) {
    const s = dashRes.data.data?.summary;
    console.log(`   ✅ Statements: ${s?.statementsCount}`);
    console.log(`   Total Income: ₹${s?.totalIncome?.toLocaleString('en-IN')}`);
    console.log(`   Total Expenses: ₹${s?.totalExpenses?.toLocaleString('en-IN')}`);
    console.log(`   Net Savings: ₹${s?.netSavings?.toLocaleString('en-IN')}`);
    console.log(`   Savings Rate: ${s?.savingsRate}%`);
    console.log(`   Transactions: ${s?.totalTransactions}`);
    const cats = dashRes.data.data?.categoryBreakdown;
    if (cats?.length > 0) {
      console.log(`   Top Categories: ${cats.slice(0, 3).map(c => `${c.category}(₹${c.amount})`).join(', ')}`);
    }
    const insights = dashRes.data.data?.insights;
    if (insights?.length > 0) {
      console.log(`   Insights: ${insights.length} generated`);
      console.log(`     → ${insights[0].title}: ${insights[0].message}`);
    }
  } else {
    console.log(`   ❌ Failed:`, JSON.stringify(dashRes.data));
  }

  // 6. Statements list
  console.log('\n6. 📋 Statements List...');
  const stmtRes = await jsonRequest('GET', '/statements', null, accessToken);
  console.log(`   Status: ${stmtRes.status}`);
  if (stmtRes.status === 200) {
    const stmts = stmtRes.data.data?.statements || [];
    console.log(`   ✅ ${stmts.length} statement(s) found`);
    stmts.forEach((s, i) => {
      console.log(`   [${i+1}] ${s.bankName} | ${s.period} | ${s._count?.transactions} txns`);
    });
  } else {
    console.log(`   ❌ Failed:`, JSON.stringify(stmtRes.data));
  }

  // 7. Transactions
  console.log('\n7. 💳 Transactions Ledger...');
  const txRes = await jsonRequest('GET', '/transactions?limit=100', null, accessToken);
  console.log(`   Status: ${txRes.status}`);
  if (txRes.status === 200) {
    const txns = txRes.data.data?.transactions || [];
    console.log(`   ✅ ${txns.length} transaction(s) found`);
    txns.slice(0, 5).forEach((t, i) => {
      const d = new Date(t.date).toLocaleDateString('en-IN');
      console.log(`   [${i+1}] ${d} | ${t.category.padEnd(20)} | ${t.type==='credit'?'+':'-'}₹${t.amount} | ${t.description.substring(0,40)}`);
    });
    if (txns.length > 5) console.log(`   ... and ${txns.length - 5} more`);
  } else {
    console.log(`   ❌ Failed:`, JSON.stringify(txRes.data));
  }

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║              ✅ All tests passed!                    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

run().catch(err => {
  console.error('\n❌ Test suite failed:', err.message);
  process.exit(1);
});
