declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AZURE_SUBSCRIPTION_ID: string;
      AKS_RESOURCE_GROUP: string;
      AKS_CLUSTER_NAME: string;
    }
  }
}

export {}