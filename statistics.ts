module Statistics {
    export class Tracker {
        public static bestAgentName: string;
        public static bestAgentGeneString: string;
        public static bestAgentFitness: number = -1;

        public static logAgent(name: string, geneString: string, fitness: number) {
            if (fitness > this.bestAgentFitness) {
                this.bestAgentName = name;
                this.bestAgentGeneString = geneString;
                this.bestAgentFitness = fitness;
            }
        }
    }
} 