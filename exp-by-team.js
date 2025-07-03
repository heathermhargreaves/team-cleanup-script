const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class EppoExperimentFetcher {
  constructor() {
    this.apiKey = process.env.EPPO_API_KEY;
    this.baseUrl = process.env.EPPO_BASE_URL || 'https://eppo.cloud/api/v1';
    this.teamId = process.env.TEAM_ID;
    
    if (!this.apiKey) {
      throw new Error('EPPO_API_KEY environment variable is required');
    }
    
    if (!this.teamId) {
      throw new Error('TEAM_ID environment variable is required');
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
   * Filter experiments by team ID
   * @param {Array} experiments - Array of experiment objects
   * @param {number} teamId - ID of the team to filter by
   * @returns {Array} Filtered experiments
   */
  filterByTeam(experiments, teamId) {
    if (!Array.isArray(experiments)) {
      console.warn('Experiments data is not an array:', typeof experiments);
      return [];
    }

    return experiments.filter(experiment => {
      // Check various possible fields where team ID might be stored
      const team_id = experiment.team_id || 
                      experiment.teamId || 
                      experiment.owner_team_id || 
                      experiment.ownerTeamId ||
                      experiment.metadata?.team_id ||
                      experiment.metadata?.teamId;
      
      // Convert both to numbers for comparison
      return parseInt(team_id) === parseInt(teamId);
    });
  }

  /**
   * Extract and save experiment owners in CSV format
   * @param {Array} experiments - Array of experiment objects
   */
  displayExperimentOwners(experiments) {
    if (experiments.length === 0) {
      console.log(`\n🔍 No experiments found for team ID ${this.teamId}.`);
      return;
    }

    console.log(`\n✅ Found ${experiments.length} experiment(s) for team ID ${this.teamId}:\n`);
    
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
    
    // CSV Header
    csvRows.push('experiment_name,experiment_id,owner.name,owner.email,experiment_url');
    
    // CSV Data rows
    experiments.forEach((experiment) => {
      const experimentName = experiment.name || experiment.title || 'Unnamed Experiment';
      const experimentId = experiment.id || experiment.experiment_id || '';
      
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
      const csvRow = `${escapeCsv(experimentName)},${escapeCsv(experimentId)},${escapeCsv(ownerName)},${escapeCsv(ownerEmail)},${escapeCsv(experimentUrl)}`;
      csvRows.push(csvRow);
      console.log(csvRow); // Still log to console
    });

    // Save CSV to file
    const csvContent = csvRows.join('\n');
    const fileName = `eppo_experiments_team_${this.teamId}_${new Date().toISOString().split('T')[0]}.csv`;
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
    console.log(`   Total experiments: ${experiments.length}`);
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
      console.log('🚀 Starting Eppo Experiments Fetcher...\n');
      
      // Fetch all experiments
      const allExperiments = await this.fetchExperiments();
      console.log(`📊 Total experiments fetched: ${Array.isArray(allExperiments) ? allExperiments.length : 'Unknown'}`);
      
      // Also log a summary of team IDs found
      if (Array.isArray(allExperiments)) {
        const teamIds = new Set();
        allExperiments.forEach(exp => {
          const team_id = exp.team_id || exp.teamId || exp.owner_team_id || exp.ownerTeamId || exp.metadata?.team_id || exp.metadata?.teamId;
          if (team_id) teamIds.add(team_id);
        });
        
        console.log('\n📋 Unique team IDs found:');
        Array.from(teamIds).forEach(teamId => console.log(`  - ${teamId}`));
      }
      
      // Filter by specified team ID
      const teamExperiments = this.filterByTeam(allExperiments, this.teamId);
      
      // Display results
      this.displayExperimentOwners(teamExperiments);
      
    } catch (error) {
      console.error('\n❌ Error occurred while fetching experiments:');
      console.error(error.message);
      process.exit(1);
    }
  }
}

// Run the application
if (require.main === module) {
  const fetcher = new EppoExperimentFetcher();
  fetcher.run().catch(console.error);
}

module.exports = EppoExperimentFetcher; 