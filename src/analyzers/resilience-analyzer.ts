export class ResilienceAnalyzer {
    private kubernetesData: any;

    constructor(kubernetesData: any) {
        this.kubernetesData = kubernetesData;
    }

    public analyze() {
        const results = {
            deploymentsWithSingleReplica: this.getDeploymentsWithSingleReplica(),
            podDisruptionBudgets: this.checkPodDisruptionBudgets(),
            nodesPerAgentPool: this.mapNodesToAgentPools(),
        };

        return results;
    }

    private getDeploymentsWithSingleReplica() {
        return this.kubernetesData.deployments.filter((deployment: any) => deployment.spec.replicas === 1);
    }

    private checkPodDisruptionBudgets() {
        return this.kubernetesData.namespaces.map((namespace: any) => {
            return {
                namespace: namespace.name,
                hasPDB: namespace.podDisruptionBudget ? true : false,
            };
        });
    }

    private mapNodesToAgentPools() {
        const nodePoolMapping: { [key: string]: number } = {};
        this.kubernetesData.nodes.forEach((node: any) => {
            const poolName = node.metadata.labels['agentpool'];
            nodePoolMapping[poolName] = (nodePoolMapping[poolName] || 0) + 1;
        });
        return nodePoolMapping;
    }
}