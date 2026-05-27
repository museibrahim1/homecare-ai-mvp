/**
 * Modal Stress Test Script
 * Tests for memory leaks and performance degradation
 * by cycling the Add Client modal 120 times
 */

const puppeteer = require('puppeteer');

const TEST_CONFIG = {
  url: 'http://localhost:3000',
  email: 'demo@agency.com',
  password: 'demo1234',
  totalCycles: 120,
  checkInterval: 20,
  profileStart: 40,
  profileEnd: 80
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function measurePerformance(page) {
  const metrics = await page.metrics();
  const jsHeapSize = await page.evaluate(() => {
    if (performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  });
  
  return {
    timestamp: Date.now(),
    jsHeapSize,
    metrics: {
      Timestamp: metrics.Timestamp,
      Documents: metrics.Documents,
      Frames: metrics.Frames,
      JSEventListeners: metrics.JSEventListeners,
      Nodes: metrics.Nodes,
      LayoutCount: metrics.LayoutCount,
      RecalcStyleCount: metrics.RecalcStyleCount,
      JSHeapUsedSize: metrics.JSHeapUsedSize,
      JSHeapTotalSize: metrics.JSHeapTotalSize
    }
  };
}

async function runStressTest() {
  console.log('🚀 Starting Modal Stress Test...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const performanceData = [];
  const timings = [];
  
  try {
    // Login
    console.log('📝 Logging in...');
    await page.goto(`${TEST_CONFIG.url}/login`, { waitUntil: 'networkidle0' });
    await page.type('input[placeholder="you@company.com"]', TEST_CONFIG.email);
    await page.type('input[type="password"]', TEST_CONFIG.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Navigate to clients
    console.log('🔍 Navigating to /clients...');
    await page.goto(`${TEST_CONFIG.url}/clients`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    
    // Baseline measurement
    console.log('📊 Taking baseline measurement...\n');
    const baseline = await measurePerformance(page);
    performanceData.push({ cycle: 0, ...baseline });
    
    console.log('🔄 Starting modal cycles...\n');
    
    // Start profiling at cycle 40
    let profilingActive = false;
    
    for (let i = 1; i <= TEST_CONFIG.totalCycles; i++) {
      const cycleStart = Date.now();
      
      // Start CPU profiling
      if (i === TEST_CONFIG.profileStart) {
        console.log(`\n🔬 Starting CPU profiling at cycle ${i}...\n`);
        await page.tracing.start({
          path: '/Users/musaibrahim/Desktop/AI Voice Contracter/trace.json',
          screenshots: false
        });
        profilingActive = true;
      }
      
      // Open modal
      const openStart = Date.now();
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addClientBtn = buttons.find(btn => btn.textContent.trim() === 'Add Client');
        if (addClientBtn) addClientBtn.click();
      });
      await page.waitForSelector('h3:has-text("Add New Client")', { timeout: 5000 }).catch(() => 
        page.waitForFunction(() => document.querySelector('h3')?.textContent?.includes('Add New Client'))
      );
      const openDuration = Date.now() - openStart;
      
      // Small delay to let modal fully render
      await sleep(50);
      
      // Close modal (click X button or press Escape)
      const closeStart = Date.now();
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('h3')?.textContent?.includes('Add New Client'), { timeout: 5000 });
      const closeDuration = Date.now() - closeStart;
      
      const cycleEnd = Date.now();
      const totalDuration = cycleEnd - cycleStart;
      
      timings.push({
        cycle: i,
        openDuration,
        closeDuration,
        totalDuration
      });
      
      // Stop CPU profiling
      if (i === TEST_CONFIG.profileEnd && profilingActive) {
        console.log(`\n🔬 Stopping CPU profiling at cycle ${i}...\n`);
        await page.tracing.stop();
        profilingActive = false;
      }
      
      // Performance check every 20 cycles
      if (i % TEST_CONFIG.checkInterval === 0) {
        const perf = await measurePerformance(page);
        performanceData.push({ cycle: i, ...perf });
        
        const recentTimings = timings.slice(-TEST_CONFIG.checkInterval);
        const avgOpen = recentTimings.reduce((sum, t) => sum + t.openDuration, 0) / recentTimings.length;
        const avgClose = recentTimings.reduce((sum, t) => sum + t.closeDuration, 0) / recentTimings.length;
        const avgTotal = recentTimings.reduce((sum, t) => sum + t.totalDuration, 0) / recentTimings.length;
        
        console.log(`✅ Cycle ${i}/${TEST_CONFIG.totalCycles}`);
        console.log(`   Avg open: ${avgOpen.toFixed(0)}ms | Avg close: ${avgClose.toFixed(0)}ms | Avg total: ${avgTotal.toFixed(0)}ms`);
        
        if (perf.jsHeapSize) {
          const heapUsedMB = (perf.jsHeapSize.usedJSHeapSize / 1024 / 1024).toFixed(2);
          const heapTotalMB = (perf.jsHeapSize.totalJSHeapSize / 1024 / 1024).toFixed(2);
          console.log(`   JS Heap: ${heapUsedMB} MB / ${heapTotalMB} MB`);
        }
        
        console.log(`   DOM Nodes: ${perf.metrics.Nodes} | Event Listeners: ${perf.metrics.JSEventListeners}`);
        console.log('');
      }
    }
    
    console.log('\n✅ All cycles complete!\n');
    
    // Final measurement
    console.log('📊 Taking final measurement...');
    const final = await measurePerformance(page);
    performanceData.push({ cycle: TEST_CONFIG.totalCycles, ...final });
    
    // Navigate to other pages for memory check
    console.log('\n🔍 Testing navigation for memory retention...');
    await page.goto(`${TEST_CONFIG.url}/pipeline`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.goto(`${TEST_CONFIG.url}/leads`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    await page.goto(`${TEST_CONFIG.url}/clients`, { waitUntil: 'networkidle0' });
    await sleep(1000);
    
    const afterNav = await measurePerformance(page);
    performanceData.push({ cycle: 'after-navigation', ...afterNav });
    
    // Analysis
    console.log('\n' + '='.repeat(60));
    console.log('📈 PERFORMANCE ANALYSIS');
    console.log('='.repeat(60) + '\n');
    
    // Timing analysis
    const firstBatch = timings.slice(0, 20);
    const lastBatch = timings.slice(-20);
    
    const firstAvgOpen = firstBatch.reduce((sum, t) => sum + t.openDuration, 0) / firstBatch.length;
    const lastAvgOpen = lastBatch.reduce((sum, t) => sum + t.openDuration, 0) / lastBatch.length;
    const openDelta = lastAvgOpen - firstAvgOpen;
    const openDeltaPct = (openDelta / firstAvgOpen * 100).toFixed(1);
    
    const firstAvgClose = firstBatch.reduce((sum, t) => sum + t.closeDuration, 0) / firstBatch.length;
    const lastAvgClose = lastBatch.reduce((sum, t) => sum + t.closeDuration, 0) / lastBatch.length;
    const closeDelta = lastAvgClose - firstAvgClose;
    const closeDeltaPct = (closeDelta / firstAvgClose * 100).toFixed(1);
    
    console.log('⏱️  TIMING DEGRADATION:');
    console.log(`   First 20 cycles - Open: ${firstAvgOpen.toFixed(0)}ms, Close: ${firstAvgClose.toFixed(0)}ms`);
    console.log(`   Last 20 cycles  - Open: ${lastAvgOpen.toFixed(0)}ms, Close: ${lastAvgClose.toFixed(0)}ms`);
    console.log(`   Delta: Open ${openDelta > 0 ? '+' : ''}${openDelta.toFixed(0)}ms (${openDeltaPct > 0 ? '+' : ''}${openDeltaPct}%), Close ${closeDelta > 0 ? '+' : ''}${closeDelta.toFixed(0)}ms (${closeDeltaPct > 0 ? '+' : ''}${closeDeltaPct}%)`);
    
    if (Math.abs(openDelta) > 50 || Math.abs(closeDelta) > 50) {
      console.log('   ⚠️  WARNING: Significant timing degradation detected!');
    } else {
      console.log('   ✅ Timing stable within acceptable range');
    }
    
    console.log('');
    
    // Memory analysis
    if (baseline.jsHeapSize && final.jsHeapSize) {
      const baselineHeap = baseline.jsHeapSize.usedJSHeapSize / 1024 / 1024;
      const finalHeap = final.jsHeapSize.usedJSHeapSize / 1024 / 1024;
      const afterNavHeap = afterNav.jsHeapSize.usedJSHeapSize / 1024 / 1024;
      
      const heapGrowth = finalHeap - baselineHeap;
      const heapGrowthPct = (heapGrowth / baselineHeap * 100).toFixed(1);
      
      console.log('💾 MEMORY ANALYSIS:');
      console.log(`   Baseline:        ${baselineHeap.toFixed(2)} MB`);
      console.log(`   After 120 cycles: ${finalHeap.toFixed(2)} MB`);
      console.log(`   After navigation: ${afterNavHeap.toFixed(2)} MB`);
      console.log(`   Growth: ${heapGrowth > 0 ? '+' : ''}${heapGrowth.toFixed(2)} MB (${heapGrowthPct > 0 ? '+' : ''}${heapGrowthPct}%)`);
      
      if (heapGrowth > 10) {
        console.log('   ⚠️  WARNING: Significant memory growth detected!');
      } else if (heapGrowth > 5) {
        console.log('   ⚠️  CAUTION: Moderate memory growth detected');
      } else {
        console.log('   ✅ Memory growth within acceptable range');
      }
      
      const navRetention = afterNavHeap - baselineHeap;
      if (navRetention > 5) {
        console.log(`   ⚠️  Memory not fully released after navigation (+${navRetention.toFixed(2)} MB retained)`);
      }
    }
    
    console.log('');
    
    // DOM analysis
    const baselineNodes = baseline.metrics.Nodes;
    const finalNodes = final.metrics.Nodes;
    const nodeGrowth = finalNodes - baselineNodes;
    const nodeGrowthPct = (nodeGrowth / baselineNodes * 100).toFixed(1);
    
    console.log('🌳 DOM ANALYSIS:');
    console.log(`   Baseline nodes: ${baselineNodes}`);
    console.log(`   Final nodes:    ${finalNodes}`);
    console.log(`   Growth: ${nodeGrowth > 0 ? '+' : ''}${nodeGrowth} nodes (${nodeGrowthPct > 0 ? '+' : ''}${nodeGrowthPct}%)`);
    
    if (nodeGrowth > 100) {
      console.log('   ⚠️  WARNING: DOM nodes not being cleaned up!');
    } else {
      console.log('   ✅ DOM cleanup working properly');
    }
    
    console.log('');
    
    // Event listener analysis
    const baselineListeners = baseline.metrics.JSEventListeners;
    const finalListeners = final.metrics.JSEventListeners;
    const listenerGrowth = finalListeners - baselineListeners;
    const listenerGrowthPct = (listenerGrowth / baselineListeners * 100).toFixed(1);
    
    console.log('🎧 EVENT LISTENER ANALYSIS:');
    console.log(`   Baseline listeners: ${baselineListeners}`);
    console.log(`   Final listeners:    ${finalListeners}`);
    console.log(`   Growth: ${listenerGrowth > 0 ? '+' : ''}${listenerGrowth} listeners (${listenerGrowthPct > 0 ? '+' : ''}${listenerGrowthPct}%)`);
    
    if (listenerGrowth > 50) {
      console.log('   ⚠️  WARNING: Event listeners leaking!');
    } else {
      console.log('   ✅ Event listeners properly cleaned up');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📄 Trace file saved to: trace.json');
    console.log('   Analyze with: chrome://tracing');
    console.log('='.repeat(60) + '\n');
    
    // Save detailed results
    const fs = require('fs');
    fs.writeFileSync(
      '/Users/musaibrahim/Desktop/AI Voice Contracter/stress-test-results.json',
      JSON.stringify({
        config: TEST_CONFIG,
        performanceData,
        timings,
        summary: {
          timingDegradation: {
            firstBatchAvgOpen: firstAvgOpen,
            lastBatchAvgOpen: lastAvgOpen,
            openDelta,
            openDeltaPct: parseFloat(openDeltaPct),
            firstBatchAvgClose: firstAvgClose,
            lastBatchAvgClose: lastAvgClose,
            closeDelta,
            closeDeltaPct: parseFloat(closeDeltaPct)
          },
          memoryGrowth: baseline.jsHeapSize ? {
            baselineHeapMB: baselineHeap,
            finalHeapMB: finalHeap,
            growthMB: heapGrowth,
            growthPct: parseFloat(heapGrowthPct)
          } : null,
          domGrowth: {
            baselineNodes,
            finalNodes,
            nodeGrowth,
            nodeGrowthPct: parseFloat(nodeGrowthPct)
          },
          listenerGrowth: {
            baselineListeners,
            finalListeners,
            listenerGrowth,
            listenerGrowthPct: parseFloat(listenerGrowthPct)
          }
        }
      }, null, 2)
    );
    
    console.log('💾 Detailed results saved to: stress-test-results.json\n');
    
  } catch (error) {
    console.error('❌ Error during stress test:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

runStressTest().catch(console.error);
