import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DeploymentSummary {
  name: string;
  namespace: string;
  replicas: number;
}

export interface PdbSummary {
  name: string;
  namespace: string;
  minAvailable?: string | number;
}

export interface NodeSummary {
  name: string;
  labels: Record<string, string>;
  status: string;
}

export interface KubernetesData {
  deployments: DeploymentSummary[];
  pdbs: PdbSummary[];
  nodes: NodeSummary[];
}

export class KubernetesCollector {
  async collect(): Promise<KubernetesData> {
    const deployments = await this.getDeploymentsWithReplicasOne();
    const pdbs = await this.getPodDisruptionBudgets();
    const nodes = await this.getNodes();
    return { deployments, pdbs, nodes };
  }

  private async getDeploymentsWithReplicasOne(): Promise<DeploymentSummary[]> {
    const { stdout } = await execAsync('kubectl get deployments --all-namespaces -o json');
    const deployments: any[] = JSON.parse(stdout).items ?? [];

    return deployments
      .filter((deployment: any) => deployment.spec?.replicas === 1)
      .map((deployment: any) => ({
        name: deployment.metadata?.name,
        namespace: deployment.metadata?.namespace,
        replicas: deployment.spec?.replicas ?? 0
      }));
  }

  private async getPodDisruptionBudgets(): Promise<PdbSummary[]> {
    const { stdout } = await execAsync('kubectl get pdb --all-namespaces -o json');
    const pdbs: any[] = JSON.parse(stdout).items ?? [];

    return pdbs.map((pdb: any) => ({
      name: pdb.metadata?.name,
      namespace: pdb.metadata?.namespace,
      minAvailable: pdb.spec?.minAvailable
    }));
  }

  private async getNodes(): Promise<NodeSummary[]> {
    const { stdout } = await execAsync('kubectl get nodes -o json');
    const nodes: any[] = JSON.parse(stdout).items ?? [];

    return nodes.map((node: any) => ({
      name: node.metadata?.name,
      labels: node.metadata?.labels ?? {},
      status: node.status?.conditions?.find((condition: any) => condition.type === 'Ready')?.status ?? 'Unknown'
    }));
  }
}
