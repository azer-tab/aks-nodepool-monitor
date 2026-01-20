class ConsoleReporter {
    private status: string;
    private recommendedActions: string[];

    constructor(status: string, recommendedActions: string[]) {
        this.status = status;
        this.recommendedActions = recommendedActions;
    }

    public emitSummary(): void {
        console.log(`Status: ${this.status}`);
        console.log('Recommended Actions:');
        this.recommendedActions.forEach(action => {
            console.log(`- ${action}`);
        });
    }
}

export default ConsoleReporter;