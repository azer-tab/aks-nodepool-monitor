import { DefaultAzureCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
import { ContainerServiceClient } from '@azure/arm-containerservice';
import { NetworkManagementClient } from '@azure/arm-network';

export class AzureClient {
    private resourceClient: ResourceManagementClient;
    private aksClient: ContainerServiceClient;
    private networkClient: NetworkManagementClient;

    constructor(subscriptionId: string) {
        const credentials = new DefaultAzureCredential();
        this.resourceClient = new ResourceManagementClient(credentials, subscriptionId);
        this.aksClient = new ContainerServiceClient(credentials, subscriptionId);
        this.networkClient = new NetworkManagementClient(credentials, subscriptionId);
    }

    async getAksNodePools(resourceGroupName: string, clusterName: string) {
        return await this.aksClient.agentPools.list(resourceGroupName, clusterName);
    }

    async getVNetAndSubnets(resourceGroupName: string, vnetName: string) {
        return await this.networkClient.virtualNetworks.get(resourceGroupName, vnetName);
    }

    async getSubnetDetails(resourceGroupName: string, vnetName: string, subnetName: string) {
        return await this.networkClient.subnets.get(resourceGroupName, vnetName, subnetName);
    }

    async listNetworkInterfaces(resourceGroupName: string) {
        return await this.networkClient.networkInterfaces.list(resourceGroupName);
    }
}