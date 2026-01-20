export interface NodepoolReport {
    provisioningState: string;
    count: number;
    maxPods: number;
    autoscalerSettings: AutoscalerSettings;
    recentFailures: string[];
}

export interface AutoscalerSettings {
    enabled: boolean;
    minCount: number;
    maxCount: number;
}

export interface SubnetReport {
    cidr: string;
    totalIps: number;
    usedIps: number;
    remainingIps: number;
    recentFailures: string[];
}

export interface KubernetesReport {
    deploymentsWithSingleReplica: string[];
    podDisruptionBudgets: string[];
}

export interface Report {
    nodepool: NodepoolReport;
    subnet: SubnetReport;
    kubernetes: KubernetesReport;
    overallStatus: 'OK' | 'WARN' | 'CRIT';
    recommendedActions: string[];
}