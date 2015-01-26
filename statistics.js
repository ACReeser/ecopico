var Statistics;
(function (Statistics) {
    var Tracker = (function () {
        function Tracker() {
        }
        Tracker.logAgent = function (name, geneString, fitness) {
            if (fitness > this.bestAgentFitness) {
                this.bestAgentName = name;
                this.bestAgentGeneString = geneString;
                this.bestAgentFitness = fitness;
            }
        };
        Tracker.bestAgentFitness = -1;
        return Tracker;
    })();
    Statistics.Tracker = Tracker;
})(Statistics || (Statistics = {}));
