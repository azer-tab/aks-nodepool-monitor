# AKS Nodepool Monitor

A production-ready Node.js/TypeScript CLI for inspecting an Azure Kubernetes Service cluster and generating a JSON report about node pool health, subnet IP usage, and workload resilience signals.

The CLI reads configuration from command-line arguments first, then falls back to environment variables or values loaded from `.env`.

## What it checks

- AKS node pools and provisioning state.
- Node pool node count, `maxPods`, and autoscaler settings.
- VNet subnet details used by node pools.
- Estimated subnet IP usage from subnet CIDR and IP configurations.
- Kubernetes deployments with exactly one replica.
- PodDisruptionBudgets across all namespaces.
- Number of Kubernetes nodes per AKS agent pool.

`recentFailures` is currently a placeholder and returns an empty list. Azure Activity Log querying can be added later if historical provisioning-failure analysis is required.

## Docker Usage

The AKS Nodepool Monitor can be run as a Docker container. The image includes Node.js, Azure CLI, kubectl, and the compiled monitor application.

For full Docker build, run, AKS playground, and troubleshooting instructions, see:

[DOCKER.md](./DOCKER.md)

Quick run example:

```bash
docker run --rm \
  -v ~/.azure:/root/.azure \
  -v ~/.kube:/root/.kube \
  -v "$(pwd)/reports:/app/reports" \
  azertab/aks-nodepool-monitor:latest \
  --subscription-id "<subscription-id>" \
  --resource-group "<resource-group>" \
  --cluster-name "<cluster-name>" \
  --report-path "/app/reports/report.json" \
  --print-console
```

## Requirements

- Node.js 18 or newer.
- Azure CLI.
- kubectl.
- Access to the target Azure subscription.
- Kubernetes access to list deployments, PodDisruptionBudgets, and nodes.

Authentication uses Azure SDK `DefaultAzureCredential`. For local use, `az login` is usually enough.

## Install from source

```bash
npm install
npm run build
npm link
```

After linking, the command is available globally:

```bash
aks-nodepool-monitor --help
```

## Run with CLI arguments

```bash
aks-nodepool-monitor \
  --subscription-id 00000000-0000-0000-0000-000000000000 \
  --resource-group my-resource-group \
  --cluster-name my-aks-cluster \
  --report-path ./reports/aks-nodepool-report.json
```

Short flags are also available:

```bash
aks-nodepool-monitor \
  -s 00000000-0000-0000-0000-000000000000 \
  -g my-resource-group \
  -n my-aks-cluster \
  -o report.json
```

## Run with environment variables

```bash
export AZURE_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
export AKS_RESOURCE_GROUP="my-resource-group"
export AKS_CLUSTER_NAME="my-aks-cluster"
export REPORT_PATH="report.json"

aks-nodepool-monitor
```

CLI arguments override environment variables.

## `.env` support

Copy the example file:

```bash
cp .env.example .env
```

Then edit the values:

```env
AZURE_SUBSCRIPTION_ID=00000000-0000-0000-0000-000000000000
AKS_RESOURCE_GROUP=my-resource-group
AKS_CLUSTER_NAME=my-aks-cluster
REPORT_PATH=report.json
PRINT_CONSOLE=true
```

Do not commit `.env`.

## CLI options

| Option | Env fallback | Required | Description |
|---|---|---:|---|
| `-s, --subscription-id <id>` | `AZURE_SUBSCRIPTION_ID` | Yes | Azure subscription ID containing the AKS cluster. |
| `-g, --resource-group <name>` | `AKS_RESOURCE_GROUP` | Yes | Resource group containing the AKS cluster. |
| `-n, --cluster-name <name>` | `AKS_CLUSTER_NAME` | Yes | AKS cluster name. |
| `-o, --report-path <path>` | `REPORT_PATH` | No | Output JSON path. Defaults to `report.json`. |
| `--print-console` | `PRINT_CONSOLE` | No | Print JSON report to stdout. Defaults to true. |
| `--no-print-console` | none | No | Disable stdout report printing. |
| `-h, --help` | none | No | Show help. |
| `-v, --version` | none | No | Show version. |

## Prepare Azure and Kubernetes access

Login to Azure:

```bash
az login
az account set --subscription "00000000-0000-0000-0000-000000000000"
```

Download AKS credentials:

```bash
az aks get-credentials \
  --resource-group my-resource-group \
  --name my-aks-cluster \
  --overwrite-existing
```

Verify access:

```bash
kubectl config current-context
kubectl get nodes
kubectl get deployments --all-namespaces
kubectl get pdb --all-namespaces
```

## Development

```bash
npm install
npm run build
npm test
```

Run without installing globally:

```bash
npm run build
node dist/index.js --help
```

## Package for sharing

```bash
npm pack
```

This creates a `.tgz` package that another user can install:

```bash
npm install -g ./azer-tab-aks-nodepool-monitor-1.0.0.tgz
aks-nodepool-monitor --help
```

## Project structure

```text
.
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts
│   ├── cli.ts
│   ├── config.ts
│   ├── collectors/
│   ├── analyzers/
│   ├── reporters/
│   ├── models/
│   └── utils/
└── dist/
```

## Troubleshooting

### Missing required configuration

Run:

```bash
aks-nodepool-monitor --help
```

Then pass the required flags or set the matching environment variables.

### Azure authentication failure

Run:

```bash
az login
az account show
```

Make sure the active account can read the target AKS cluster and related VNet subnets.

### Kubernetes access failure

The CLI shells out to these commands:

```bash
kubectl get deployments --all-namespaces -o json
kubectl get pdb --all-namespaces -o json
kubectl get nodes -o json
```

Make sure your current kubeconfig context points to the target AKS cluster and has list permissions for these resources.
