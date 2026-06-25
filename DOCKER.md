# Dockerizing AKS Nodepool Monitor

This guide explains how to build, run, test, and publish the AKS Nodepool Monitor Docker image.

The Docker image contains:

* Node.js runtime
* The compiled AKS Nodepool Monitor application
* Azure CLI
* kubectl

The image can be used to test the monitor locally against an AKS cluster, including clusters created in the KodeKloud Azure Playground.

---

## Prerequisites

Before using the Docker image, make sure you have:

* Docker 20.10+
* A valid Azure CLI login on your host machine
* Access to the target Azure subscription and resource group
* A working AKS cluster, or permission to create one
* A local kubeconfig directory at `~/.kube`
* A local Azure CLI config directory at `~/.azure`

Authenticate with Azure on your host machine first:

```bash
az login
az account show -o table
```

Set the resource group and AKS cluster name:

```bash
export RG="<your-resource-group>"
export AKS="kk-aks"
```

For the KodeKloud Azure Playground, the resource group name may change between sessions. Always verify it:

```bash
az group list -o table
```

---

## Build the Image Locally

Build the image with the default local tag:

```bash
docker build -t aks-nodepool-monitor:latest .
```

Build with a custom version tag:

```bash
docker build -t aks-nodepool-monitor:1.0.0 .
```

Build with Docker BuildKit enabled:

```bash
DOCKER_BUILDKIT=1 docker build -t aks-nodepool-monitor:latest .
```

---

## Pull the Published Image

If the image is published to Docker Hub, pull it with:

```bash
docker pull azertab/aks-nodepool-monitor:latest
```

For a timestamped build:

```bash
docker pull azertab/aks-nodepool-monitor:<timestamp-tag>
```

Example:

```bash
docker pull azertab/aks-nodepool-monitor:20260625-120012
```

---

## Verify the Image

Check that the image exists locally:

```bash
docker images | grep aks-nodepool-monitor
```

Verify that Azure CLI is available inside the container:

```bash
docker run --rm \
  -v ~/.azure:/root/.azure \
  --entrypoint az \
  azertab/aks-nodepool-monitor:latest \
  account show
```

Important: do not mount `~/.azure` as read-only. Azure CLI writes cache, log, and metadata files under `/root/.azure`, even for read-only commands such as `az account show`.

Verify that kubectl is available inside the container:

```bash
docker run --rm \
  -v ~/.kube/config:/root/.kube/config:ro \
  --entrypoint kubectl \
  azertab/aks-nodepool-monitor:latest \
  version --client
```

Verify Kubernetes access:

```bash
docker run --rm \
  -v ~/.kube/config:/root/.kube/config:ro \
  --entrypoint kubectl \
  azertab/aks-nodepool-monitor:latest \
  get nodes
```

---

## Recommended Local Test Workflow

This command performs the full local test workflow from inside the container.

It will:

1. Verify Azure authentication.
2. Select the target subscription.
3. Detect the resource group location.
4. Check whether the AKS cluster already exists.
5. Create the AKS cluster if it does not exist.
6. Refresh kubeconfig using AKS admin credentials.
7. Verify Kubernetes access with `kubectl get nodes`.
8. Run the AKS Nodepool Monitor.
9. Write the report to `./reports/report.json`.

Create the reports directory:

```bash
mkdir -p reports
```

Run the full workflow:

```bash
docker run --rm \
  -v ~/.azure:/root/.azure \
  -v ~/.kube:/root/.kube \
  -v "$(pwd)/reports:/app/reports" \
  --entrypoint /bin/sh \
  azertab/aks-nodepool-monitor:latest \
  -c '
    set -e

    SUBSCRIPTION_ID="a2b28c85-1948-4263-90ca-bade2bac4df4"
    RG="'"$RG"'"
    AKS="'"$AKS"'"

    echo "Using resource group: $RG"
    echo "Using AKS cluster: $AKS"

    echo "Checking Azure login..."
    az account show >/dev/null

    echo "Setting Azure subscription..."
    az account set --subscription "$SUBSCRIPTION_ID"

    echo "Detecting resource group location..."
    LOCATION=$(az group show --name "$RG" --query location -o tsv)

    echo "Checking whether AKS cluster exists..."
    if az aks show \
      --resource-group "$RG" \
      --name "$AKS" \
      >/dev/null 2>&1; then
      echo "AKS cluster already exists."
    else
      echo "AKS cluster does not exist. Creating it..."

      az aks create \
        --resource-group "$RG" \
        --name "$AKS" \
        --location "$LOCATION" \
        --node-count 1 \
        --node-vm-size Standard_D2s_v3 \
        --nodepool-name nodepool1 \
        --enable-managed-identity \
        --enable-aad \
        --tier free \
        --network-plugin azure \
        --network-plugin-mode overlay \
        --generate-ssh-keys
    fi

    echo "Refreshing AKS admin kubeconfig..."
    az aks get-credentials \
      --resource-group "$RG" \
      --name "$AKS" \
      --admin \
      --overwrite-existing

    echo "Verifying Kubernetes access..."
    kubectl get nodes

    echo "Running AKS Nodepool Monitor..."
    node /app/dist/index.js \
      --subscription-id "$SUBSCRIPTION_ID" \
      --resource-group "$RG" \
      --cluster-name "$AKS" \
      --report-path "/app/reports/report.json" \
      --print-console
  '
```

