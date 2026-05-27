// This script should be run in the browser console on the /clients page
// It will perform 120 modal open/close cycles and measure performance

(async function stressTest() {
    console.log('%c🔥 MODAL STRESS TEST STARTING', 'font-size: 20px; font-weight: bold; color: #0f0;');
    console.log('Target: 120 cycles');
    console.log('');
    
    const timings = [];
    const performanceData = [];
    
    // Helper to find button by text
    function findButton(text) {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.trim() === text);
    }
    
    // Helper to wait for modal state
    function waitForModal(shouldBeOpen, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const check = () => {
                const modalTitle = document.querySelector('h3');
                const isOpen = modalTitle && modalTitle.textContent.includes('Add New Client');
                
                if (isOpen === shouldBeOpen) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for modal to be ${shouldBeOpen ? 'open' : 'closed'}`));
                } else {
                    requestAnimationFrame(check);
                }
            };
            check();
        });
    }
    
    // Baseline measurement
    const baseline = {
        timestamp: Date.now(),
        memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null,
        nodes: document.querySelectorAll('*').length
    };
    
    performanceData.push({ cycle: 0, ...baseline });
    console.log('📊 Baseline:', baseline);
    console.log('');
    
    const totalCycles = 120;
    const checkInterval = 20;
    
    for (let i = 1; i <= totalCycles; i++) {
        const cycleStart = performance.now();
        
        try {
            // Open modal
            const openStart = performance.now();
            const addButton = findButton('Add Client');
            if (!addButton) throw new Error('Add Client button not found');
            addButton.click();
            await waitForModal(true);
            const openDuration = performance.now() - openStart;
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Close modal (press Escape)
            const closeStart = performance.now();
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27 }));
            await waitForModal(false);
            const closeDuration = performance.now() - closeStart;
            
            const totalDuration = performance.now() - cycleStart;
            
            timings.push({
                cycle: i,
                openDuration,
                closeDuration,
                totalDuration
            });
            
            // Performance check every 20 cycles
            if (i % checkInterval === 0) {
                const perf = {
                    cycle: i,
                    timestamp: Date.now(),
                    memory: performance.memory ? {
                        usedJSHeapSize: performance.memory.usedJSHeapSize,
                        totalJSHeapSize: performance.memory.totalJSHeapSize,
                        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                    } : null,
                    nodes: document.querySelectorAll('*').length
                };
                performanceData.push(perf);
                
                const recent = timings.slice(-checkInterval);
                const avgOpen = recent.reduce((sum, t) => sum + t.openDuration, 0) / recent.length;
                const avgClose = recent.reduce((sum, t) => sum + t.closeDuration, 0) / recent.length;
                const avgTotal = recent.reduce((sum, t) => sum + t.totalDuration, 0) / recent.length;
                
                console.log(`✅ Cycle ${i}/${totalCycles}`);
                console.log(`   Avg: open ${avgOpen.toFixed(0)}ms, close ${avgClose.toFixed(0)}ms, total ${avgTotal.toFixed(0)}ms`);
                
                if (perf.memory) {
                    const heapMB = (perf.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
                    console.log(`   Heap: ${heapMB} MB`);
                }
                console.log(`   DOM nodes: ${perf.nodes}`);
                console.log('');
            }
            
        } catch (error) {
            console.error(`❌ Error on cycle ${i}:`, error.message);
            break;
        }
    }
    
    // Final measurement
    const final = {
        cycle: totalCycles,
        timestamp: Date.now(),
        memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null,
        nodes: document.querySelectorAll('*').length
    };
    performanceData.push(final);
    
    console.log('');
    console.log('%c✅ STRESS TEST COMPLETE!', 'font-size: 18px; font-weight: bold; color: #0f0;');
    console.log('');
    
    // Analysis
    console.log('%c📊 PERFORMANCE ANALYSIS', 'font-size: 16px; font-weight: bold;');
    console.log('='.repeat(60));
    
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
        console.log('%c   ⚠️  WARNING: Significant timing degradation detected!', 'color: #ff0;');
    } else {
        console.log('%c   ✅ Timing stable within acceptable range', 'color: #0f0;');
    }
    console.log('');
    
    // Memory analysis
    if (baseline.memory && final.memory) {
        const baselineHeap = baseline.memory.usedJSHeapSize / 1024 / 1024;
        const finalHeap = final.memory.usedJSHeapSize / 1024 / 1024;
        const heapGrowth = finalHeap - baselineHeap;
        const heapGrowthPct = (heapGrowth / baselineHeap * 100).toFixed(1);
        
        console.log('💾 MEMORY ANALYSIS:');
        console.log(`   Baseline: ${baselineHeap.toFixed(2)} MB`);
        console.log(`   Final:    ${finalHeap.toFixed(2)} MB`);
        console.log(`   Growth: ${heapGrowth > 0 ? '+' : ''}${heapGrowth.toFixed(2)} MB (${heapGrowthPct > 0 ? '+' : ''}${heapGrowthPct}%)`);
        
        if (heapGrowth > 10) {
            console.log('%c   ⚠️  WARNING: Significant memory growth detected!', 'color: #ff0;');
        } else if (heapGrowth > 5) {
            console.log('%c   ⚠️  CAUTION: Moderate memory growth detected', 'color: #ff0;');
        } else {
            console.log('%c   ✅ Memory growth within acceptable range', 'color: #0f0;');
        }
    }
    console.log('');
    
    // DOM analysis
    const nodeGrowth = final.nodes - baseline.nodes;
    const nodeGrowthPct = (nodeGrowth / baseline.nodes * 100).toFixed(1);
    
    console.log('🌳 DOM ANALYSIS:');
    console.log(`   Baseline nodes: ${baseline.nodes}`);
    console.log(`   Final nodes:    ${final.nodes}`);
    console.log(`   Growth: ${nodeGrowth > 0 ? '+' : ''}${nodeGrowth} nodes (${nodeGrowthPct > 0 ? '+' : ''}${nodeGrowthPct}%)`);
    
    if (nodeGrowth > 100) {
        console.log('%c   ⚠️  WARNING: DOM nodes not being cleaned up!', 'color: #ff0;');
    } else {
        console.log('%c   ✅ DOM cleanup working properly', 'color: #0f0;');
    }
    console.log('');
    
    console.log('='.repeat(60));
    console.log('');
    console.log('💾 Results saved to window.stressTestResults');
    
    // Save results to window for inspection
    window.stressTestResults = {
        timings,
        performanceData,
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
            memoryGrowth: baseline.memory ? {
                baselineHeapMB: baselineHeap,
                finalHeapMB: finalHeap,
                growthMB: heapGrowth,
                growthPct: parseFloat(heapGrowthPct)
            } : null,
            domGrowth: {
                baselineNodes: baseline.nodes,
                finalNodes: final.nodes,
                nodeGrowth,
                nodeGrowthPct: parseFloat(nodeGrowthPct)
            }
        }
    };
    
    console.log('To download results as JSON:');
    console.log('copy(JSON.stringify(window.stressTestResults, null, 2))');
    
})();
