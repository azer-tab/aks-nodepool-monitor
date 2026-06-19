# aks-nodepool-monitor

## Overview
AKS Nodepool Monitor helps platform teams detect nodepool provisioning risk before it becomes an outage by correlating AKS nodepool state, subnet IP pressure, autoscaler settings, and workload resilience into a simple JSON and console report.

## Features
- Collects AKS nodepool details including:
  - Provisioning state
  - Node count
  - Maximum pods per node
  - Autoscaler settings
- Analyzes subnet CIDRs and occupancy to determine IP usage.
- Detects recent provisioning failures in nodepools.
- Assesses workload resilience in Kubernetes.
- Generates reports in JSON format and provides console summaries.

## Project Structure
```
aks-nodepool-monitor
├── src
│   ├── collectors          # Data collection modules
│   ├── analyzers           # Analysis modules
│   ├── reporters           # Reporting modules
│   ├── models              # Data models
│   ├── utils               # Utility functions
│   └── index.ts           # Main entry point
├── package.json            # NPM configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/aks-nodepool-monitor.git
   ```
2. Navigate to the project directory:
   ```
   cd aks-nodepool-monitor
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
To run the AKS Nodepool Monitor, execute the following command:
```
npm start
```

This will initialize the collectors, perform the analysis, and generate the reports.

## Reporting
The application will output a summary to the console indicating the status of the AKS nodepools (OK / WARN / CRIT) and provide recommended actions based on the analysis. Additionally, a `report.json` file will be generated containing detailed analysis results.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.
