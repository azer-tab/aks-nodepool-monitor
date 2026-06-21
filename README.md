# AKS Nodepool Monitor

AKS Nodepool Monitor is a Node.js/TypeScript command-line tool that inspects an Azure Kubernetes Service (AKS) cluster and generates a JSON report about node pool health, subnet IP usage, and basic workload resilience signals.

The tool combines data from two sources:

1. **Azure APIs** through the Azure SDK.
2. **Kubernetes APIs** through the local `kubectl` command and the currently selected kubeconfig context.

It writes the report to `report.json` by default and also prints the result to the console.

---

## What the tool checks

The current implementation collects and reports:

- AKS node pools.
- Node pool provisioning state.
- Node pool node count.
- Node pool `maxPods` value.
- Node pool autoscaler settings.
- VNet subnet details used by node pools.
- Estimated subnet IP usage based on subnet CIDR and IP configurations.
- Kubernetes deployments with exactly one replica.
- PodDisruptionBudgets across all namespaces.
- Number of Kubernetes nodes per AKS agent pool.

The `recentFailures` logic currently exists as a placeholder in the Azure client and returns an empty list. Azure Activity Log querying can be added later if provisioning-failure history is required.

---

## Project structure

```text
.
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── collectors/
│   │   ├── azure-collector.ts
│   │   └── kubernetes-collector.ts
│   ├── analyzers/
│   │   ├── subnet-analyzer.ts
│   │   ├── nodepool-analyzer.ts
│   │   └── resilience-analyzer.ts
│   ├── reporters/
│   │   ├── json-reporter.ts
│   │   └── console-reporter.ts
│   ├── models/
│   │   └── azure-data.ts
│   └── utils/
│       └── azure-client.ts
└── dist/
```

---

## Runtime requirements

- Node.js `18` or newer.
- npm.
- Azure CLI.
- kubectl.
- Access to the target Azure subscription.
- Access to the target AKS cluster.
- Permission to read AKS node pools and related VNet subnets.
- Kubernetes permission to list:
  - deployments across namespaces
  - PodDisruptionBudgets across namespaces
  - nodes

For local development, Azure authentication is normally handled through `az login`. The code uses `DefaultAzureCredential`, which can authenticate through Azure CLI, environment-based service principal credentials, managed identity, and other supported Azure identity sources.

---

## 1. Install prerequisites

### macOS

Using Homebrew:

```bash
brew install node
brew install azure-cli
brew install kubectl
```

Verify:

```bash
node --version
npm --version
az version
kubectl version --client
```

Alternative for kubectl:

```bash
az aks install-cli
```

---

### Linux

Install Node.js `18` or newer using your distribution package manager, `nvm`, or your organization's approved package source.

For Azure CLI, use the installation method for your Linux distribution from Microsoft Learn. On Debian/Ubuntu-based systems, the Microsoft installation script is commonly used:

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

Install kubectl with either your package manager or Azure CLI:

```bash
sudo az aks install-cli
```

Verify:

```bash
node --version
npm --version
az version
kubectl version --client
```

---

### Windows

