import { KubernetesData, NodeSummary } from '../collectors/kubernetes-collector';

export class ResilienceAnalyzer {
  constructor(private readonly kubernetesData: KubernetesData) {}

  public analyze() {
    return {
      deploymentsWithSingleReplica: this.kubernetesData.deployments,
      podDisruptionBudgets: this.kubernetesData.pdbs,
      nodesPerAgentPool: this.mapNodesToAgentPools()
    };
  }

  private mapNodesToAgentPools(): Record<string, number> {
    const nodePoolMapping: Record<string, number> = {};

    this.kubernetesData.nodes.forEach((node: NodeSummary) => {
      const poolName = node.labels.agentpool ?? node.labels['kubernetes.azure.com/agentpool'] ?? 'unknown';
      nodePoolMapping[poolName] = (nodePoolMapping[poolName] || 0) + 1;
    });

    return nodePoolMapping;
  }
}