---

## Why These Volumes Are Mounted

The recommended command uses these mounts:

```bash
-v ~/.azure:/root/.azure
-v ~/.kube:/root/.kube
-v "$(pwd)/reports:/app/reports"
```

### Azure credentials

```bash
-v ~/.azure:/root/.azure
```

This shares the host Azure CLI login with the container.

It must be mounted read/write because Azure CLI writes files such as:

* `versionCheck.json`
* `extensionIndex.json`
* command logs under `commands/`

Do not use:

```bash
-v ~/.azure:/root/.azure:ro
```

That can cause errors such as:

```text
Read-only file system: '/root/.azure/versionCheck.json'
```

### Kubernetes credentials

```bash
-v ~/.kube:/root/.kube
```

This allows the container to update kubeconfig using:

```bash
az aks get-credentials --admin --overwrite-existing
```

This mount must be writable for the full workflow because the container updates kubeconfig.

For read-only kubectl checks, this is enough:

```bash
-v ~/.kube/config:/root/.kube/config:ro
```

### Reports

```bash
-v "$(pwd)/reports:/app/reports"
```

This makes the generated report available on the host after the container exits.

The monitor writes to:

```bash
/app/reports/report.json
```

which appears locally as:

```bash
./reports/report.json
```

---

## Running the Monitor Against an Existing Cluster

If the AKS cluster already exists and kubeconfig is already configured, you can run only the monitor:

```bash
mkdir -p reports

docker run --rm \
  -v ~/.azure:/root/.azure \
  -v ~/.kube/config:/root/.kube/config:ro \
  -v "$(pwd)/reports:/app/reports" \
  azertab/aks-nodepool-monitor:latest \
  --subscription-id "a2b28c85-1948-4263-90ca-bade2bac4df4" \
  --resource-group "$RG" \
  --cluster-name "$AKS" \
  --report-path "/app/reports/report.json" \
  --print-console
```

---

## KodeKloud Azure Playground Notes

The KodeKloud Azure Playground usually enforces strict AKS policies.

The tested cluster creation settings are:

```bash
az aks create \
  --resource-group "$RG" \
  --name "$AKS" \
  --location "$LOCATION" \
  --node-count 1 \
  --node-vm-size Standard_D2s_v3 \
  --nodepool-name nodepool1 \
  --enable-managed-identity \
  --enable-aad \
  --tier free \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --generate-ssh-keys
```

Known playground constraints:

* Maximum node pools: 1
* Maximum nodes: 2
* Container Insights disabled
* Alerting disabled
* Use allowed VM sizes only, such as `Standard_D2s_v3`

Do not enable monitoring:

```bash
--enable-addons monitoring
```

The playground may reject the deployment if monitoring or unsupported VM sizes are used.

---

## AAD-Enabled AKS Credentials

The cluster is created with:

```bash
--enable-aad
```

With AAD-enabled AKS clusters, normal user credentials may not have Kubernetes RBAC permissions to list nodes or pods.

If you see an error like:

```text
Error from server (Forbidden): nodes is forbidden
```

refresh kubeconfig with admin credentials:

```bash
az aks get-credentials \
  --resource-group "$RG" \
  --name "$AKS" \
  --admin \
  --overwrite-existing
```

The recommended Docker workflow already does this automatically.

---

## Output

After a successful run, the report is written to:

```bash
./reports/report.json
```

View it with:

```bash
cat reports/report.json
```

Or pretty-print it:

```bash
cat reports/report.json | jq
```

---

## Interactive Debugging

Open a shell inside the container:

```bash
docker run --rm -it \
  -v ~/.azure:/root/.azure \
  -v ~/.kube:/root/.kube \
  -v "$(pwd)/reports:/app/reports" \
  --entrypoint /bin/sh \
  azertab/aks-nodepool-monitor:latest
```

