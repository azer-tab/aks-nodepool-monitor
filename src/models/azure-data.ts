export interface AKSNodePool {
    name: string;
    provisioningState: string;
    count: number;
    maxPods: number;
    autoscalerSettings?: {
        enabled: boolean;
        minCount: number;
        maxCount: number;
    };
}

export interface VNetSubnet {
    id: string;
    cidr: string;
    reservedIPs: number;
    usableIPs: number;
}

export interface SubnetUsage {
    subnetId: string;
    usedIPConfigs: number;
    remainingUsableIPs: number;
}

export interface RecentProvisioningFailure {
    nodePoolName: string;
    errorMessage: string;
    timestamp: Date;
}

export interface AzureData {
    nodePools: AKSNodePool[];
    subnets: VNetSubnet[];
    subnetUsages: SubnetUsage[];
    recentFailures: RecentProvisioningFailure[];
}