import { DefaultAzureCredential } from '@azure/identity';
import { ContainerServiceClient } from '@azure/arm-containerservice';
import { NetworkManagementClient } from '@azure/arm-network';
import { AKSNodePool, RecentProvisioningFailure, VNetSubnet } from '../models/azure-data';

export class AzureClient {
  private aksClient: ContainerServiceClient;
  private networkClient: NetworkManagementClient;

  constructor(subscriptionId: string) {
    const credentials = new DefaultAzureCredential();
    this.aksClient = new ContainerServiceClient(credentials, subscriptionId);
    this.networkClient = new NetworkManagementClient(credentials, subscriptionId);
  }

  async getAksNodePools(resourceGroupName: string, clusterName: string): Promise<AKSNodePool[]> {
    const pools: AKSNodePool[] = [];

    for await (const pool of this.aksClient.agentPools.list(resourceGroupName, clusterName)) {
      const p = pool as AKSNodePool;
      pools.push({
        ...p,
        id: p.id ?? p.name,
        autoscalerSettings: {
          enabled: Boolean(p.enableAutoScaling),
          minCount: p.minCount,
          maxCount: p.maxCount
        }
      });
    }

    return pools;
  }

  async getSubnetDetails(resourceGroupName: string, vnetName: string, subnetName: string): Promise<VNetSubnet> {
    const subnet = await this.networkClient.subnets.get(resourceGroupName, vnetName, subnetName);
    return subnet as VNetSubnet;
  }

  async getSubnetsForNodePools(nodePools: AKSNodePool[]): Promise<VNetSubnet[]> {
    const subnets: VNetSubnet[] = [];
    const seen = new Set<string>();

    for (const pool of nodePools) {
      if (!pool.vnetSubnetID || seen.has(pool.vnetSubnetID)) continue;
      seen.add(pool.vnetSubnetID);

      const parsed = this.parseSubnetId(pool.vnetSubnetID);
      if (!parsed) continue;

      const subnet = await this.getSubnetDetails(parsed.resourceGroup, parsed.vnetName, parsed.subnetName);
      subnets.push(subnet);
    }

    return subnets;
  }

  async getRecentProvisioningFailures(
    _resourceGroupName: string,
    _clusterName: string
  ): Promise<RecentProvisioningFailure[]> {
    // Placeholder: Azure Activity Log querying can be added here later.
    return [];
  }

  private parseSubnetId(id: string): { resourceGroup: string; vnetName: string; subnetName: string } | null {
    const parts = id.split('/').filter(Boolean);
    const resourceGroupIndex = parts.findIndex(p => p.toLowerCase() === 'resourcegroups');
    const vnetIndex = parts.findIndex(p => p.toLowerCase() === 'virtualnetworks');
    const subnetIndex = parts.findIndex(p => p.toLowerCase() === 'subnets');

    if (resourceGroupIndex === -1 || vnetIndex === -1 || subnetIndex === -1) return null;

    return {
      resourceGroup: parts[resourceGroupIndex + 1],
      vnetName: parts[vnetIndex + 1],
      subnetName: parts[subnetIndex + 1]
    };
  }
}
