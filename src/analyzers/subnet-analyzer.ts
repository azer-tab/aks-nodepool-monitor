import { AzureData } from '../models/azure-data';

export class SubnetAnalyzer {
  constructor(private readonly azureData: AzureData) {}

  public analyze() {
    return this.azureData.subnets.map(subnet => {
      const cidr = subnet.addressPrefix ?? subnet.cidr ?? '0.0.0.0/32';
      const totalIps = this.calculateTotalIps(cidr);
      const usedIps = subnet.ipConfigurations?.length ?? 0;

      return {
        subnetId: subnet.id,
        cidr,
        totalIps,
        usedIps,
        usableIps: Math.max(totalIps - usedIps, 0)
      };
    });
  }

  private calculateTotalIps(cidr: string): number {
    const [, mask] = cidr.split('/');
    const subnetMask = Number(mask);
    if (!Number.isInteger(subnetMask) || subnetMask < 0 || subnetMask > 32) return 0;
    return Math.pow(2, 32 - subnetMask);
  }
}
