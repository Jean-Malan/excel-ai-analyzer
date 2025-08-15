/**
 * Progress Tracking Service
 * Manages analysis progress and provides real-time updates
 */

export class ProgressTracker {
  constructor(onProgressUpdate) {
    this.onProgressUpdate = onProgressUpdate || (() => {});
    this.currentStep = 0;
    this.totalSteps = 0;
    this.currentMessage = '';
    this.isActive = false;
  }

  start(totalSteps, initialMessage = '') {
    this.currentStep = 0;
    this.totalSteps = totalSteps;
    this.currentMessage = initialMessage;
    this.isActive = true;
    this.update();
  }

  nextStep(message) {
    if (!this.isActive) return;
    
    this.currentStep = Math.min(this.currentStep + 1, this.totalSteps);
    this.currentMessage = message;
    this.update();
  }

  setStep(step, message) {
    if (!this.isActive) return;
    
    this.currentStep = Math.max(0, Math.min(step, this.totalSteps));
    this.currentMessage = message;
    this.update();
  }

  complete(message = 'Analysis complete! 🎉') {
    this.currentStep = this.totalSteps;
    this.currentMessage = message;
    this.update();
    
    // Auto-stop after a delay
    setTimeout(() => {
      this.stop();
    }, 2000);
  }

  error(message) {
    this.isActive = false;
    this.onProgressUpdate({
      step: 0,
      total: this.totalSteps,
      message: '',
      isActive: false,
      error: true
    });
  }

  stop() {
    this.isActive = false;
    this.currentStep = 0;
    this.totalSteps = 0;
    this.currentMessage = '';
    this.update();
  }

  update() {
    this.onProgressUpdate({
      step: this.currentStep,
      total: this.totalSteps,
      message: this.currentMessage,
      isActive: this.isActive,
      percentage: this.totalSteps > 0 ? (this.currentStep / this.totalSteps) * 100 : 0
    });
  }

  getState() {
    return {
      step: this.currentStep,
      total: this.totalSteps,
      message: this.currentMessage,
      isActive: this.isActive,
      percentage: this.totalSteps > 0 ? (this.currentStep / this.totalSteps) * 100 : 0
    };
  }
}

/**
 * Progress messages for different analysis types
 */
export const ProgressMessages = {
  DETERMINING_STRATEGY: 'Analyzing question and determining best approach...',
  ROW_BY_ROW_SETUP: 'Setting up row-by-row AI analysis...',
  ROW_BY_ROW_PROCESSING: (current, total) => `Analyzing row ${current} of ${total} with AI...`,
  ROW_BY_ROW_COMPLETE: (matches, total) => `Found ${matches} matching rows out of ${total} total rows.`,
  
  BATCH_SETUP: 'Preparing data for batch analysis...',
  BATCH_PROCESSING: (current, total) => `Processing batch ${current} of ${total}...`,
  BATCH_COMPLETE: (batches, rows) => `Analyzed ${rows} rows in ${batches} batches.`,
  
  SQL_EXECUTING: 'Executing SQL query...',
  SQL_ANALYZING: 'Generating insights from SQL results...',
  SQL_COMPLETE: 'SQL analysis complete!',
  
  HYBRID_SQL: 'Running SQL to filter data...',
  HYBRID_AI: 'Analyzing filtered results with AI...',
  HYBRID_COMPLETE: 'Hybrid analysis complete!',
  
  FINALIZING: 'Finalizing analysis and generating insights...',
  COMPLETE: 'Analysis complete! 🎉',
  ERROR: 'Analysis failed. Please try again.'
};