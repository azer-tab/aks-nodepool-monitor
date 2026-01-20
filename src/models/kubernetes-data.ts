export interface Deployment {
    name: string;
    namespace: string;
    replicas: number;
    podDisruptionBudget?: PodDisruptionBudget;
}

export interface PodDisruptionBudget {
    name: string;
    namespace: string;
    minAvailable?: number;
    maxUnavailable?: number;
}

export interface Node {
    name: string;
    agentPool: string;
    status: string;
}

export interface KubernetesData {
    deployments: Deployment[];
    podDisruptionBudgets: PodDisruptionBudget[];
    nodes: Node[];
}