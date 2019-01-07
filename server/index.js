const port = process.env.PORT || 3000;
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const async = require('async');
const _ = require('lodash');

// set up league of legends api client
const {Kayn, REGIONS} = require('kayn');
const kayn = Kayn(process.env.RIOT_LOL_API_KEY)({region: REGIONS.NORTH_AMERICA});

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

// TODO: set cache exipiration, use a DB
// TODO: meaningful logging
var cache = {};

app.post('/lol/matches', bodyParser.json(), checkCache(), (req, res) => {
	if (!req.body.summoner) {
		return res.status(422).send({
			error: '"summoner" is required'
		});
	}

	const username = req.body.summoner;
	getMatchesByName(username, (err, result) => {
		if (err) {
			// TODO: some more useful error handling
			var errorData = {error: 'Unable to find state'};
			if (err.error && err.error.name) {
				errorData.name = err.error.name;
				errorData.message = err.error.message;
			}
			return res.status(404).send(errorData);
		}
		cache[username] = result;
		res.send(cache[username]);
	});
});

app.listen(port, () => {
	console.log(`Running on port ${port}`);
});

function checkCache() {
	return (req, res, next) => {
		const username = req.body.summoner;
		if (cache[username]) {
			return res.send(cache[username]);
		}
		next();
	};
}

function getMatchesByName(name, done) {
	var context = {};

	async.series([
		// get summoner
		function getSummoner(next) {
			kayn.SummonerV4.by.name(name)
				.then(summoner => {
					context.summoner = summoner;
					next();
				})
				.catch(next);
		},
		// get latest matches for context.summoner with details
		function getMatches(next) {
			kayn.MatchlistV4.getRecentMatchlistByAccountID(context.summoner.accountId)
				.then(matchList => {
					getMatchDetails(matchList, (err, details) => {
						context.champions = details.champions;
						context.matches = details.matches;
						context.spells = details.spells;

						next(err);
					});
				})
				.catch(next);
		}
	], err => {
		if (err) {
			return done(err);
		}

		// map match details to summoner/champion
		var result = {
			matches: context.matches.map(match => {
				return mapMatchWithContext(match, context);
			})
		};
		done(err, result);
	});
}

function mapMatchWithContext(match, context) {
	var foundParticipant = _.find(match.participantIdentities, (pId) => {
		return pId.player.accountId === context.summoner.accountId;
	});
	var participant = _.find(match.participants, {
		participantId: foundParticipant.participantId
	});

	var champion = _.find(context.champions, {
		id: '' + participant.championId
	});

	var hours = match.gameDuration / 3600;
	var minutes = (match.gameDuration % 3600) / 60;
	var seconds = match.gameDuration % 60;
	var duration = [hours, minutes, seconds].map(formatTime).join(':');
	// need this for creeps per minute
	var totalMinutes = match.gameDuration / 60;

	var items = _.chain(participant.stats)
		.pick(['item0', 'item1', 'item2', 'item3', 'item4', 'item5', 'item6'])
		.values()
		.compact().value();

	var spells = [participant.spell1Id, participant.spell2Id].map(id => {
		return context.spells[id] || id;
	});

	// map the match data using the local data context
	var mapped = {
		outcome: participant.stats.win ? 'Victory' : 'Defeat',
		duration: duration,
		summoner: {
			name: context.summoner.name,
			spells: spells,
			// TODO: find rune data for match; learn about runes in this game
			runes: []
		},
		champion: {
			name: champion.name,
			level: participant.stats.champLevel
		},
		kda: [participant.stats.kills, participant.stats.deaths, participant.stats.assists].join('/'),
		items: items,
		// minion stats
		totalCreepScore: participant.stats.totalMinionsKilled,
		creepScorePerMinute: Math.floor(participant.stats.totalMinionsKilled / totalMinutes)
	};
	return mapped;
}

function formatTime(val) {
	return ('0' + Math.floor(val)).slice(-2);
}

function getMatchDetails(matchList, done) {
	var details = {
		champions: [],
		matches: [],
		spells: {}
	};
	// list of champion IDs to retrieve
	var champions = _.chain(matchList.matches)
		.map('champion')
		.uniq().value();

	async.parallel([
		// get champions
		function getChampions(next) {
			kayn.DDragon.Champion.listDataByIdWithParentAsId()
				.then(championsById => {
					details.champions = champions.map(champId => {
						return championsById.data[champId];
					});
					next();
				})
				.catch(next);
		},
		// get spells
		function getSpells(next) {
			kayn.DDragon.SummonerSpell.list()
				.then(spells => {
					var spellsById = {};
					_.values(spells.data).forEach(function(spell) {
						spellsById[spell.key] = spell.name;
					});
					details.spells = spellsById;
					next();
				})
				.catch(next);
		},
		// get match details
		function getMatchDetails(next) {
			async.eachLimit(matchList.matches, 2, (match, nextMatch) => {
				kayn.MatchV4.get(match.gameId)
					.then(matchDetail => {
						_.defaults(matchDetail, match);
						details.matches.push(matchDetail);
						nextMatch();
					})
					.catch(nextMatch);
			}, next);
		}
	], err => {
		done(err, details);
	});
}