Inside the container, you can run:

```bash
az account show
kubectl get nodes
node /app/dist/index.js --help
```

Run the monitor manually:

```bash
node /app/dist/index.js \
  --subscription-id "a2b28c85-1948-4263-90ca-bade2bac4df4" \
  --resource-group "$RG" \
  --cluster-name "$AKS" \
  --report-path "/app/reports/report.json" \
  --print-console
```

---

## Publishing to Docker Hub

Tag the local image:

```bash
docker tag aks-nodepool-monitor:latest azertab/aks-nodepool-monitor:latest
```

Login to Docker Hub:

```bash
docker login
```

Push the image:

```bash
docker push azertab/aks-nodepool-monitor:latest
```

---

## GitHub Actions Publishing

A typical GitHub Actions workflow should:

1. Build the image.
2. Tag it as `latest`.
3. Tag it with a timestamp.
4. Optionally tag it with the Git commit SHA.
5. Push it to Docker Hub.

Example tags:

```text
azertab/aks-nodepool-monitor:latest
azertab/aks-nodepool-monitor:20260625-120012
azertab/aks-nodepool-monitor:<commit-sha>
```

For Apple Silicon compatibility, build a multi-architecture image:

```yaml
platforms: linux/amd64,linux/arm64
```

For faster testing on Apple Silicon only:

```yaml
platforms: linux/arm64
```

---

## Troubleshooting

### Docker says `invalid reference format`

This usually means the image tag variable is empty or malformed.

Check:

```bash
echo "TAG=[$TAG]"
```

Use `latest` explicitly:

```bash
docker run --rm azertab/aks-nodepool-monitor:latest --help
```

---

### Docker cannot find `aks-nodepool-monitor:latest`

This happens when you run the local image name but only pulled the Docker Hub image.

Use:

```bash
azertab/aks-nodepool-monitor:latest
```

not:

```bash
aks-nodepool-monitor:latest
```

Or retag it locally:

```bash
docker tag azertab/aks-nodepool-monitor:latest aks-nodepool-monitor:latest
```

---

### `no matching manifest for linux/arm64/v8`

This happens on Apple Silicon Macs if the image was built only for `linux/amd64`.

Quick workaround:

```bash
docker run --rm --platform linux/amd64 \
  azertab/aks-nodepool-monitor:latest \
  --help
```

Proper fix: publish a multi-architecture image:

```yaml
platforms: linux/amd64,linux/arm64
```

---

### Azure CLI fails with read-only filesystem errors

Example:

```text
Read-only file system: '/root/.azure/versionCheck.json'
```

Cause: `~/.azure` was mounted read-only.

Incorrect:

```bash
-v ~/.azure:/root/.azure:ro
```

Correct:

```bash
-v ~/.azure:/root/.azure
```

---

### Azure authorization failure

Example:

```text
AuthorizationFailed
does not have authorization to perform action Microsoft.Resources/subscriptions/resourcegroups/read
```

This usually means one of the following:

* The Azure CLI session is stale.
* You are logged in as the wrong KodeKloud user.
* The resource group name is from a previous playground session.
* The subscription ID does not match the current playground subscription.

Check your current Azure session:

```bash
az account show -o table
```

Check available resource groups:

```bash
az group list -o table
```

Refresh login if needed:

```bash
az logout
az login
```

---

### Kubernetes `Forbidden` error

Example:

```text
Error from server (Forbidden): nodes is forbidden
```

For AAD-enabled AKS clusters, retrieve admin credentials:

```bash
az aks get-credentials \
  --resource-group "$RG" \
  --name "$AKS" \
  --admin \
  --overwrite-existing
```

---

### `crypto is not defined`

This is a Node.js runtime issue, not a Docker issue.

Fix the application by ensuring Node crypto is available explicitly. For example:

```ts
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true
  });
}
```

Load this polyfill before the application imports Azure or Kubernetes SDK modules.

---

## Image Size Notes

The production image includes:

* Node.js runtime
* Azure CLI
* kubectl
* Production Node.js dependencies

Because Azure CLI is included, the image is larger than a minimal Node.js CLI image.

Development dependencies should be omitted in the production image with:

```bash
npm ci --omit=dev
```

---

## Cleanup

Delete the AKS cluster when you are done:

```bash
az aks delete \
  --resource-group "$RG" \
  --name "$AKS" \
  --yes
```

Remove local reports:

```bash
rm -rf reports
```

Remove the local Docker image:

```bash
docker rmi azertab/aks-nodepool-monitor:latest
```
