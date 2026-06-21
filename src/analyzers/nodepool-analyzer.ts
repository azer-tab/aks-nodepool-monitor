import { AzureCollector } from '../collectors/azure-collector';
import { KubernetesCollector } from '../collectors/kubernetes-collector';
import { AKSNodePool, RecentProvisioningFailure } from '../models/azure-data';

export class NodepoolAnalyzer {
  constructor(
    private readonly azureCollector: AzureCollector,
    private readonly kubernetesCollector?: KubernetesCollector
  ) {}

  public async analyze(): Promise<any[]> {
    return this.analyzeNodepools();
  }

  public async analyzeNodepools(): Promise<any[]> {
    const nodepools: AKSNodePool[] = await this.azureCollector.getNodepools();
    const recentFailures: RecentProvisioningFailure[] = await this.azureCollector.getRecentProvisioningFailures();

    return nodepools.map((nodepool: AKSNodePool) => {
      const failure = recentFailures.find((f: RecentProvisioningFailure) =>
        f.nodePoolName === nodepool.name || f.nodepoolId === nodepool.id
      );

      return {
        nodepoolId: nodepool.id ?? nodepool.name,
        name: nodepool.name,
        provisioningState: nodepool.provisioningState ?? 'Unknown',
        count: nodepool.count ?? 0,
        maxPods: nodepool.maxPods ?? 0,
        autoscalerSettings: nodepool.autoscalerSettings ?? {
          enabled: Boolean(nodepool.enableAutoScaling),
          minCount: nodepool.minCount,
          maxCount: nodepool.maxCount
        },
        recentFailure: failure?.errorMessage ?? null
      };
    });
  }
}
