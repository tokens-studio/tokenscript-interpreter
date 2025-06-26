import { benchmarkTokenResolution, BenchmarkResult } from './benchmark';

interface BrowserBenchmarkOptions {
  container: HTMLElement;
  dataset: Record<string, any>;
  iterations?: number;
  warmupIterations?: number;
  name?: string;
  onComplete?: (result: BenchmarkResult) => void;
}

/**
 * Run a benchmark in the browser with UI feedback
 */
export function runBrowserBenchmark(options: BrowserBenchmarkOptions): void {
  const {
    container,
    dataset,
    iterations = 5,
    warmupIterations = 1,
    name = 'Browser Token Resolution',
    onComplete
  } = options;

  const tokenCount = Object.keys(dataset).length;
  
  // Create UI elements
  container.innerHTML = `
    <div class="benchmark-ui">
      <h2>${name}</h2>
      <div class="benchmark-info">
        <p>Dataset size: <strong>${tokenCount}</strong> tokens</p>
        <p>Iterations: <strong>${iterations}</strong></p>
        <p>Warmup: <strong>${warmupIterations}</strong></p>
      </div>
      <div class="benchmark-status">
        <p id="status-message">Ready to start</p>
        <div class="progress-container">
          <div id="progress-bar" class="progress-bar"></div>
        </div>
      </div>
      <div class="benchmark-controls">
        <button id="start-button" class="benchmark-button">Start Benchmark</button>
      </div>
      <div id="benchmark-results" class="benchmark-results" style="display: none;">
        <h3>Results</h3>
        <table>
          <tr>
            <td>Average time:</td>
            <td id="result-avg">-</td>
          </tr>
          <tr>
            <td>Min time:</td>
            <td id="result-min">-</td>
          </tr>
          <tr>
            <td>Max time:</td>
            <td id="result-max">-</td>
          </tr>
          <tr>
            <td>Throughput:</td>
            <td id="result-throughput">-</td>
          </tr>
        </table>
        <div class="benchmark-actions">
          <button id="download-results" class="benchmark-button secondary">Download Results</button>
        </div>
      </div>
    </div>
  `;

  // Add some basic styles
  const style = document.createElement('style');
  style.textContent = `
    .benchmark-ui {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .benchmark-info {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .benchmark-status {
      margin: 20px 0;
    }
    .progress-container {
      height: 20px;
      background-color: #eee;
      border-radius: 10px;
      margin: 10px 0;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      width: 0%;
      background-color: #4CAF50;
      transition: width 0.3s;
    }
    .benchmark-button {
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    .benchmark-button:hover {
      background-color: #45a049;
    }
    .benchmark-button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .benchmark-button.secondary {
      background-color: #2196F3;
    }
    .benchmark-button.secondary:hover {
      background-color: #0b7dda;
    }
    .benchmark-results {
      margin-top: 20px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 4px;
    }
    .benchmark-actions {
      margin-top: 15px;
      text-align: center;
    }
    .benchmark-results table {
      width: 100%;
    }
    .benchmark-results td {
      padding: 8px;
    }
    .benchmark-results td:first-child {
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);

  // Get UI elements
  const startButton = container.querySelector('#start-button') as HTMLButtonElement;
  const statusMessage = container.querySelector('#status-message') as HTMLParagraphElement;
  const progressBar = container.querySelector('#progress-bar') as HTMLDivElement;
  const resultsContainer = container.querySelector('#benchmark-results') as HTMLDivElement;
  const resultAvg = container.querySelector('#result-avg') as HTMLElement;
  const resultMin = container.querySelector('#result-min') as HTMLElement;
  const resultMax = container.querySelector('#result-max') as HTMLElement;
  const resultThroughput = container.querySelector('#result-throughput') as HTMLElement;

  // Start benchmark when button is clicked
  startButton.addEventListener('click', async () => {
    startButton.disabled = true;
    statusMessage.textContent = 'Warming up...';
    progressBar.style.width = '0%';
    resultsContainer.style.display = 'none';

    // Small delay to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Run benchmark with progress updates
      const result = await runWithProgress();
      
      // Display results
      resultAvg.textContent = `${result.averageTime.toFixed(2)}ms`;
      resultMin.textContent = `${result.minTime.toFixed(2)}ms`;
      resultMax.textContent = `${result.maxTime.toFixed(2)}ms`;
      resultThroughput.textContent = `${result.tokensPerSecond.toLocaleString()} tokens/second`;
      
      resultsContainer.style.display = 'block';
      statusMessage.textContent = 'Benchmark complete!';
      
      // Add download functionality
      const downloadButton = container.querySelector('#download-results') as HTMLButtonElement;
      downloadButton.addEventListener('click', () => {
        downloadResults(result);
      });
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (error) {
      statusMessage.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
      console.error('Benchmark error:', error);
    } finally {
      startButton.disabled = false;
    }
  });

  // Run benchmark with progress updates
  async function runWithProgress(): Promise<BenchmarkResult> {
    // Warmup phase
    statusMessage.textContent = 'Warming up...';
    progressBar.style.width = '10%';
    
    for (let i = 0; i < warmupIterations; i++) {
      await new Promise(resolve => {
        setTimeout(() => {
          benchmarkTokenResolution(dataset, { iterations: 1, verbose: false });
          resolve(null);
        }, 0);
      });
      
      const warmupProgress = 10 + (i + 1) / warmupIterations * 20;
      progressBar.style.width = `${warmupProgress}%`;
    }

    // Benchmark phase
    statusMessage.textContent = 'Running benchmark...';
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      await new Promise<void>(resolve => {
        setTimeout(() => {
          const start = performance.now();
          benchmarkTokenResolution(dataset, { iterations: 1, verbose: false });
          const end = performance.now();
          times.push(end - start);
          resolve();
        }, 0);
      });
      
      const benchProgress = 30 + (i + 1) / iterations * 70;
      progressBar.style.width = `${benchProgress}%`;
      statusMessage.textContent = `Running benchmark... (${i + 1}/${iterations})`;
      
      // Small delay to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Calculate results
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const tokensPerSecond = Math.round((tokenCount * iterations) / (totalTime / 1000));

    return {
      name,
      averageTime,
      minTime,
      maxTime,
      totalTime,
      iterations,
      tokensPerSecond,
      tokenCount
    };
  }
}

/**
 * Helper function to download benchmark results as JSON
 */
function downloadResults(result: BenchmarkResult): void {
  // Create a blob with the JSON data
  const data = JSON.stringify(result, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `benchmark-${result.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Create a simple benchmark UI for the browser
 */
export function createBenchmarkUI(containerId: string = 'benchmark-container'): HTMLElement {
  let container = document.getElementById(containerId);
  
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }
  
  return container;
}
