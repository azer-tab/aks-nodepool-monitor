export interface AKSNodePool {
  id?: string;
  name: string;
  provisioningState?: string;
  count?: number;
  maxPods?: number;
  vnetSubnetID?: string;
  enableAutoScaling?: boolean;
  minCount?: number;
  maxCount?: number;
  autoscalerSettings?: {
    enabled: boolean;
    minCount?: number;
    maxCount?: number;
  };
}

export interface VNetSubnet {
  id: string;
  cidr?: string;
  addressPrefix?: string;
  ipConfigurations?: unknown[];
  reservedIPs?: number;
  usableIPs?: number;
}

export interface SubnetUsage {
  subnetId: string;
  usedIPConfigs: number;
  remainingUsableIPs: number;
}

export interface RecentProvisioningFailure {
  nodePoolName: string;
  nodepoolId?: string;
  errorMessage: string;
  timestamp: Date;
}

export interface AzureData {
  nodePools: AKSNodePool[];
  subnets: VNetSubnet[];
  subnetUsages: SubnetUsage[];
  recentFailures: RecentProvisioningFailure[];
}
