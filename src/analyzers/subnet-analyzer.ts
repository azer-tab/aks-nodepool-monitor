export class SubnetAnalyzer {
    private subnetId: string;
    private usableIps: number;
    private totalIps: number;
    private usedIps: number;

    constructor(subnetId: string, totalIps: number, usedIps: number) {
        this.subnetId = subnetId;
        this.totalIps = totalIps;
        this.usedIps = usedIps;
        this.usableIps = totalIps - usedIps;
    }

    public analyze(): { subnetId: string; totalIps: number; usedIps: number; usableIps: number } {
        return {
            subnetId: this.subnetId,
            totalIps: this.totalIps,
            usedIps: this.usedIps,
            usableIps: this.usableIps,
        };
    }

    public static fromAzureData(subnetData: any): SubnetAnalyzer {
        const subnetId = subnetData.id;
        const totalIps = subnetData.addressPrefix ? this.calculateTotalIps(subnetData.addressPrefix) : 0;
        const usedIps = subnetData.ipConfigurations ? subnetData.ipConfigurations.length : 0;

        return new SubnetAnalyzer(subnetId, totalIps, usedIps);
    }

    private static calculateTotalIps(cidr: string): number {
        const parts = cidr.split('/');
        const subnetMask = parseInt(parts[1], 10);
        return Math.pow(2, 32 - subnetMask);
    }
}