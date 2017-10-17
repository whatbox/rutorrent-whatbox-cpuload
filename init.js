plugin.loadMainCSS();


//rLoadGraph
function rLoadGraph(){}

rLoadGraph.prototype.create = function( div ) {
	this.container = div;
	this.maxPoints = 180;
	this.cpuData = [];
	this.last = null;
};

rLoadGraph.prototype.draw = function( percent ) {
	var self = this;
	$(function(){
		if(self.container.height() && self.container.width()) {
			clearCanvas( self.container.get(0) );
			self.container.empty();

			$.plot(self.container, [ self.cpuData ], {
				legend: { show: false},
				lines: { show: true, lineWidth: 1, fill: true },
				colors: ['#99D699'],
				points: { lineWidth: 0, radius: 0 },
				grid: { borderWidth: 0, labelMargin: 0 },
				shadowSize: 0,
				xaxis: { show: false, noTicks: true },
				yaxis: { min: 0, /*max: 100,*/ show: false, noTicks: true }
			});

			self.container.append( $("<div>").attr("id","meter-cpu-text").text(percent.toFixed(2)+'%') ).attr("title", percent.toFixed(2)+'%');
		}
	}
	);
};

rLoadGraph.prototype.addData = function(percent) {
	this.cpuData.push([new Date().getTime(), percent]);

	while(this.cpuData.length > this.maxPoints) {
		this.cpuData.shift();
	}

	this.draw(percent);
};

rLoadGraph.prototype.processData = function(proc) {
	if (this.last === null) {
		this.last = proc;
		return;
	}

	var used  = 0,
		total = 0,
		i, il, j;

	for(i=0,il=proc.length;i<il;++i) {
		used  += proc[i].user-this.last[i].user;
		total += proc[i].user-this.last[i].user;
		used  += proc[i].nice-this.last[i].nice;
		total += proc[i].nice-this.last[i].nice;
		used  += proc[i].system-this.last[i].system;
		total += proc[i].system-this.last[i].system;

		total += proc[i].idle-this.last[i].idle;
	}

	this.addData(100*(used/total));
};


//Plugin stuff
plugin.init = function() {
	var box = $("<div>").attr("id","meter-cpu-holder");

	plugin.addPaneToStatusbar("meter-cpu-td", box.get(0));
	plugin.graph = new rLoadGraph();
	plugin.graph.create(box);

	plugin.check = function(){
		if (document.hidden) {
			return;
		}

	        if (typeof window.fetch === "function") {
	    		fetch('/labs/stats?json=1')
	    		.then(function (resp) { return resp.json(); })
	    		.then(function (data) {
	    			plugin.graph.processData(data[0]);
	    		});
	        } else {
	            $.getJSON('/labs/stats?json=1', function (data){
	                plugin.graph.processData(data[0]);
	            });
	        }
	};

	setInterval(function(){
		plugin.check();
	},10000);

	plugin.check();
	plugin.markLoaded();
};

plugin.onRemove = function() {
	plugin.removePaneFromStatusbar("meter-cpu-td");
};

plugin.init();