Using PowerShell with winget:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Microsoft.AzureCLI
winget install Kubernetes.kubectl
```

Close and reopen PowerShell after installation so the PATH is refreshed.

Verify:

```powershell
node --version
npm --version
az version
kubectl version --client
```

Alternative for kubectl:

```powershell
az aks install-cli
```

---

## 2. Install project dependencies

From the project root:

```bash
npm install
```

If you want to use a `.env` file, install `dotenv` as well:

```bash
npm install dotenv
```

Then make sure this import is the first executable import in `src/index.ts`:

```ts
import 'dotenv/config';
```

Without this import, Node.js will not automatically load a `.env` file.

---

## 3. Configure environment variables

The tool requires these environment variables:

| Variable | Required | Description |
|---|---:|---|
| `AZURE_SUBSCRIPTION_ID` | Yes | Azure subscription ID containing the AKS cluster. |
| `AKS_RESOURCE_GROUP` | Yes | Resource group of the AKS cluster. |
| `AKS_CLUSTER_NAME` | Yes | Name of the AKS cluster. |
| `REPORT_PATH` | No | Output path for the generated JSON report. Defaults to `report.json`. |

### Option A: use a `.env` file

Create a `.env` file in the project root:

```env
AZURE_SUBSCRIPTION_ID=00000000-0000-0000-0000-000000000000
AKS_RESOURCE_GROUP=myResourceGroup
AKS_CLUSTER_NAME=myAKSCluster
REPORT_PATH=report.json
```

Important notes:

- The file must be named exactly `.env`.
- Put it in the project root, next to `package.json`.
- Do not put it inside `src/` or `dist/`.
- Run the app from the project root.
- Do not commit `.env` to Git.

Recommended `.gitignore` entry:

```gitignore
.env
report.json
```

### Option B: export variables manually

#### macOS/Linux

```bash
export AZURE_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
export AKS_RESOURCE_GROUP="myResourceGroup"
export AKS_CLUSTER_NAME="myAKSCluster"
export REPORT_PATH="report.json"
```

#### Windows PowerShell

```powershell
$env:AZURE_SUBSCRIPTION_ID = "00000000-0000-0000-0000-000000000000"
$env:AKS_RESOURCE_GROUP = "myResourceGroup"
$env:AKS_CLUSTER_NAME = "myAKSCluster"
$env:REPORT_PATH = "report.json"
```

#### Windows Command Prompt

```cmd
set AZURE_SUBSCRIPTION_ID=00000000-0000-0000-0000-000000000000
set AKS_RESOURCE_GROUP=myResourceGroup
set AKS_CLUSTER_NAME=myAKSCluster
set REPORT_PATH=report.json
```

---

## 4. Authenticate to Azure

Login with Azure CLI:

```bash
az login
```

If Azure reports an expired refresh token, run:

```bash
az login --scope https://management.azure.com/.default
```

Verify the active account:

```bash
az account show
```

Select the target subscription.

### macOS/Linux

```bash
az account set --subscription "$AZURE_SUBSCRIPTION_ID"
```

### Windows PowerShell

```powershell
az account set --subscription $env:AZURE_SUBSCRIPTION_ID
```

### Windows Command Prompt

```cmd
az account set --subscription %AZURE_SUBSCRIPTION_ID%
```

Verify again:

```bash
az account show --output table
```

---

## 5. Configure Kubernetes access

The tool runs these kubectl commands internally:

```bash
kubectl get deployments --all-namespaces -o json
kubectl get pdb --all-namespaces -o json
kubectl get nodes -o json
```

Therefore, your local kubeconfig must point to the correct AKS cluster before running the tool.

### macOS/Linux

```bash
az aks get-credentials \
  --resource-group "$AKS_RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --overwrite-existing \
  --admin
```

### Windows PowerShell

```powershell
az aks get-credentials `
  --resource-group $env:AKS_RESOURCE_GROUP `
  --name $env:AKS_CLUSTER_NAME `
  --overwrite-existing `
  --admin
```

### Windows Command Prompt

```cmd
az aks get-credentials ^
  --resource-group %AKS_RESOURCE_GROUP% ^
  --name %AKS_CLUSTER_NAME% ^
  --overwrite-existing ^
  --admin
```

The `--admin` flag downloads cluster-admin credentials. Use it only when you are allowed to use AKS admin credentials. In stricter environments, use non-admin credentials and make sure your Kubernetes identity has permission to list deployments, PDBs, and nodes.

Verify the selected Kubernetes context:

```bash
kubectl config current-context
```

Verify cluster access:

```bash
kubectl cluster-info
kubectl get nodes
kubectl get deployments --all-namespaces
kubectl get pdb --all-namespaces
```

---

## 6. Build and run

From the project root:

```bash
npm run build
npm run start
```

The default start script runs:

```bash
node dist/index.js
```

Do not run the app from inside the `dist/` directory if you rely on `.env` loading from the project root. Run from the project root instead:

```bash
node dist/index.js
```

---

## 7. Report output

By default, the tool writes:

```text
report.json
```

To customize the output path, set `REPORT_PATH`.

### macOS/Linux

```bash
export REPORT_PATH="./reports/aks-nodepool-report.json"
mkdir -p ./reports
npm run start
```

### Windows PowerShell

```powershell
$env:REPORT_PATH = ".\reports\aks-nodepool-report.json"
New-Item -ItemType Directory -Force .\reports
npm run start
```

The report is also printed to the console.

Example report shape:

```json
{
  "subnet": [
    {
      "subnetId": "...",
      "cidr": "10.0.0.0/24",
      "totalIps": 256,
      "usedIps": 42,
      "usableIps": 214
    }
  ],
  "nodepool": [
    {
      "nodepoolId": "...",
      "name": "systempool",
      "provisioningState": "Succeeded",
      "count": 3,
      "maxPods": 30,
      "autoscalerSettings": {
        "enabled": true,
        "minCount": 3,
        "maxCount": 6
      },
      "recentFailure": null
    }
  ],
  "resilience": {
    "deploymentsWithSingleReplica": [],
    "podDisruptionBudgets": [],
    "nodesPerAgentPool": {
      "systempool": 3
    }
  }
}
```

---

## Troubleshooting

### `Missing required environment variable: AZURE_SUBSCRIPTION_ID`

The app cannot see your environment variables.

Check:

```bash
pwd
ls -la .env
```

Make sure:

- `.env` is in the project root.
- `src/index.ts` contains `import 'dotenv/config';` before environment variables are read.
- `dotenv` is installed if you are using `.env`.
- You run `npm run start` from the project root.
- Variable names are spelled exactly as expected.

Temporary debug snippet:

```ts
console.log('cwd =', process.cwd());
console.log('AZURE_SUBSCRIPTION_ID =', process.env.AZURE_SUBSCRIPTION_ID);
```

---

### `Cannot find module 'dotenv/config'`

Install dotenv:

```bash
npm install dotenv
npm run build
```

---

### `AggregateAuthenticationError: ChainedTokenCredential authentication failed`

Azure authentication failed.

For local development, re-authenticate Azure CLI:

```bash
az login --scope https://management.azure.com/.default
az account set --subscription "<subscription-id>"
az account show
```

If you see this message:

```text
EnvironmentCredential is unavailable
```

that is not necessarily fatal by itself. It simply means service-principal environment variables were not configured. For local development, the Azure CLI credential can still work as long as `az login` is valid.

For CI/CD, configure service-principal authentication using:

```env
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
AZURE_SUBSCRIPTION_ID=<subscription-id>
AKS_RESOURCE_GROUP=<resource-group>
AKS_CLUSTER_NAME=<cluster-name>
```

---

### `The connection to the server 127.0.0.1:<port> was refused`

kubectl is pointing to a stale local proxy or invalid kubeconfig context.

Refresh AKS credentials:

```bash
az aks get-credentials \
  --resource-group "<resource-group>" \
  --name "<aks-cluster-name>" \
  --overwrite-existing \
  --admin
