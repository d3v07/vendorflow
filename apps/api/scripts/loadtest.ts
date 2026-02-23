/**
 * VendorFlow Load Test Script
 * Measures API performance with/without Redis cache
 *
 * Usage: pnpm loadtest
 */

const API_URL = process.env.API_URL || 'http://localhost:4000';
const CONCURRENT_REQUESTS = 50;
const TOTAL_REQUESTS = 200;

interface TestResult {
  endpoint: string;
  totalRequests: number;
  successCount: number;
  failCount: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  minLatency: number;
  maxLatency: number;
}

async function makeRequest(url: string, token: string): Promise<number> {
  const start = Date.now();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const latency = Date.now() - start;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return latency;
}

async function runConcurrentRequests(
  url: string,
  token: string,
  count: number,
  concurrency: number
): Promise<number[]> {
  const latencies: number[] = [];
  const batches = Math.ceil(count / concurrency);

  for (let i = 0; i < batches; i++) {
    const batchSize = Math.min(concurrency, count - i * concurrency);
    const promises = Array(batchSize)
      .fill(null)
      .map(() => makeRequest(url, token).catch(() => -1));

    const results = await Promise.all(promises);
    latencies.push(...results);
  }

  return latencies;
}

function calculateStats(latencies: number[]): Omit<TestResult, 'endpoint' | 'totalRequests'> {
  const successful = latencies.filter((l) => l > 0).sort((a, b) => a - b);
  const failed = latencies.filter((l) => l <= 0).length;

  if (successful.length === 0) {
    return {
      successCount: 0,
      failCount: failed,
      avgLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      minLatency: 0,
      maxLatency: 0,
    };
  }

  const sum = successful.reduce((a, b) => a + b, 0);
  const p95Index = Math.floor(successful.length * 0.95);
  const p99Index = Math.floor(successful.length * 0.99);

  return {
    successCount: successful.length,
    failCount: failed,
    avgLatency: Math.round(sum / successful.length),
    p95Latency: successful[p95Index] || successful[successful.length - 1],
    p99Latency: successful[p99Index] || successful[successful.length - 1],
    minLatency: successful[0],
    maxLatency: successful[successful.length - 1],
  };
}

async function login(): Promise<string> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@demo.com',
      password: 'DemoPass123!',
    }),
  });

  if (!response.ok) {
    throw new Error('Login failed. Make sure the API is running and seeded.');
  }

  const data = (await response.json()) as { data: { tokens: { accessToken: string } } };
  return data.data.tokens.accessToken;
}

async function runTest(endpoint: string, token: string): Promise<TestResult> {
  console.log(`\nTesting: ${endpoint}`);
  console.log(`  Requests: ${TOTAL_REQUESTS} (${CONCURRENT_REQUESTS} concurrent)`);

  const url = `${API_URL}${endpoint}`;
  const latencies = await runConcurrentRequests(url, token, TOTAL_REQUESTS, CONCURRENT_REQUESTS);
  const stats = calculateStats(latencies);

  return {
    endpoint,
    totalRequests: TOTAL_REQUESTS,
    ...stats,
  };
}

function printResults(results: TestResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('LOAD TEST RESULTS');
  console.log('='.repeat(80));

  for (const r of results) {
    console.log(`\n${r.endpoint}`);
    console.log(`  Success: ${r.successCount}/${r.totalRequests} (${r.failCount} failed)`);
    console.log(`  Avg: ${r.avgLatency}ms | P95: ${r.p95Latency}ms | P99: ${r.p99Latency}ms`);
    console.log(`  Min: ${r.minLatency}ms | Max: ${r.maxLatency}ms`);
  }

  console.log('\n' + '='.repeat(80));
}

async function main(): Promise<void> {
  console.log('VendorFlow Load Test');
  console.log(`API URL: ${API_URL}`);
  console.log('');

  try {
    console.log('Authenticating...');
    const token = await login();
    console.log('Authenticated successfully.');

    const endpoints = [
      '/api/dashboard/stats',
      '/api/dashboard/spend-by-category',
      '/api/vendors',
      '/api/contracts',
      '/api/invoices',
    ];

    const results: TestResult[] = [];
    for (const endpoint of endpoints) {
      const result = await runTest(endpoint, token);
      results.push(result);
    }

    printResults(results);

    // Summary
    const avgP95 = Math.round(
      results.reduce((sum, r) => sum + r.p95Latency, 0) / results.length
    );
    console.log(`\nOverall P95 Latency: ${avgP95}ms`);
    console.log('Note: Run with Redis cache enabled to see improved latency.');
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

main();
