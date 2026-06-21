import { AzureClient } from '../utils/azure-client';
import { AzureData, AKSNodePool, RecentProvisioningFailure } from '../models/azure-data';

export class AzureCollector {
  private azureClient: AzureClient;

  constructor(
    private readonly subscriptionId: string,
    private readonly aksResourceGroup: string,
    private readonly aksName: string
  ) {
    this.azureClient = new AzureClient(subscriptionId);
  }

  async collect(): Promise<AzureData> {
    const nodePools = await this.getNodepools();
    const subnets = await this.azureClient.getSubnetsForNodePools(nodePools);
    const recentFailures = await this.getRecentProvisioningFailures();

    const subnetUsages = subnets.map(subnet => {
      const cidr = subnet.addressPrefix ?? subnet.cidr ?? '0.0.0.0/32';
      const totalIps = this.calculateTotalIps(cidr);
      const usedIPConfigs = subnet.ipConfigurations?.length ?? 0;

      return {
        subnetId: subnet.id,
        usedIPConfigs,
        remainingUsableIPs: Math.max(totalIps - usedIPConfigs, 0)
      };
    });

    return { nodePools, subnets, subnetUsages, recentFailures };
  }

  async getNodepools(): Promise<AKSNodePool[]> {
    return this.azureClient.getAksNodePools(this.aksResourceGroup, this.aksName);
  }

  async getRecentProvisioningFailures(): Promise<RecentProvisioningFailure[]> {
    return this.azureClient.getRecentProvisioningFailures(this.aksResourceGroup, this.aksName);
  }

  private calculateTotalIps(cidr: string): number {
    const [, mask] = cidr.split('/');
    const subnetMask = Number(mask);
    if (!Number.isInteger(subnetMask) || subnetMask < 0 || subnetMask > 32) return 0;
    return Math.pow(2, 32 - subnetMask);
  }
}