```

Then verify:

```bash
kubectl config current-context
kubectl get nodes
kubectl get deployments --all-namespaces
```

---

### `kubectl` permission errors

The tool needs to list resources across all namespaces and list nodes.

Validate manually:

```bash
kubectl get deployments --all-namespaces
kubectl get pdb --all-namespaces
kubectl get nodes
```

If any command fails with `Forbidden`, either:

- use admin credentials if permitted, or
- ask your cluster administrator for the required RBAC permissions.

---

### `ENOENT` when writing report

If `REPORT_PATH` points to a directory that does not exist, create it first.

macOS/Linux:

```bash
mkdir -p ./reports
```

Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force .\reports
```

---

## CI/CD usage

For non-interactive environments, prefer service-principal or managed-identity authentication instead of `az login`.

At minimum, the job needs:

```env
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
AZURE_SUBSCRIPTION_ID=<subscription-id>
AKS_RESOURCE_GROUP=<resource-group>
AKS_CLUSTER_NAME=<cluster-name>
```

The job also needs Kubernetes access. Typical approaches are:

1. Run `az aks get-credentials --admin` in the pipeline, if the pipeline identity is allowed to fetch AKS admin credentials.
2. Provide a kubeconfig securely through the CI/CD secret store.
3. Use a Kubernetes identity with RBAC permissions to list deployments, PDBs, and nodes.

Do not print secrets or commit kubeconfig files to the repository.

---

## Security notes

- Do not commit `.env` files.
- Do not commit kubeconfig files.
- Treat `--admin` kubeconfig access as privileged cluster access.
- Prefer least-privilege Kubernetes RBAC where possible.
- The Azure subscription ID is not a password, but it is still environment-specific metadata and should not be published unnecessarily.

---

## Known implementation notes

- Subnet IP usage is estimated from CIDR size minus existing subnet IP configurations. The current calculation does not subtract Azure-reserved subnet IPs separately.
- Recent AKS provisioning failures are not queried yet. `getRecentProvisioningFailures()` currently returns an empty array.
- Kubernetes collection depends on the local `kubectl` binary and current kubeconfig context.
- The app should be run from the project root when using `.env`.

---

## Useful commands summary

macOS/Linux:

```bash
npm install
npm install dotenv
az login --scope https://management.azure.com/.default
az account set --subscription "$AZURE_SUBSCRIPTION_ID"
az aks get-credentials \
  --resource-group "$AKS_RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --overwrite-existing \
  --admin
kubectl get nodes
npm run build
npm run start
```

Windows PowerShell:

```powershell
npm install
npm install dotenv
az login --scope https://management.azure.com/.default
az account set --subscription $env:AZURE_SUBSCRIPTION_ID
az aks get-credentials `
  --resource-group $env:AKS_RESOURCE_GROUP `
  --name $env:AKS_CLUSTER_NAME `
  --overwrite-existing `
  --admin
kubectl get nodes
npm run build
npm run start
```

---

## References

- Azure CLI installation: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli
- Azure CLI `az aks get-credentials`: https://learn.microsoft.com/en-us/cli/azure/aks#az-aks-get-credentials
- Kubernetes tools installation: https://kubernetes.io/docs/tasks/tools/
- Azure Identity `DefaultAzureCredential`: https://learn.microsoft.com/en-us/javascript/api/@azure/identity/defaultazurecredential
