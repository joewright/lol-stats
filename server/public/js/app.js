(function() {
	'use strict';
	// createElement shortcut
	const el = React.createElement;

	// Define the Match container
	class Match extends React.Component {
		render() {
			return el('div', null, `Summoner: ${this.props.match.summoner.name}`);
		}
	}

	// Main App
	class App extends React.Component {
		constructor(props) {
			super(props);
			this.state = {
				matches: props.matches
			};
		}
		handleRefresh() {
			getMatches((err, data) => {
				this.state.matches = data.matches;
			});
		}
		render() {
			var matches = this.state.matches.map((match) => {
				return el(Match, {
					match: match
				});
			});
			var reloadButton = el(ReloadButton, {
				refresh: () => {
					this.handleRefresh();
				}
			});
			matches.unshift(reloadButton);
			return el('div', null, matches);
		}
	}

	// get the initial match data
	getMatches((err, data) => {
		ReactDOM.render(
			el(App, data, null),
			document.getElementById('app'));
	});

	function ReloadButton(props) {
		return el('button', {
			onClick: props.refresh
		}, 'Refresh');
	}

	function getMatches(done) {
		Request({
			url: '/lol/matches',
			method: 'POST',
			data: {
				summoner: 'Joe'
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
			}
		};
		var data;
		if (options.data) {
			data = JSON.stringify(options.data);
		}
		xhr.send(data);
	}
})();