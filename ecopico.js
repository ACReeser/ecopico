/// <reference path="Statistics.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var RuntimeFactory = (function () {
    function RuntimeFactory() {
    }
    RuntimeFactory.create = function (className, instanceParameters) {
        var newInstance = Object.create(window[className].prototype);
        newInstance.constructor.apply(newInstance, instanceParameters);
        return newInstance;
    };
    return RuntimeFactory;
})();
var World = (function () {
    function World(log, runtime, initialPopulation, generationLifetime) {
        this.log = log;
        this.runtime = runtime;
        this.initialPopulation = initialPopulation;
        this.generationLifetime = generationLifetime;
        this.map = [];
        this.players = [];
        this.currentGeneration = 1;
        this.run = 1;
        this.mutationRisk = .1;
        log.out("Simulation Start", "h2");
        for (var i = 0; i < initialPopulation; i++) {
            this.players.push(new Agent());
        }
        this.generateMap();
        this.populationLifetime = generationLifetime;
        this.threadID = setInterval(this.tick.bind(this), 500);
    }
    World.prototype.closestResource = function () {
        this.log.selectMapTile((this.generationLifetime - this.populationLifetime) % (this.map.length / 2));
        return this.map[this.generationLifetime - this.populationLifetime];
    };
    World.prototype.generateMap = function () {
        this.map = [];
        for (var i = 0; i < this.generationLifetime / 2; i++) {
            var rand = Math.random();
            if (rand > .8)
                this.map.push(new Trap());
            else if (rand > .5)
                this.map.push(new Memory());
            else
                this.map.push(new Cycles());
        }
        this.renderMap();
        this.map = this.map.concat(this.map);
    };
    World.prototype.renderMap = function () {
        while (log.mapDiv.firstChild) {
            log.mapDiv.removeChild(log.mapDiv.firstChild);
        }
        log.mapOut("Map", "h2");
        for (var i = 0; i < this.map.length; i++) {
            var resource = this.map[i];
            log.mapOut(resource.name, "div", "tile resource-" + resource.name.toLowerCase());
        }
    };
    World.prototype.generateGeneration = function () {
        this.log.out("Repopulating", "h3");
        var mindex = -1;
        var min = 999;
        for (var i = 0; i < this.players.length; i++) {
            if (this.players[i].getFitness() < min) {
                mindex = i;
                min = this.players[i].getFitness();
            }
            this.log.out(this.players[i].geneString());
        }
        for (var i = this.players.length - 1; i > 0; i--) {
            if (this.players[i].getFitness() <= min)
                this.players.splice(i, 1);
        }
        var survivingCount = this.players.length;
        var newPlayers = [];
        for (var i = 0; i < this.initialPopulation; i++) {
            var mom = this.players[Math.round(Math.random() * (survivingCount - 1))];
            var dad = this.players[Math.round(Math.random() * (survivingCount - 1))];
            newPlayers.push(new Agent(dad, mom));
        }
        this.players = newPlayers;
    };
    World.prototype.evaluateGeneration = function () {
        this.players.forEach(function (p) {
            Statistics.Tracker.logAgent(p.name, p.geneString(), p.getFitness());
        });
        this.log.out("Best Agent: " + Statistics.Tracker.bestAgentName + ": ¢" + Statistics.Tracker.bestAgentFitness, "h3");
        this.log.out("Best Genes: " + Statistics.Tracker.bestAgentGeneString, "h3");
    };
    World.prototype.tick = function () {
        var _this = this;
        this.log.out("Turn #" + (this.run), "h4");
        var statuses = [];
        this.log.out("Current tile: " + this.closestResource().name, "p");
        this.players.forEach(function (p) {
            statuses.push(p.tick(_this, _this.log));
        });
        statuses.forEach(function (s) {
            _this.log.out(s, "span");
        });
        this.log.out("|", "span");
        this.run++;
        if (this.run > this.runtime) {
            this.evaluateGeneration();
            clearInterval(this.threadID);
            this.log.out("Simulation Finished", "h2");
            return;
        }
        this.populationLifetime--;
        if (this.populationLifetime === 0) {
            this.evaluateGeneration();
            this.generateGeneration();
            this.generateMap();
            this.currentGeneration++;
            this.populationLifetime = this.generationLifetime;
            this.log.out("Beginning generation " + this.currentGeneration, "h3");
        }
    };
    return World;
})();
// exposes properties for expression (name, value) and inheritance (dominant, recessive)
var Gene = (function () {
    function Gene(name, rawValue, dominantExpression, recessiveExpression) {
        this.name = name;
        this.dominantExpression = dominantExpression;
        this.recessiveExpression = recessiveExpression;
        this.dominant = true;
        this.multiple = false;
        this.dominant = rawValue[0] === rawValue[0].toUpperCase();
    }
    Object.defineProperty(Gene.prototype, "isDominant", {
        get: function () {
            return this.dominant;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Gene.prototype, "isRecessive", {
        get: function () {
            return !this.dominant;
        },
        enumerable: true,
        configurable: true
    });
    Gene.create = function (name, chromatin) {
        return RuntimeFactory.create(name, [name, chromatin]);
    };
    Gene.geneNames = ["shy", "aggression", "intelligence", "curiosity"];
    return Gene;
})();
var ShyGene = (function (_super) {
    __extends(ShyGene, _super);
    function ShyGene(name, rawValue) {
        _super.call(this, name, rawValue, false, true);
        this.name = name;
    }
    return ShyGene;
})(Gene);
var AggressionGene = (function (_super) {
    __extends(AggressionGene, _super);
    function AggressionGene(name, rawValue) {
        _super.call(this, name, rawValue, true, false);
        this.name = name;
    }
    return AggressionGene;
})(Gene);
var CuriosityGene = (function (_super) {
    __extends(CuriosityGene, _super);
    function CuriosityGene(name, rawValue) {
        _super.call(this, name, rawValue, false, true);
        this.name = name;
    }
    return CuriosityGene;
})(Gene);
var IntelligenceGene = (function (_super) {
    __extends(IntelligenceGene, _super);
    function IntelligenceGene(name, rawValue) {
        _super.call(this, name, rawValue, false, true);
        this.name = name;
    }
    return IntelligenceGene;
})(Gene);
// idea: a 'curiousity' gene that controls whether or not an individual interacts with the mutator resource
// a chromosome is a collection of loci (a string:Gene map)
var Chromosome = (function () {
    function Chromosome(rawChromatin) {
        this.geneMap = {};
        var values;
        if (rawChromatin) {
            values = rawChromatin.split("|");
        }
        else {
            values = null;
        }
        for (var i = 0; i < Gene.geneNames.length; i++) {
            // todo: move this to gene.create
            // todo: actually reference inherited chromatin from the rawChromatin/values collection
            var typeName = Gene.geneNames[i].substr(0, 1).toUpperCase() + Gene.geneNames[i].substring(1) + "Gene";
            var rawValue;
            if (values == null) {
                // by default, 50% chance to have either dominant or recessive gene
                rawValue = (Math.random() > .5) ? "D" : "d";
            }
            else {
                rawValue = values[i];
            }
            this.geneMap[Gene.geneNames[i]] = Gene.create(typeName, rawValue);
        }
    }
    Chromosome.prototype.mutate = function () {
    };
    Chromosome.prototype.getChromatin = function (geneName) {
        var output = "";
        // output += this.geneMap[geneName].value + ":";
        output += (this.geneMap[geneName].isDominant ? "D" : "d");
        return output;
    };
    return Chromosome;
})();
// a genotype holds two chromosomes and exposes the GeneExpression API for phenotypes
var Genotype = (function () {
    function Genotype(environmentalMutationRisk, parentA, parentB) {
        this.phenotype = {};
        var chrA;
        var chrB;
        // upon creation, either inherit randomly from parental genotypes
        if (parentA && parentB) {
            var gA = parentA.getGenotype();
            var gB = parentB.getGenotype();
            // extract the chromatin
            chrA = gA.getChromatin();
            chrB = gB.getChromatin();
        }
        // or randomly create a new genotype
        // finalize with some transposition
        if (Math.random() < environmentalMutationRisk) {
        }
        this.chromosomeA = new Chromosome(chrA);
        this.chromosomeB = new Chromosome(chrB);
        // and possibly randomly mutate a gene or two
        if (Math.random() < environmentalMutationRisk) {
            if (Math.random() > .5) {
                this.chromosomeA.mutate();
            }
            else {
                this.chromosomeB.mutate();
            }
        }
    }
    Genotype.prototype.expressedPhenotype = function (geneName) {
        var cachedPhenotype = this.phenotype[geneName];
        if (cachedPhenotype != null) {
            return cachedPhenotype;
        }
        else {
            var gA = this.chromosomeA.geneMap[geneName];
            // if it's dominant, it's expressed
            if (gA.isDominant) {
                this.phenotype[geneName] = gA.dominantExpression;
            }
            else {
                var gB = this.chromosomeB.geneMap[geneName];
                if (gB.isDominant) {
                    this.phenotype[geneName] = gB.dominantExpression;
                }
                else {
                    this.phenotype[geneName] = gB.recessiveExpression;
                }
            }
            return this.phenotype[geneName];
        }
    };
    Genotype.prototype.getChromatin = function () {
        var str = "";
        for (var i = 0; i < Gene.geneNames.length; i++) {
            if (Math.random() > .5) {
                str += this.chromosomeA.getChromatin(Gene.geneNames[i]);
            }
            else {
                str += this.chromosomeB.getChromatin(Gene.geneNames[i]);
            }
            if (i < Gene.geneNames.length - 1) {
                str += "|";
            }
        }
        return str;
    };
    Genotype.prototype.status = function () {
        var output = "";
        for (var i = 0; i < Gene.geneNames.length; i++) {
            var thisName = Gene.geneNames[i];
            var left = this.chromosomeA.geneMap[thisName];
            var right = this.chromosomeB.geneMap[thisName];
            thisName = thisName.substr(0, 3);
            if (left.isRecessive && right.isRecessive) {
                output += thisName;
            }
            else if (left.isDominant && left.isDominant) {
                output += thisName.toUpperCase();
            }
            else {
                output += thisName[0].toUpperCase() + thisName.substr(1, 2);
            }
            if (i < Gene.geneNames.length - 1) {
                output += "|";
            }
        }
        return output;
    };
    return Genotype;
})();
var Agent = (function () {
    function Agent(dad, mom) {
        this.dad = dad;
        this.mom = mom;
        this.cycles = 0;
        if (dad && mom) {
            this.name = Agent.getRandomName() + " " + Agent.getFamilyName(mom, dad);
            this.genotype = new Genotype(.5, dad, mom);
        }
        else {
            this.name = Agent.getRandomName();
            this.genotype = new Genotype(.5);
        }
    }
    Object.defineProperty(Agent.prototype, "displayName", {
        get: function () {
            return "<span style='color:darkblue;font-weight:bold'>" + this.name + "</span>";
        },
        enumerable: true,
        configurable: true
    });
    Agent.getRandomName = function () {
        return Agent.names[Math.round(Math.random() * (Agent.names.length - 1))];
    };
    Agent.getLastName = function (name) {
        var split = name.split(" ");
        if (split.length > 1) {
            return split[1];
        }
        else {
            return name;
        }
    };
    Agent.getFamilyName = function (m, d) {
        var mStr = Agent.getLastName(m.name);
        var dStr = Agent.getLastName(d.name);
        if (mStr.length > 3) {
            return dStr;
        }
        return dStr + mStr.toLowerCase();
    };
    Agent.prototype.getGenotype = function () {
        return this.genotype;
    };
    Agent.prototype.getFitness = function () {
        return this.cycles;
    };
    Agent.prototype.status = function () {
        return ("| " + this.name + ": " + this.cycles + "¢ ");
    };
    Agent.prototype.geneString = function () {
        return ("| " + this.genotype.status() + " |");
    };
    Agent.prototype.tick = function (world, log) {
        if (this.genotype.expressedPhenotype("shy") && (Math.random() > .5)) {
            log.out(this.displayName + " does not operate");
        }
        else {
            var r = world.closestResource();
            // log.out(this.displayName +" approaches a "+r.name);
            if (r.isHazard) {
                if (this.genotype.expressedPhenotype("aggression") && this.cycles > r.getImproveCost()) {
                    r.improve(this);
                    log.out(this.displayName + " attacks the " + r.name);
                }
                else {
                    r.harvest(this);
                    log.out(this.displayName + " is hurt by the " + r.name);
                }
            }
            else if (r instanceof Cycles) {
                if (this.genotype.expressedPhenotype("intelligence") && this.cycles > r.getImproveCost()) {
                    r.improve(this);
                    log.out(this.displayName + " improves the " + r.name);
                }
                else {
                    r.harvest(this);
                    log.out(this.displayName + " harvests the " + r.name);
                }
            }
            else {
                var harvestNotStore = Math.random() > .5;
                if (this.genotype.expressedPhenotype("intelligence") || harvestNotStore) {
                    r.harvest(this);
                    log.out(this.displayName + " harvests the " + r.name);
                }
                else {
                    r.improve(this);
                    log.out(this.displayName + " improves the " + r.name);
                }
            }
        }
        return this.status();
    };
    Agent.names = ["Lex", "Ram", "Car", "Dig", "Red", "Bin", "Ana", "Lib", "Sis", "Net", "Led", "Bus"];
    return Agent;
})();
var Cycles = (function () {
    function Cycles() {
        this.isHazard = false;
        this.harvestRate = 1;
        this.name = "CPU";
    }
    Cycles.prototype.harvest = function (a) {
        a.cycles += this.harvestRate;
    };
    Cycles.prototype.getImproveCost = function () {
        return this.harvestRate + 1;
    };
    Cycles.prototype.improve = function (a) {
        a.cycles -= this.getImproveCost();
        this.harvestRate++;
    };
    return Cycles;
})();
var Memory = (function () {
    function Memory() {
        this.isHazard = false;
        this.cache = 1;
        this.name = "RAM";
    }
    Memory.prototype.harvest = function (a) {
        a.cycles += this.cache;
        this.cache = 3;
    };
    Memory.prototype.getImproveCost = function () {
        return 999;
    };
    Memory.prototype.improve = function (a) {
        this.cache++;
    };
    return Memory;
})();
var Trap = (function () {
    function Trap() {
        this.isHazard = true;
        this.trapStack = Math.round(Math.random() * 2) + 1;
        this.name = "Trap";
    }
    Trap.prototype.harvest = function (a) {
        if (this.trapStack > 0 && Math.random() > .5) {
            a.cycles--;
        }
    };
    Trap.prototype.getImproveCost = function () {
        return this.trapStack;
    };
    Trap.prototype.improve = function (a) {
        a.cycles--;
        this.trapStack--;
    };
    return Trap;
})();
// idea: a resource that increases the mutation risk of an individual
var Log = (function () {
    function Log(centerDiv) {
        this.centerDiv = centerDiv;
        this.logDiv = this.centerDiv.childNodes[1];
        this.mapDiv = this.centerDiv.childNodes[3];
    }
    Log.prototype.mapOut = function (content, element, classString) {
        this.write(content, element || "div", classString || "", true);
    };
    Log.prototype.out = function (content, element, classString) {
        this.write(content, element || "div", classString || "", false);
    };
    Log.prototype.write = function (content, element, classString, toMap) {
        var newDiv = document.createElement(element);
        newDiv.innerHTML = content;
        newDiv.className = classString;
        if (toMap) {
            this.mapDiv.appendChild(newDiv);
        }
        else {
            this.logDiv.appendChild(newDiv);
        }
    };
    Log.prototype.selectMapTile = function (index) {
        var oldSelecteds = this.mapDiv.querySelectorAll(".current");
        if (oldSelecteds.length > 0) {
            var oldSelected = oldSelecteds[0];
            oldSelected.classList.remove("current");
        }
        var newSelected = this.mapDiv.querySelectorAll(".tile")[index];
        newSelected.classList.add("current");
    };
    return Log;
})();
var log = new Log(document.getElementsByClassName("center")[0]);
var world = new World(log, 48, 5, 8);
