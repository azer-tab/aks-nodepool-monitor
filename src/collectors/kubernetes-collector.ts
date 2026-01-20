import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class KubernetesCollector {
    async collect() {
        const deployments = await this.getDeploymentsWithReplicasOne();
        const pdbs = await this.getPodDisruptionBudgets();
        const nodes = await this.getNodes();

        return {
            deployments,
            pdbs,
            nodes,
        };
    }

    private async getDeploymentsWithReplicasOne() {
        const { stdout } = await execAsync('kubectl get deployments --all-namespaces -o json');
        const deployments = JSON.parse(stdout).items;
        return deployments.filter(deployment => deployment.spec.replicas === 1).map(deployment => ({
            name: deployment.metadata.name,
            namespace: deployment.metadata.namespace,
        }));
    }

    private async getPodDisruptionBudgets() {
        const { stdout } = await execAsync('kubectl get pdb --all-namespaces -o json');
        const pdbs = JSON.parse(stdout).items;
        return pdbs.map(pdb => ({
            name: pdb.metadata.name,
            namespace: pdb.metadata.namespace,
            minAvailable: pdb.spec.minAvailable,
        }));
    }

    private async getNodes() {
        const { stdout } = await execAsync('kubectl get nodes -o json');
        const nodes = JSON.parse(stdout).items;
        return nodes.map(node => ({
            name: node.metadata.name,
            labels: node.metadata.labels,
            status: node.status.conditions.find(condition => condition.type === 'Ready').status,
        }));
    }
}