export class KubectlClient {
    private kubectlPath: string;

    constructor(kubectlPath: string = 'kubectl') {
        this.kubectlPath = kubectlPath;
    }

    public async getDeploymentsWithReplicasOne(namespace: string): Promise<any[]> {
        const command = `${this.kubectlPath} get deployments -n ${namespace} -o json`;
        const result = await this.executeCommand(command);
        const deployments = result.items || [];
        return deployments.filter((deployment: any) => deployment.spec.replicas === 1);
    }

    public async getPodDisruptionBudgets(namespace: string): Promise<any[]> {
        const command = `${this.kubectlPath} get poddisruptionbudgets -n ${namespace} -o json`;
        const result = await this.executeCommand(command);
        return result.items || [];
    }

    public async getNodesPerAgentPool(): Promise<any[]> {
        const command = `${this.kubectlPath} get nodes -o json`;
        const result = await this.executeCommand(command);
        return result.items || [];
    }

    private async executeCommand(command: string): Promise<any> {
        const { exec } = require('child_process');
        return new Promise((resolve, reject) => {
            exec(command, { json: true }, (error: any, stdout: string, stderr: string) => {
                if (error) {
                    reject(`Error executing command: ${stderr}`);
                } else {
                    resolve(JSON.parse(stdout));
                }
            });
        });
    }
}