const port = process.env.PORT || 3000;
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

// TODO: caching middleware
app.post('/lol/matches', bodyParser.json(), (req, res) => {
	if (!req.body.summoner) {
		return res.setStatus(422).send({
			error: '"summoner" is required'
		});
	}

	var durationMinutes = 44;
	var totalCreepScore = 120;
	var matches = [{
		outcome: 'Victory',
		durationMinutes: durationMinutes,
		summoner: {
			name: 'jimbo',
			spells: ['fire', 'ice'],
			runes: ['triangle'],
			kda: '5/10/1',
			items: ['potion', 'phoenix down'],
			level: 64,
			totalCreepScore: totalCreepScore,
			creepPerMinute: Math.floor(totalCreepScore / durationMinutes)
		},
	}];

	return res.send({
		total: matches.length,
		matches: matches
	});
});

app.listen(port, () => {
	console.log(`Running on port ${port}`);
});