import { AzureClient } from '../utils/azure-client';
import { AzureData } from '../models/azure-data';

export class AzureCollector {
    private azureClient: AzureClient;

    constructor() {
        this.azureClient = new AzureClient();
    }

    async collectNodepoolData(aksResourceGroup: string, aksName: string): Promise<AzureData> {
        const nodepoolData = await this.azureClient.getNodepoolData(aksResourceGroup, aksName);
        const subnetData = await this.azureClient.getSubnetData(aksResourceGroup, aksName);

        return {
            nodepools: nodepoolData,
            subnet: subnetData,
        };
    }

    async collectVNetData(vnetName: string, resourceGroup: string) {
        const vnetData = await this.azureClient.getVNetData(vnetName, resourceGroup);
        return vnetData;
    }

    async collectRecentFailures(aksResourceGroup: string, aksName: string) {
        const failures = await this.azureClient.getRecentProvisioningFailures(aksResourceGroup, aksName);
        return failures;
    }
}