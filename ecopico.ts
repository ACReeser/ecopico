/// <reference path="Statistics.ts" />

interface Named {
	name: string;
}

interface Individual extends Named {
	getGenotype(): Genotype;
	getFitness(): number;
}

interface Resource extends Named {
	isHazard: boolean;
	harvest(a: Agent);
	improve(a: Agent);
	getImproveCost(): number;
}

class RuntimeFactory {
	static create<T>(className: string, instanceParameters) : T{
		var newInstance = Object.create(window[className].prototype);
		newInstance.constructor.apply(newInstance, instanceParameters);
		return newInstance;
	}
}

class World {
	private map: Resource[] = [];
	private players: Agent[] = [];
	private threadID: number;
	private currentGeneration: number = 1;
	private populationLifetime: number;
	private run: number = 1;
	private mutationRisk = .1;
	constructor(public log: Log, public runtime:number, private initialPopulation:number, private generationLifetime: number) {
		log.out("Simulation Start", "h2");
		for(var i = 0; i < initialPopulation; i++){
			this.players.push(new Agent());
		}
		
		this.generateMap();
		
		this.populationLifetime = generationLifetime;
		this.threadID = setInterval(this.tick.bind(this), 500);
	}
    closestResource(): Resource{
        this.log.selectMapTile((this.generationLifetime - this.populationLifetime ) % (this.map.length / 2));
        return this.map[this.generationLifetime - this.populationLifetime];
	}
	generateMap(){
		this.map = [];		
		for(var i = 0; i < this.generationLifetime / 2; i++){
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
    }
    renderMap() {
        while (log.mapDiv.firstChild) {
            log.mapDiv.removeChild(log.mapDiv.firstChild);
        }
        log.mapOut("Map", "h2");
        for (var i = 0; i < this.map.length; i++) {
            var resource = this.map[i];
            log.mapOut(resource.name, "div", "tile resource-"+resource.name.toLowerCase());
        }
    }
	generateGeneration(){
		this.log.out("Repopulating", "h3");
		var mindex: number = -1;
		var min: number = 999;
		for(var i = 0; i < this.players.length; i++){
			if (this.players[i].getFitness() < min){
				mindex = i;
				min = this.players[i].getFitness();	
			}
			
            this.log.out(this.players[i].geneString());
		}
		for(var i = this.players.length - 1; i > 0; i--){
			if (this.players[i].getFitness() <= min)
				this.players.splice(i, 1);
		}
		var survivingCount = this.players.length;
		var newPlayers = [];
		for(var i = 0; i < this.initialPopulation; i++){
			var mom: Individual = this.players[Math.round(Math.random()*(survivingCount-1))];
			var dad: Individual = this.players[Math.round(Math.random()*(survivingCount-1))];
			newPlayers.push(new Agent(dad, mom));
		}
		this.players = newPlayers;
    } 
    evaluateGeneration() {
        this.players.forEach(p => {
            Statistics.Tracker.logAgent(p.name, p.geneString(), p.getFitness());
        });		
        this.log.out("Best Agent: " + Statistics.Tracker.bestAgentName + ": ¢" + Statistics.Tracker.bestAgentFitness, "h3");
        this.log.out("Best Genes: " + Statistics.Tracker.bestAgentGeneString, "h3");
    }
	tick(){
		this.log.out("Turn #"+(this.run), "h4");
        var statuses = [];
        this.log.out("Current tile: "+this.closestResource().name, "p")
		this.players.forEach(p => {
			statuses.push(p.tick(this, this.log));	
		});		
		statuses.forEach(s =>{
			this.log.out(s, "span");
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
			this.log.out("Beginning generation "+this.currentGeneration, "h3")
		}
		
	}
}

// exposes properties for expression (name, value) and inheritance (dominant, recessive)
class Gene implements Named{
	static geneNames: string[] = ["shy", "aggression", "intelligence", "curiosity"];
	public dominant: boolean = true;
    public degree: number;
    public multiple: boolean = false;
	get isDominant(): boolean{
		return this.dominant;
	}
	get isRecessive(): boolean{
		return !this.dominant;
	}
	constructor(public name: string, 
				       rawValue: string,
				public dominantExpression:any,
				public recessiveExpression: any){
		this.dominant = rawValue[0] === rawValue[0].toUpperCase();
	}
	static create(name: string, chromatin: string): Gene{
		return RuntimeFactory.create<Gene>(name, [name, chromatin]);
	}
}
class ShyGene extends Gene{
	constructor(public name: string, 
				       rawValue: string){
        super(name, rawValue, false, true);
	}
}
class AggressionGene extends Gene{
	constructor(public name: string, 
                       rawValue: string){
        super(name, rawValue, true, false);
	}
}
class CuriosityGene extends Gene{
	constructor(public name: string, 
                       rawValue: string){
        super(name, rawValue, false, true);
	}
}
class IntelligenceGene extends Gene{
    constructor(public name: string,
                       rawValue: string) {
        super(name, rawValue, false, true);
	}
}
// idea: a 'curiousity' gene that controls whether or not an individual interacts with the mutator resource

// a chromosome is a collection of loci (a string:Gene map)
class Chromosome{
	public geneMap: Object = {};
	constructor(rawChromatin? : string){
		var values;
		if (rawChromatin){
			values = rawChromatin.split("|");
		} else {
			values = null;	
		}
		for(var i = 0; i < Gene.geneNames.length; i++){			
			// todo: move this to gene.create
			// todo: actually reference inherited chromatin from the rawChromatin/values collection
            var typeName: string = Gene.geneNames[i].substr(0, 1).toUpperCase() + Gene.geneNames[i].substring(1) + "Gene";	
            var rawValue: string;
            if (values == null) {
                // by default, 50% chance to have either dominant or recessive gene
                rawValue = (Math.random() > .5) ? "D" : "d";
            } else {
                rawValue = values[i];
            }
			this.geneMap[Gene.geneNames[i]] = Gene.create(typeName,  rawValue);
		}
	}
	mutate(){
		
	}
	getChromatin(geneName: string): string{
		var output: string = "";
		// output += this.geneMap[geneName].value + ":";
		output += (this.geneMap[geneName].isDominant ? "D" : "d");
		return output;
	}
}

// a genotype holds two chromosomes and exposes the GeneExpression API for phenotypes
class Genotype{
	private chromosomeA: Chromosome;
	private chromosomeB: Chromosome;
	private phenotype: Object = {};
	constructor(environmentalMutationRisk: number, parentA?: Individual, parentB?: Individual){
		var chrA: string;
		var chrB: string;
		// upon creation, either inherit randomly from parental genotypes
		if (parentA && parentB){
			var gA: Genotype = parentA.getGenotype();
			var gB: Genotype = parentB.getGenotype();
			// extract the chromatin
			chrA = gA.getChromatin();
			chrB = gB.getChromatin();
		}
		// or randomly create a new genotype
		// finalize with some transposition
		if (Math.random() < environmentalMutationRisk){
			// transpose
		}
        this.chromosomeA = new Chromosome(chrA);
		this.chromosomeB = new Chromosome(chrB);
		// and possibly randomly mutate a gene or two
		if (Math.random() < environmentalMutationRisk){
            if (Math.random() > .5) {
                this.chromosomeA.mutate();
            } else {
                this.chromosomeB.mutate();
            }
		}
	}
	expressedPhenotype(geneName: string){		
		var cachedPhenotype: any = this.phenotype[geneName];
        if (cachedPhenotype != null) {
            return cachedPhenotype;
        } else {
			var gA: Gene = this.chromosomeA.geneMap[geneName];
			// if it's dominant, it's expressed
			if (gA.isDominant){
				this.phenotype[geneName] = gA.dominantExpression;
			} else { 
				var gB: Gene = this.chromosomeB.geneMap[geneName];
				if (gB.isDominant){
					this.phenotype[geneName] = gB.dominantExpression;
				} else {
					this.phenotype[geneName] = gB.recessiveExpression;
				}
			}
			return this.phenotype[geneName];
		}
	}
	getChromatin(): string{
		var str = "";
		for(var i = 0; i < Gene.geneNames.length; i++){
            if (Math.random() > .5) {
                str += this.chromosomeA.getChromatin(Gene.geneNames[i]);
            } else {
                str += this.chromosomeB.getChromatin(Gene.geneNames[i]);
            }
			
            if (i < Gene.geneNames.length - 1) {
                str += "|";
            }
		}
		return str;
	}
	status(): string{
		var output: string = "";
		for(var i = 0; i < Gene.geneNames.length; i++){
			var thisName = Gene.geneNames[i];
			var left: Gene = this.chromosomeA.geneMap[thisName];
			var right: Gene = this.chromosomeB.geneMap[thisName];
			
			thisName = thisName.substr(0, 3);
			
            if (left.isRecessive && right.isRecessive) {
                output += thisName;
            } else if (left.isDominant && left.isDominant) {
                output += thisName.toUpperCase();
            } else {
                output += thisName[0].toUpperCase() + thisName.substr(1, 2);
            }
				
            if (i < Gene.geneNames.length - 1) {
                output += "|";
            }
		}
		return output;
	}
}

class Agent implements Named, Individual{
	cycles: number = 0;
	private genotype: Genotype;
	public name: string;
	get displayName(): string{
		return "<span style='color:darkblue;font-weight:bold'>"+this.name+"</span>";
	}
	static names: string[] = ["Lex", "Ram", "Car", "Dig", "Red", "Bin", "Ana", "Lib", "Sis", "Net", "Led", "Bus"];
	static getRandomName(): string {
		return Agent.names[Math.round(Math.random()*(Agent.names.length-1))];
	}
	static getLastName(name: string): string{
		var split: string[] = name.split(" ");
        if (split.length > 1) {
            return split[1];
        } else {
            return name;
        }
	}
	static getFamilyName(m: Individual, d: Individual){
		var mStr = Agent.getLastName(m.name);
        var dStr = Agent.getLastName(d.name);

        if (mStr.length > 3) {
            return dStr;
        }

		return dStr + mStr.toLowerCase();
	}
	constructor(private dad?: Individual, private mom?: Individual) {
		if (dad && mom){
			this.name = Agent.getRandomName() + " " + Agent.getFamilyName(mom, dad);
			this.genotype = new Genotype(.5, dad, mom);
		} else {
			this.name = Agent.getRandomName();
			this.genotype = new Genotype(.5);
		} 
	}
	getGenotype(){
		return this.genotype;
	}
	getFitness():number{
		return this.cycles;
	}
	status(): string{
        return ("| " + this.name + ": " + this.cycles + "¢ ");
	}
	geneString(): string{
		return ("| "+this.genotype.status()+" |");
	}
	tick(world: World, log:Log): string{
		if (this.genotype.expressedPhenotype("shy") && (Math.random() > .5)){
			log.out(this.displayName +" does not operate");
		} else {
			var r = world.closestResource();
			// log.out(this.displayName +" approaches a "+r.name);
			
			if (r.isHazard){
				if (this.genotype.expressedPhenotype("aggression") && this.cycles > r.getImproveCost()){
					r.improve(this);
					log.out(this.displayName + " attacks the " + r.name);
				} else {
					r.harvest(this);
					log.out(this.displayName + " is hurt by the " + r.name);
				}
			} else if (r instanceof Cycles) {			
				if (this.genotype.expressedPhenotype("intelligence") && this.cycles > r.getImproveCost()){
					r.improve(this);
					log.out(this.displayName + " improves the " + r.name);
				} else {
					r.harvest(this);
					log.out(this.displayName + " harvests the " + r.name);
				}
			} else {
				var harvestNotStore = Math.random() > .5;
				if (this.genotype.expressedPhenotype("intelligence") || harvestNotStore){
					r.harvest(this);
					log.out(this.displayName + " harvests the " + r.name);
				} else {
					r.improve(this);
					log.out(this.displayName + " improves the " + r.name);					
				}
			}
		}
		return this.status();
	}
}

class Cycles implements Resource{
	public isHazard: boolean = false;
	private harvestRate: number = 1;
	public name: string = "CPU";
    harvest(a: Agent) {
        a.cycles += this.harvestRate;
    }
	getImproveCost(): number{
		return this.harvestRate + 1;
	}
	improve(a: Agent){
		a.cycles -= this.getImproveCost();
		this.harvestRate++;
	}
}
class Memory implements Resource{
	public isHazard: boolean = false;
	private cache: number = 1;
	public name: string = "RAM";
    harvest(a: Agent) {
        a.cycles += this.cache;
		this.cache = 3;
    }
	getImproveCost(): number{
		return 999;
	}
	improve(a: Agent){
		this.cache++;

	}
}

class Trap implements Resource{
	public isHazard: boolean = true;
	private trapStack: number = Math.round(Math.random()*2)+1;
	public name: string = "Trap";
    harvest(a: Agent) {
        if (this.trapStack > 0 && Math.random() > .5) {
            a.cycles--;
        }
    }
	getImproveCost(): number{
		return this.trapStack;
	}
	improve(a: Agent){
		a.cycles--;
		this.trapStack--;
	}	
}

// idea: a resource that increases the mutation risk of an individual


class Log {
    public logDiv: HTMLDivElement;
    public mapDiv: HTMLDivElement;
    constructor(private centerDiv: Node) {
        this.logDiv = <HTMLDivElement>this.centerDiv.childNodes[1];
        this.mapDiv = <HTMLDivElement>this.centerDiv.childNodes[3];
    }
    mapOut(content: string, element?: string, classString?: string) {
        this.write(content, element || "div", classString || "", true);
    }
	out(content: string, element?: string, classString?: string){
        this.write(content, element || "div", classString || "", false);
    }
    private write(content: string, element: string, classString: string, toMap: boolean) {
        var newDiv = document.createElement(element);
        newDiv.innerHTML = content;
        newDiv.className = classString;
        if (toMap) {
            this.mapDiv.appendChild(newDiv);
        } else {
            this.logDiv.appendChild(newDiv);
        }
    }
    selectMapTile(index: number) {
        var oldSelecteds: NodeList = this.mapDiv.querySelectorAll(".current");
        if (oldSelecteds.length > 0) {
            var oldSelected: HTMLDivElement = <HTMLDivElement>oldSelecteds[0];
            oldSelected.classList.remove("current");
        }
        var newSelected: HTMLDivElement = <HTMLDivElement>this.mapDiv.querySelectorAll(".tile")[index];
        newSelected.classList.add("current");
    }
}

var log: Log = new Log(document.getElementsByClassName("center")[0]);
var world: World = new World(log, 48, 5, 8);