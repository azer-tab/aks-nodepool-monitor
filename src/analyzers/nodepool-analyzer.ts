import { AzureCollector } from '../collectors/azure-collector';
import { KubernetesCollector } from '../collectors/kubernetes-collector';

export class NodepoolAnalyzer {
    private azureCollector: AzureCollector;
    private kubernetesCollector: KubernetesCollector;

    constructor(azureCollector: AzureCollector, kubernetesCollector: KubernetesCollector) {
        this.azureCollector = azureCollector;
        this.kubernetesCollector = kubernetesCollector;
    }

    public async analyzeNodepools() {
        const nodepools = await this.azureCollector.getNodepools();
        const recentFailures = await this.azureCollector.getRecentProvisioningFailures();

        const analysisResults = nodepools.map(nodepool => {
            const failure = recentFailures.find(f => f.nodepoolId === nodepool.id);
            return {
                nodepoolId: nodepool.id,
                provisioningState: nodepool.provisioningState,
                count: nodepool.count,
                maxPods: nodepool.maxPods,
                autoscalerSettings: nodepool.autoscalerSettings,
                recentFailure: failure ? failure.errorMessage : null,
            };
        });

        return analysisResults;
    }
}