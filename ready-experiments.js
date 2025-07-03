const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class ReadyExperimentsFetcher {
  constructor() {
    this.apiKey = process.env.EPPO_API_KEY;
    this.baseUrl = process.env.EPPO_BASE_URL || 'https://eppo.cloud/api/v1';
    
    if (!this.apiKey) {
      throw new Error('EPPO_API_KEY environment variable is required');
    }
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Eppo-Token': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Fetch all experiments from Eppo API
   * @returns {Promise<Array>} Array of experiments
   */
  async fetchExperiments() {
    try {
      console.log('Fetching experiments from Eppo API...');
      const response = await this.client.get('/experiments');
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error(`API Error: ${error.response.status} - ${error.response.statusText}`);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('Network Error: No response received from API');
      } else {
        console.error('Error:', error.message);
      }
      throw error;
    }
  }

  /**
   * Filter experiments by "ready" or "WRAP_UP" status
   * @param {Array} experiments - Array of experiment objects
   * @returns {Array} Filtered experiments with target statuses
   */
  filterByTargetStatuses(experiments) {
    if (!Array.isArray(experiments)) {
      console.warn('Experiments data is not an array:', typeof experiments);
      return [];
    }

    const targetStatuses = ['ready', 'wrap_up'];

    return experiments.filter(experiment => {
      // Check various possible fields where status might be stored
      const status = experiment.status || 
                    experiment.state || 
                    experiment.experiment_status ||
                    experiment.metadata?.status ||
                    experiment.metadata?.state;
      
      if (!status) return false;
      
      const statusStr = status.toString().toLowerCase();
      
      // Check for exact matches (case-insensitive)
      return targetStatuses.includes(statusStr);
    });
  }

  /**
   * Extract and save ready experiments in CSV format
   * @param {Array} experiments - Array of experiment objects
   */
  generateReadyExperimentsCSV(experiments) {
    if (experiments.length === 0) {
      console.log(`\n🔍 No experiments found with "ready" or "wrap up" status.`);
      return;
    }

    console.log(`\n✅ Found ${experiments.length} experiment(s) with "ready" or "wrap up" status:\n`);
    
    // Escape CSV values that contain commas or quotes
    const escapeCsv = (value) => {
      if (typeof value !== 'string') value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    
    // Build CSV content
    const csvRows = [];
    
    // CSV Header - matching your requested columns
    csvRows.push('owner,owner_email,experiment_name,experiment_id,experiment_status,experiment_link');
    
    // CSV Data rows
    experiments.forEach((experiment) => {
      const experimentName = experiment.name || experiment.title || 'Unnamed Experiment';
      const experimentId = experiment.id || experiment.experiment_id || '';
      
      // Get the experiment status
      const experimentStatus = experiment.status || 
                              experiment.state || 
                              experiment.experiment_status ||
                              experiment.metadata?.status ||
                              experiment.metadata?.state || '';
      
      // Handle owner object structure
      const owner = experiment.owner || experiment.created_by || experiment.createdBy || experiment.author || {};
      
      let ownerName = '';
      let ownerEmail = '';
      
      if (typeof owner === 'object' && owner !== null) {
        ownerName = owner.name || owner.full_name || owner.displayName || '';
        ownerEmail = owner.email || owner.email_address || '';
      } else if (typeof owner === 'string') {
        // If owner is just a string, try to parse if it's an email
        if (owner.includes('@')) {
          ownerEmail = owner;
          ownerName = owner.split('@')[0]; // Use part before @ as name fallback
        } else {
          ownerName = owner;
        }
      }
      
      const experimentUrl = experimentId ? `https://eppo.cloud/experiments/${experimentId}` : '';
      const csvRow = `${escapeCsv(ownerName)},${escapeCsv(ownerEmail)},${escapeCsv(experimentName)},${escapeCsv(experimentId)},${escapeCsv(experimentStatus)},${escapeCsv(experimentUrl)}`;
      csvRows.push(csvRow);
      console.log(csvRow); // Still log to console
    });

    // Save CSV to file
    const csvContent = csvRows.join('\n');
    const fileName = `eppo_ready_wrap_up_experiments_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = path.join(process.cwd(), fileName);
    
    try {
      fs.writeFileSync(filePath, csvContent, 'utf8');
      console.log(`\n📁 CSV file saved: ${fileName}`);
      console.log(`📍 Full path: ${filePath}`);
    } catch (error) {
      console.error('❌ Error saving CSV file:', error.message);
    }

    // Summary
    const uniqueOwnerEmails = [...new Set(experiments.map(exp => {
      const owner = exp.owner || exp.created_by || exp.createdBy || exp.author || {};
      if (typeof owner === 'object' && owner !== null) {
        return owner.email || owner.email_address || '';
      } else if (typeof owner === 'string' && owner.includes('@')) {
        return owner;
      }
      return '';
    }).filter(email => email !== ''))];
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total experiments (ready/wrap up): ${experiments.length}`);
    console.log(`   Unique owner emails: ${uniqueOwnerEmails.length}`);
    
    // Google Sheets instructions
    console.log(`\n📋 Google Sheets Import Instructions:`);
    console.log(`   1. Open Google Sheets (sheets.google.com)`);
    console.log(`   2. Create a new spreadsheet or open existing one`);
    console.log(`   3. Go to File → Import → Upload`);
    console.log(`   4. Upload the file: ${fileName}`);
    console.log(`   5. Choose "Comma" as separator`);
    console.log(`   6. Click "Import data"`);
    console.log(`\n   Alternative: Copy the CSV content above and paste into Google Sheets`);
  }

  /**
   * Main method to fetch and process experiments
   */
  async run() {
    try {
      console.log('🚀 Starting Ready/Wrap Up Experiments Fetcher...\n');
      
      // Fetch all experiments
      const allExperiments = await this.fetchExperiments();
      console.log(`📊 Total experiments fetched: ${Array.isArray(allExperiments) ? allExperiments.length : 'Unknown'}`);
      
      // Log unique statuses found for debugging
      if (Array.isArray(allExperiments)) {
        const statuses = new Set();
        allExperiments.forEach(exp => {
          const status = exp.status || exp.state || exp.experiment_status || exp.metadata?.status || exp.metadata?.state;
          if (status) statuses.add(status);
        });
        
        console.log('\n📋 Unique statuses found:');
        Array.from(statuses).forEach(status => console.log(`  - ${status}`));
      }
      
      // Filter by "ready" or "wrap up" status (flexible matching)
      const readyExperiments = this.filterByTargetStatuses(allExperiments);
      
      // Generate and save CSV
      this.generateReadyExperimentsCSV(readyExperiments);
      
    } catch (error) {
      console.error('\n❌ Error occurred while fetching experiments:');
      console.error(error.message);
      process.exit(1);
    }
  }
}

// Run the application
if (require.main === module) {
  const fetcher = new ReadyExperimentsFetcher();
  fetcher.run().catch(console.error);
}

module.exports = ReadyExperimentsFetcher; 