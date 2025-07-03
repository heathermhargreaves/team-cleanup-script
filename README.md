# Eppo Experiments Fetcher

A collection of Node.js scripts that fetch experiments from Eppo's API with different filtering options.

## Scripts

### 1. Team-Based Filtering (`exp-by-team.js`)
Filters experiments by team ID and displays the experiment owners.

### 2. Status-Based Filtering (`ready-experiments.js`)
Filters experiments by "ready" or "wrap up" status (flexible matching) regardless of team and exports owner details.

## Features

- 🔌 Connects to Eppo's experiment API
- 🔍 Multiple filtering options (team ID or status)
- 📁 Exports data to CSV format with clickable URLs
- 👥 Displays experiment owners and details
- 📊 Provides summary statistics
- 🛡️ Error handling and validation

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Add your Eppo API key:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your API credentials:
   ```
   EPPO_API_KEY=your_actual_eppo_api_key_here
   EPPO_BASE_URL=https://eppo.cloud/api/v1
   TEAM_ID=your_team_id_here
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

## Usage

### Team-Based Filtering (exp-by-team.js)
```bash
npm start
# or
node exp-by-team.js
```

This script will:
1. Connect to the Eppo API using your provided credentials
2. Fetch all experiments
3. Filter experiments belonging to the specified team ID
4. Export data to CSV format including:
   - Experiment name
   - Experiment ID
   - Owner name
   - Owner email
   - Clickable experiment URL
5. Save CSV file and show summary statistics

### Ready Status Filtering (ready-experiments.js)
```bash
node ready-experiments.js
```

This script will:
1. Connect to the Eppo API using your provided credentials
2. Fetch all experiments (regardless of team)
3. Filter experiments with "ready" or "wrap up" status (flexible matching)
4. Export data to CSV format including:
   - Owner name
   - Owner email
   - Experiment name
   - Experiment ID
   - Experiment status
   - Clickable experiment URL
5. Save CSV file and show summary statistics

## API Response Handling

The application handles various possible field names for team and owner information, as API schemas can vary:

**Team ID fields checked:**
- `team_id`
- `teamId`
- `owner_team_id`
- `ownerTeamId`
- `metadata.team_id`
- `metadata.teamId`

**Owner fields checked:**
- `owner`
- `created_by`
- `createdBy`
- `author`

## Error Handling

- Missing API key validation
- Network error handling
- API response error handling
- Data format validation

## Example Output

```
🚀 Starting Eppo Experiments Fetcher...

Fetching experiments from Eppo API...
📊 Total experiments fetched: 25

✅ Found 3 experiment(s) for team ID 123:

experiment_name,experiment_id,owner.name,owner.email,experiment_url
Checkout Flow Optimization,exp_456,John Doe,john.doe@company.com,https://eppo.cloud/experiments/exp_456
Product Recommendations,exp_789,Jane Smith,jane.smith@company.com,https://eppo.cloud/experiments/exp_789

📁 CSV file saved: eppo_experiments_team_123_2024-01-15.csv

📊 Summary:
   Total experiments: 3
   Unique owner emails: 2

📋 Google Sheets Import Instructions:
   1. Open Google Sheets (sheets.google.com)
   2. Create a new spreadsheet or open existing one
   3. Go to File → Import → Upload
   4. Upload the file: eppo_experiments_team_123_2024-01-15.csv
   5. Choose "Comma" as separator
   6. Click "Import data"
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `EPPO_API_KEY` | Your Eppo API authentication key | Yes | - |
| `EPPO_BASE_URL` | Base URL for Eppo API | No | `https://eppo.cloud/api/v1` |
| `TEAM_ID` | Team ID to filter experiments by | Yes (for exp-by-team.js only) | - |

**Note:** The `TEAM_ID` is only required when running the team-based filtering script (`exp-by-team.js`). The ready-experiments script (`ready-experiments.js`) doesn't require a team ID since it searches across all teams.

## Dependencies

- `axios`: HTTP client for API requests
- `dotenv`: Environment variable management 