# Dockerizing AKS Nodepool Monitor

This guide covers building, running, and deploying the AKS Nodepool Monitor in Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+ (optional, for local development)
- For running the container, you'll need valid Azure and Kubernetes credentials

## Build the Image

### Build locally

```bash
docker build -t aks-nodepool-monitor:latest .
```

### Build with a specific tag

```bash
docker build -t aks-nodepool-monitor:1.0.0 .
```

### Build with BuildKit (faster, better caching)

```bash
DOCKER_BUILDKIT=1 docker build -t aks-nodepool-monitor:latest .
```

## Run the Container

The container requires:
- Azure credentials (via `az login` or environment variables)
- Kubernetes credentials (kubeconfig)

### Option 1: Using Docker with mounted credentials

```bash
docker run --rm \
  -e AZURE_SUBSCRIPTION_ID="your-subscription-id" \
  -e AKS_RESOURCE_GROUP="your-resource-group" \
  -e AKS_CLUSTER_NAME="your-cluster-name" \
  -v ~/.kube/config:/root/.kube/config:ro \
  -v ~/.azure:/root/.azure:ro \
  -v $(pwd)/reports:/app/reports \
  aks-nodepool-monitor:latest
```

### Option 2: Using Docker Compose (recommended for local testing)

1. Set up your environment file:

```bash
cp .env.example .env.docker
# Edit .env.docker with your values
cat .env.docker
```

Example `.env.docker`:
```env
AZURE_SUBSCRIPTION_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AKS_RESOURCE_GROUP=my-resource-group
AKS_CLUSTER_NAME=my-cluster
REPORT_PATH=/app/reports/report.json
PRINT_CONSOLE=true
```

2. Run with docker-compose:

```bash
docker-compose up --build
```

Or without rebuilding:

```bash
docker-compose up
```

### Option 3: Using Azure CLI authentication

If you have a local Azure CLI session, mount it into the container:

```bash
docker run --rm \
  -v ~/.azure:/root/.azure:ro \
  -v ~/.kube/config:/root/.kube/config:ro \
  -v $(pwd)/reports:/app/reports \
  -e AKS_RESOURCE_GROUP="my-resource-group" \
  -e AKS_CLUSTER_NAME="my-cluster" \
  aks-nodepool-monitor:latest
```

### Option 4: Interactive debugging

Enter a shell inside the container:

```bash
docker run --rm -it \
  -v ~/.kube/config:/root/.kube/config:ro \
  -v ~/.azure:/root/.azure:ro \
  --entrypoint /bin/sh \
  aks-nodepool-monitor:latest
```

Then run commands manually:

```bash
node dist/index.js --subscription-id xxx --resource-group yyy --cluster-name zzz
```

## Output and Reports

Reports are written to the path specified by `REPORT_PATH` (default: `report.json`).

To capture reports outside the container, mount a volume:

```bash
-v $(pwd)/reports:/app/reports
```

After the container exits, reports are available in your local `./reports` directory.

## Publishing to a Registry

### Docker Hub

```bash
docker tag aks-nodepool-monitor:latest your-username/aks-nodepool-monitor:latest
docker push your-username/aks-nodepool-monitor:latest
```

### GitHub Container Registry (GHCR)

```bash
docker tag aks-nodepool-monitor:latest ghcr.io/azer-tab/aks-nodepool-monitor:latest
docker login ghcr.io
docker push ghcr.io/azer-tab/aks-nodepool-monitor:latest
```

### Azure Container Registry (ACR)

```bash
az acr login --name your-acr-name
docker tag aks-nodepool-monitor:latest your-acr-name.azurecr.io/aks-nodepool-monitor:latest
docker push your-acr-name.azurecr.io/aks-nodepool-monitor:latest
```

## CI/CD Integration

### GitHub Actions Example

Add this workflow to `.github/workflows/docker-build.yml`:

```yaml
name: Build and Push Docker Image

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t image:${{ github.ref_name }} .

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Push to GHCR
        run: |
          docker tag image:${{ github.ref_name }} ghcr.io/azer-tab/aks-nodepool-monitor:${{ github.ref_name }}
          docker push ghcr.io/azer-tab/aks-nodepool-monitor:${{ github.ref_name }}
```

## Deployment to Kubernetes

While this tool is a CLI (not a long-running service), you can deploy it as a one-shot Pod or CronJob:

### One-shot Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: aks-monitor-job
spec:
  serviceAccountName: aks-monitor-sa
  containers:
    - name: aks-monitor
      image: aks-nodepool-monitor:latest
      env:
        - name: AZURE_SUBSCRIPTION_ID
          valueFrom:
            secretKeyRef:
              name: aks-monitor-secrets
              key: subscription-id
        - name: AKS_RESOURCE_GROUP
          value: "my-resource-group"
        - name: AKS_CLUSTER_NAME
          value: "my-cluster"
      volumeMounts:
        - name: reports
          mountPath: /app/reports
  volumes:
    - name: reports
      emptyDir: {}
  restartPolicy: Never
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aks-monitor-sa
```

### CronJob (periodic health checks)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: aks-monitor-daily
spec:
  schedule: "0 8 * * *"  # Daily at 8 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: aks-monitor-sa
          containers:
            - name: aks-monitor
              image: aks-nodepool-monitor:latest
              env:
                - name: AKS_RESOURCE_GROUP
                  value: "my-resource-group"
                - name: AKS_CLUSTER_NAME
                  value: "my-cluster"
                - name: REPORT_PATH
                  value: "/app/reports/report-$(date +%Y%m%d).json"
              volumeMounts:
                - name: reports
                  mountPath: /app/reports
          volumes:
            - name: reports
              persistentVolumeClaim:
                claimName: aks-monitor-reports-pvc
          restartPolicy: OnFailure
```

## Troubleshooting

### "Azure authentication failure"

Ensure your Azure credentials are mounted and valid:

```bash
docker run --rm \
  -v ~/.azure:/root/.azure:ro \
  --entrypoint az \
  aks-nodepool-monitor:latest \
  account show
```

### "kubectl: not found" or connection errors

Ensure your kubeconfig is mounted:

```bash
docker run --rm \
  -v ~/.kube/config:/root/.kube/config:ro \
  --entrypoint kubectl \
  aks-nodepool-monitor:latest \
  config current-context
```

### Image size is too large

The production image includes `azure-cli` and `kubectl` for convenience. If you want a minimal image:

1. Use the base Node.js image without these tools
2. Have users provide them on the host and mount `/usr/local/bin`

Let me know if you'd like a minimal variant.

### Permission denied errors

Some Docker hosts restrict certain operations. Try running with `--cap-add=NET_RAW` if needed:

```bash
docker run --rm --cap-add=NET_RAW \
  -v ~/.kube/config:/root/.kube/config:ro \
  aks-nodepool-monitor:latest
```

## Image Size Optimization

Current image includes:
- Node.js runtime (~180 MB)
- Azure CLI (~300 MB)
- kubectl (~150 MB)

Total: ~630 MB

To reduce, consider:
- Using a distroless Node.js image (saves ~50 MB)
- Removing development dependencies (already done with `--only=production`)
- Using a separate sidecar pattern in Kubernetes for Azure/k8s binaries

## Next Steps

1. **Test locally**: `docker build -t test . && docker-compose up`
2. **Push to registry**: Publish to Docker Hub, GHCR, or ACR
3. **Set up CI/CD**: GitHub Actions workflow to auto-build on releases
4. **Deploy to Kubernetes**: Use the Pod or CronJob manifests above
