/* eslint-env jquery */
/* global plugin */
plugin.loadCSS('../cpuload/cpuload');

class rLoadGraph {
	create(aOwner) {
		this.maxSeconds = 180;
		this.seconds = -1;
		this.startSeconds = new Date().getTime() / 1000;
		this.load = { label: null, data: [] };
		this._animationRequestId = 0;

		this.plot = $.plot(aOwner, this.data, this.options);
		aOwner.append($("<div>").attr("id", "meter-cpu-text").css({ top: 0 }));
	}

	update() {
		const plot = this.plot;
		const ph = plot.getPlaceholder();
		const pText = `${this.percent}%`;
		ph.attr("title", pText);
		$($$("meter-cpu-text")).text(pText);

		const opts = this.options;
		for (const [name, axis] of Object.entries(plot.getAxes())) {
			if (name in opts) {
				Object.assign(axis.options, opts[name]);
			}
		}

		const options = plot.getOptions();
		for (const [secName, sec] of Object.entries(opts)) {
			const secOpts = options[secName];
			for (const [k, v] of Object.entries(sec)) {
				secOpts[k] = v;
			}
		}

		plot.setData(this.data);
		plot.setupGrid();
		plot.draw();
	}

	get data() {
		return [this.load.data];
	}

	get percent() {
		const l = this.load.data.length;
		return l > 0 ? this.load.data[l - 1][1] : 0;
	}

	get options() {
		return {
			legend: {
				show: false,
			},
			colors: [
				new RGBackground()
					.setGradient(plugin.prgStartColor, plugin.prgEndColor, this.percent)
					.getColor(),
			],
			lines: {
				show: true,
				lineWidth: 1,
				fill: true,
			},
			points: { lineWidth: 0, radius: 0 },
			grid: {
				show: false,
			},
			xaxis: {
				max: Math.max(this.seconds, this.maxSeconds + this.startSeconds),
				noTicks: true,
			},
			shadowSize: 0,
			yaxis: {
				min: 0,
				noTicks: true,
			},
		};
	}

	draw() {
		if (!this._animationRequestId) {
			this._animationRequestId = window.requestAnimationFrame(() => {
				this._animationRequestId = 0;
				this.update();
			});
		}
	}

	addData(percent) {
		this.seconds = new Date().getTime() / 1000;
		this.load.data.push([this.seconds, percent]);
		const startSeconds = this.seconds - this.maxSeconds;
		this.load.data.splice(
			0,
			this.load.data.findIndex(([_, sec]) => sec >= startSeconds)
		);
		this.draw();
	}
}


class wbLoadGraph extends rLoadGraph {
	create(aOwner) {
		this.last = null;
		super.create(aOwner);
	}

	processData(proc) {
		if (this.last === null) {
			this.last = proc;
			return;
		}

		let used = 0,
			total = 0,
			i, il;

		for (i = 0, il = proc.length; i < il; ++i) {
			used += proc[i].system - this.last[i].system;
			used += proc[i].user - this.last[i].user;
			used += proc[i].nice - this.last[i].nice;
			total += proc[i].system - this.last[i].system;
			total += proc[i].user - this.last[i].user;
			total += proc[i].nice - this.last[i].nice;

			total += proc[i].idle - this.last[i].idle;
		}

		this.addData((100 * (used / total)).toFixed(2));

	}
}

plugin.check = function () {
	if (document.hidden || !navigator.onLine) {
		return;
	}

	fetch('/labs/stats?json=1').then(function (resp) {
		return resp.json();
	}).then(function (data) {
		plugin.graph.processData(data.cpu);
	});
};

plugin.init = function () {
	if (getCSSRule("#meter-cpu-holder")) {
		plugin.prgStartColor = new RGBackground("#99D699");
		plugin.prgEndColor = new RGBackground("#E69999");
		plugin.addPaneToStatusbar(
			"meter-cpu-pane",
			$("<table>")
				.append(
					$("<tbody>").append(
						$("<tr>").append(
							$("<td>").attr("id", "meter-cpu-td"),
							$("<td>").append($("<div>").attr("id", "meter-cpu-holder"))
						)
					)
				)
				.get(0)
		);
		plugin.graph = new wbLoadGraph();
		plugin.graph.create($("#meter-cpu-holder"));
		plugin.check();
		plugin.reqId = theRequestManager.addRequest("ttl", null, plugin.check);
		plugin.markLoaded();
	} else window.setTimeout(arguments.callee, 500);
};

plugin.onRemove = function () {
	plugin.removePaneFromStatusbar("meter-cpu-pane");
	theRequestManager.removeRequest("ttl", plugin.reqId);
};

plugin.init();
