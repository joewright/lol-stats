(function() {
	'use strict';
	// TODO: give up on plain js and use jsx
	// createElement shortcut
	const el = React.createElement;

	// Define the Match container
	class Match extends React.Component {
		render() {
			var divider = el('hr');
			
			var summoner = el('h3', null, this.props.match.summoner.name);
			var outcome = el('p', null, `Outcome: ${this.props.match.outcome}`);
			var duration = el('p', null, `Game Duration: ${this.props.match.duration}`);
			
			var spellsTitle = el('strong', null, 'Spells');
			var spells = el('ul', null, this.props.match.summoner.spells.map(spell => {
				return el('li', null, spell);
			}));

			var runes = el('p', null, [
				el('strong', null, 'Runes:'), 
				el('span', null, ' N/A')]);

			var champion = el('div', null, [
				el('strong', null, 'Champion:'), 
				el('span', null, ` ${this.props.match.champion.name}, Level ${this.props.match.champion.level}`)]);

			var kda = el('p', null, `KDA: ${this.props.match.kda}`);

			var itemsTitle = el('strong', null, 'Items');
			var items = el('ul', null, this.props.match.items.map(item => {
				return el('li', null, item);
			}));

			var creepScore = el('p', null, `Total creep score: ${this.props.match.totalCreepScore}`);
			var creepsPerMinute = el('p', null, `Creeps per minute: ${this.props.match.creepScorePerMinute}`);

			var childComponents = [divider, summoner, outcome, duration, spellsTitle, 
				spells, runes, champion, kda, creepScore, creepsPerMinute];

			if (this.props.match.items.length) {
				childComponents.push(itemsTitle);
				childComponents.push(items);
			}

			return el('div', null, childComponents);
		}
	}

	// Make a form to enter summoner name
	class SummonerForm extends React.Component {
		constructor(props) {
			super(props);
			this.state = {
				// set a default summoner name
				value: 'ayyjoewrong'
			};
			this.handleChange = this.handleChange.bind(this);
		}

		handleChange(event) {
			this.setState({
				value: event.target.value
			});
		}

		handleSubmit() {
			this.props.refresh(this.state.value);
		}

		render() {
			var label = el('label', {
				for: 'summoner'
			}, 'Get stats for summoner: ');
			var input = el('input', {
				name: 'summoner',
				value: this.state.value,
				type: 'text',
				onChange: this.handleChange
			});
			var reload = el(ReloadButton, {
				refresh: () => {
					this.handleSubmit();
				}
			});
			return el('div', this.props, [label, input, reload]);
		}
	}

	// Main App
	class App extends React.Component {
		constructor(props) {
			super(props);
			this.state = {
				matches: props.matches,
				summoner: props.summoner
			};
		}
		handleRefresh(summoner) {
			getMatches(summoner, (err, data) => {
				this.state.matches = data.matches;
			});
		}
		render() {
			var summonerForm = el(SummonerForm, {
				refresh: (summoner) => {
					this.handleRefresh(summoner);
				}
			});
			var matches = this.state.matches.map((match) => {
				return el(Match, {
					match: match
				});
			});
			matches = matches.concat(matches);
			var components = [summonerForm, matches];
			return el('div', null, components);
		}
	}

	// get the initial match data
	getMatches('ayyjoewrong', (err, data) => {
		ReactDOM.render(
			el(App, data, null),
			document.getElementById('app'));
	});

	function ReloadButton(props) {
		return el('button', {
			onClick: props.refresh
		}, 'Refresh');
	}

	function getMatches(summoner, done) {
		Request({
			url: '/lol/matches',
			method: 'POST',
			data: {
				summoner: summoner
			}
		}, (err, data) => {
			// TODO: better error handling
			if (err) {
				throw new Error(err);
			}
			done(err, data);
		});
	}

	function Request(options, done) {
		options = options || {};
		options.method = options.method || 'GET';

		var xhr = new XMLHttpRequest();
		xhr.open(options.method, options.url, true);
		xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');

		xhr.onreadystatechange = function() {
			if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
				var data = JSON.parse(this.response);
				done(null, data);
			} else if (this.readyState === XMLHttpRequest.DONE && this.status !== 200) {
				done({
					status: this.status,
					error: 'Something blew up',
					response: this.response
				});
			}
		};
		var data;
		if (options.data) {
			data = JSON.stringify(options.data);
		}
		xhr.send(data);
	}
})();