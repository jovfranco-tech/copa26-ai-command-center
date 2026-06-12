import { PLAYERS } from './packages/shared/src/dataset/index.js';
import { TEAMS } from './packages/shared/src/dataset/index.js';
import { mapProviderScorers } from './packages/shared/src/resultsMapping.js';

const apiResponse = {
  "scorers": [
    {
      "player": {
        "id": 170561,
        "name": "In-beom Hwang",
        "firstName": "In-beom",
        "lastName": "Hwang"
      },
      "team": {
        "tla": "KOR"
      },
      "goals": 1,
      "assists": 1
    },
    {
      "player": {
        "id": 191295,
        "name": "Hyun-Gyu Oh",
        "firstName": "Hyeon-gyu",
        "lastName": "Oh"
      },
      "team": {
        "tla": "KOR"
      },
      "goals": 1,
      "assists": null
    }
  ]
};

const stats = mapProviderScorers(TEAMS, PLAYERS, apiResponse.scorers);
console.log(stats);
