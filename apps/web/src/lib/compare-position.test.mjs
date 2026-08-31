import assert from 'node:assert/strict';
import test from 'node:test';
import {
  comparePath,
  compareTableAxes,
  emptyRadarAxes,
  gkRadarAxesFromPlayers,
  compareStatLegend,
  parseComparePosition,
  playerComparePosition,
  playerMatchesComparePosition,
  addComparePlayer,
  apiPositionFamily,
  playerCompareName,
  resolveComparePosition,
  compareFilterChips,
  DEF_SLOTS,
  ATT_SLOTS,
  expandComparePosition,
  nextCompareFilterState,
  defFamilyExpanded,
  attFamilyExpanded,
  playerDefSlot,
  playerAttSlot,
  playerScoutSlot,
  compareFilterFromPlayer,
  apiPlayersQueryPosition,
  playerSearchPosition,
  foldSearchText,
} from './compare-position.ts';

function player(overrides) {
  return {
    id: '1',
    first_name: 'Bukayo',
    last_name: 'Saka',
    display_name: 'Saka',
    nationality_code: 'ENG',
    photo_url: null,
    slug: 'bukayo-saka',
    position: 'MID',
    ...overrides,
  };
}

test('parseComparePosition maps fwd to ATT and rejects junk', () => {
  assert.equal(parseComparePosition('att'), 'ATT');
  assert.equal(parseComparePosition('FWD'), 'ATT');
  assert.equal(parseComparePosition('mid'), 'MID');
  assert.equal(parseComparePosition('cb'), 'CB');
  assert.equal(parseComparePosition('rb'), 'FB');
  assert.equal(parseComparePosition('lb'), 'FB');
  assert.equal(parseComparePosition('lw'), 'WG');
  assert.equal(parseComparePosition('st'), 'ST');
  assert.equal(parseComparePosition('nope'), null);
});

test('playerComparePosition uses FWD as ATT', () => {
  assert.equal(playerComparePosition(player({ position: 'FWD' })), 'ATT');
  assert.equal(
    playerComparePosition(player({ position: 'MID', archetype: { position_family: 'DEF' } })),
    'DEF',
  );
});

test('playerMatchesComparePosition filters the selected family', () => {
  assert.equal(playerMatchesComparePosition(player({ position: 'GK' }), 'GK'), true);
  assert.equal(playerMatchesComparePosition(player({ position: 'FWD' }), 'ATT'), true);
  assert.equal(playerMatchesComparePosition(player({ position: 'MID' }), 'ATT'), false);
});

test('compareFilterChips keeps families while DEF expands in place', () => {
  assert.deepEqual(compareFilterChips('GK'), ['GK', 'DEF', 'MID', 'ATT']);
  assert.deepEqual(compareFilterChips('CB'), ['GK', 'DEF', 'MID', 'ATT']);
  assert.equal(defFamilyExpanded('GK'), false);
  assert.equal(defFamilyExpanded('DEF'), true);
  assert.equal(defFamilyExpanded('CB'), true);
  assert.equal(expandComparePosition('DEF'), 'CB');
  assert.equal(expandComparePosition('ATT'), 'ST');
  assert.equal(expandComparePosition('MID'), 'MID');
  assert.equal(attFamilyExpanded('GK'), false);
  assert.equal(attFamilyExpanded('ST'), true);
  assert.equal(attFamilyExpanded('WG'), true);
  assert.deepEqual(nextCompareFilterState(null, 'DEF', 'GK'), { position: 'CB', expanded: 'DEF' });
  assert.deepEqual(nextCompareFilterState('DEF', 'DEF', 'CB'), { position: 'CB', expanded: 'DEF' });
  assert.deepEqual(nextCompareFilterState('DEF', 'CB', 'CB'), { position: 'CB', expanded: 'DEF' });
  assert.deepEqual(nextCompareFilterState('DEF', 'FB', 'CB'), { position: 'FB', expanded: 'DEF' });
  assert.deepEqual(nextCompareFilterState(null, 'ATT', 'GK'), { position: 'ST', expanded: 'ATT' });
  assert.deepEqual(nextCompareFilterState('ATT', 'ATT', 'ST'), { position: 'ST', expanded: 'ATT' });
  assert.deepEqual(nextCompareFilterState('ATT', 'ST', 'ST'), { position: 'ST', expanded: 'ATT' });
  assert.deepEqual(nextCompareFilterState('ATT', 'WG', 'ST'), { position: 'WG', expanded: 'ATT' });
  assert.deepEqual(nextCompareFilterState('DEF', 'ATT', 'CB'), { position: 'ST', expanded: 'ATT' });
  assert.deepEqual(nextCompareFilterState('DEF', 'GK', 'CB'), { position: 'GK', expanded: null });
  assert.deepEqual(nextCompareFilterState(null, 'GK', 'GK'), { position: 'GK', expanded: null });
  assert.deepEqual(nextCompareFilterState(null, 'DEF', null), { position: 'CB', expanded: 'DEF' });
  assert.deepEqual(nextCompareFilterState(null, 'GK', null), { position: 'GK', expanded: null });
  assert.deepEqual(DEF_SLOTS, ['CB', 'FB']);
  assert.deepEqual(ATT_SLOTS, ['ST', 'WG']);
});

test('playerDefSlot uses the primary detailed position', () => {
  assert.equal(
    playerDefSlot(player({ position: 'DEF', positions: ['CB'] })),
    'CB',
  );
  assert.equal(
    playerDefSlot(player({ position: 'DEF', positions: ['RB', 'RM'] })),
    'FB',
  );
  assert.equal(
    playerDefSlot(player({ position: 'DEF', positions: ['LB', 'LM'] })),
    'FB',
  );
  assert.equal(
    playerDefSlot(player({ position: 'DEF', positions: ['DEF'] })),
    'CB',
  );
  assert.equal(playerMatchesComparePosition(player({ position: 'DEF', positions: ['RB'] }), 'FB'), true);
  assert.equal(playerMatchesComparePosition(player({ position: 'DEF', positions: ['LB'] }), 'FB'), true);
  assert.equal(playerMatchesComparePosition(player({ position: 'DEF', positions: ['RB'] }), 'CB'), false);
});

test('playerAttSlot groups wingers and strikers', () => {
  assert.equal(
    playerAttSlot(player({ position: 'FWD', positions: ['ST'] })),
    'ST',
  );
  assert.equal(
    playerAttSlot(player({ position: 'FWD', positions: ['LW', 'LM'] })),
    'WG',
  );
  assert.equal(
    playerAttSlot(player({ position: 'FWD', positions: ['RW'] })),
    'WG',
  );
  assert.equal(playerMatchesComparePosition(player({ position: 'FWD', positions: ['LW'] }), 'WG'), true);
  assert.equal(playerMatchesComparePosition(player({ position: 'FWD', positions: ['ST'] }), 'WG'), false);
});

test('resolveComparePosition prefers the query then selected players', () => {
  assert.equal(resolveComparePosition('def', []), 'DEF');
  assert.equal(resolveComparePosition(undefined, [player({ position: 'GK' })]), 'GK');
  assert.equal(resolveComparePosition('nope', []), 'MID');
});

test('comparePath always stores the position pill', () => {
  assert.equal(comparePath([], 'ATT'), '/compare?pos=att');
  assert.equal(
    comparePath([player({ slug: 'bukayo-saka' })], 'MID'),
    '/compare?pos=mid&player=bukayo-saka',
  );
});

test('addComparePlayer caps the set at five', () => {
  const p1 = player({ id: '1', slug: 'one' });
  const p2 = player({ id: '2', slug: 'two' });
  const p3 = player({ id: '3', slug: 'three' });
  const p4 = player({ id: '4', slug: 'four' });
  const p5 = player({ id: '5', slug: 'five' });
  const p6 = player({ id: '6', slug: 'six' });
  const five = [p1, p2, p3, p4, p5].reduce((acc, curr) => addComparePlayer(acc, curr), []);
  assert.equal(five.length, 5);
  assert.equal(addComparePlayer(five, p6).length, 5);
  assert.equal(
    comparePath(five, 'GK'),
    '/compare?pos=gk&player=one&vs=two&and=three&with=four&also=five',
  );
});

test('emptyRadarAxes follows the position family', () => {
  assert.equal(emptyRadarAxes('MID').length, 7);
  assert.equal(emptyRadarAxes('CB').length, 7);
  assert.deepEqual(
    emptyRadarAxes(null).map((axis) => axis.label),
    ['', '', '', '', '', '', ''],
  );
  assert.deepEqual(
    emptyRadarAxes('GK').map((axis) => axis.label),
    ['Short %', 'PSxG-GA', 'Save %', 'Aerials won', 'Interceptions', 'Passes', 'Long %'],
  );
  assert.deepEqual(
    emptyRadarAxes('CB').map((axis) => axis.label),
    ['Passes cmp', 'Fwd pass%', 'Prog passes', 'Poss won', 'Def duel%', 'Aerial duel%', 'Prog carries'],
  );
  assert.deepEqual(
    emptyRadarAxes('FB').map((axis) => axis.label),
    ['Aerial%', 'Carrying', 'Crosses', 'xAssist', 'Prog passes', 'Poss won', 'Def duel%'],
  );
  assert.deepEqual(
    emptyRadarAxes('MID').map((axis) => axis.label),
    ['Key passes', 'Prog passes', 'Duels%', 'Poss won', 'Carrying', 'Fwd passes', 'Fwd pass%'],
  );
});

test('compareTableAxes uses FBref GK column order', () => {
  const table = compareTableAxes('GK', emptyRadarAxes('GK'));
  assert.deepEqual(
    table.map((axis) => axis.label),
    ['Save %', 'Aerials won', 'Int (PAdj)', 'Passes cmp', 'Long %', 'Short %', 'PSxG-GA'],
  );
  assert.deepEqual(
    compareTableAxes('FB', emptyRadarAxes('FB')).map((axis) => axis.label),
    ['Crosses cmp', 'xA', 'Prog passes', 'Poss won', 'Def duel%', 'Aerial duel%', 'Prog carries'],
  );
  assert.deepEqual(
    compareTableAxes('MID', emptyRadarAxes('MID')).map((axis) => axis.label),
    ['Duel%', 'Poss won', 'Prog carries', 'Fwd passes', 'Fwd pass%', 'Key passes', 'Prog passes'],
  );
});

test('gkRadarAxesFromPlayers uses CSV percentile values', () => {
  const alisson = player({
    position: 'GK',
    season_stats: {
      minutes: 2639,
      stats: {
        save_pct: 18.2,
        aerials: 9.7,
        int_padj: 89.6,
        passes_cmp: 66.2,
        long_pct: 55.2,
        short_pct: 14.9,
        psxg_ga: 38.3,
      },
      features: [14.9, 38.3, 18.2, 9.7, 89.6, 66.2, 55.2],
      provider: 'fbref',
      model_version: 'player-sim-v1',
    },
  });
  const axes = gkRadarAxesFromPlayers([alisson]);
  const save = axes.find((axis) => axis.axis === 'save_pct');
  assert.equal(save.values[0], 18.2);
});

test('compareStatLegend lists abbreviated GK names only', () => {
  const legend = compareStatLegend('GK');
  assert.deepEqual(
    legend.map((item) => item.axis),
    ['long_pct', 'short_pct', 'psxg_ga', 'int_padj'],
  );
  assert.equal(legend.find((item) => item.axis === 'psxg_ga')?.fullName.includes('expected goals'), true);
});

test('playerCompareName uses Alisson and first initials', () => {
  assert.equal(
    playerCompareName(
      player({
        first_name: 'Alisson',
        last_name: 'Becker',
        display_name: 'A.Becker',
      }),
    ),
    'Alisson',
  );
  assert.equal(
    playerCompareName(
      player({
        first_name: 'Emiliano',
        last_name: 'Martínez',
        display_name: 'Martinez',
      }),
    ),
    'E. Martínez',
  );
  assert.equal(
    playerCompareName(
      player({
        first_name: 'David',
        last_name: 'Raya Martín',
        display_name: 'Raya',
      }),
    ),
    'D. Raya',
  );
  assert.equal(
    playerCompareName(
      player({
        first_name: 'Robert',
        last_name: 'Lynch Sánchez',
        display_name: 'Sánchez',
      }),
    ),
    'R. Sánchez',
  );
  assert.equal(
    playerCompareName(
      player({
        first_name: 'Bruno',
        last_name: 'Borges Fernandes',
        display_name: 'B.Fernandes',
      }),
    ),
    'B. Fernandes',
  );
  assert.equal(
    playerCompareName(
      player({
        first_name: 'Andrey',
        last_name: 'Nascimento dos Santos',
        display_name: 'Andrey Santos',
      }),
    ),
    'A. Santos',
  );
  assert.equal(
    playerCompareName(
      player({
        first_name: 'Emile',
        last_name: 'Smith Rowe',
        display_name: 'Smith Rowe',
      }),
    ),
    'E. Smith Rowe',
  );
  assert.equal(
    playerCompareName(
      player({
        first_name: 'Bruno',
        last_name: 'Borges Fernandes',
        display_name: 'B.Fernandes',
        scout_name: 'B. Fernandes',
      }),
    ),
    'B. Fernandes',
  );
});

test('apiPositionFamily maps ATT to FWD', () => {
  assert.equal(apiPositionFamily('ATT'), 'FWD');
  assert.equal(apiPositionFamily('GK'), 'GK');
  assert.equal(apiPositionFamily('FB'), 'DEF');
  assert.equal(apiPlayersQueryPosition('CB'), 'CB');
  assert.equal(apiPlayersQueryPosition('FB'), 'FB');
  assert.equal(apiPlayersQueryPosition('ST'), 'ST');
  assert.equal(apiPlayersQueryPosition('WG'), 'WG');
});

test('playerSearchPosition prefers CSV scout side for fullbacks', () => {
  assert.equal(
    playerSearchPosition(player({ position: 'DEF', positions: ['LB'], scout_position: 'LB' })),
    'LB',
  );
  assert.equal(
    playerSearchPosition(player({ position: 'DEF', scout_position: 'RB' })),
    'RB',
  );
  assert.equal(playerSearchPosition(player({ position: 'GK' })), 'GK');
  assert.equal(
    playerSearchPosition(player({ position: 'MID', scout_position: 'CAM' })),
    'CAM',
  );
});

test('emptyRadarAxes returns 7 axes for ST', () => {
  const axes = emptyRadarAxes('ST');
  assert.equal(axes.length, 7);
  assert.deepEqual(
    axes.map((item) => item.axis),
    ['xa', 'off_duels', 'npg', 'npxg', 'conv_pct', 'aerial_pct', 'touches_box'],
  );
  const table = compareTableAxes('ST', axes);
  assert.deepEqual(
    table.map((item) => item.axis),
    ['npg', 'npxg', 'conv_pct', 'aerial_pct', 'touches_box', 'xa', 'off_duels'],
  );
});

test('emptyRadarAxes returns 7 axes for WG', () => {
  const axes = emptyRadarAxes('WG');
  assert.equal(axes.length, 7);
  assert.deepEqual(
    axes.map((item) => item.axis),
    ['npg', 'npxg_xa', 'assists', 'key_passes', 'crosses_cmp', 'prog_carries', 'dribbles_cmp'],
  );
  const table = compareTableAxes('WG', axes);
  assert.deepEqual(
    table.map((item) => item.axis),
    ['prog_carries', 'dribbles_cmp', 'npg', 'npxg_xa', 'assists', 'key_passes', 'crosses_cmp'],
  );
});

test('foldSearchText strips accents and special characters', () => {
  assert.equal(foldSearchText('Gyökeres'), 'gyokeres');
  assert.equal(foldSearchText('Ødegaard'), 'odegaard');
  assert.equal(foldSearchText('Šeško'), 'sesko');
  assert.equal(foldSearchText('Ekitiké'), 'ekitike');
  assert.equal(foldSearchText('Groß'), 'gross');
  assert.equal(foldSearchText('Đorđe Petrović'), 'dorde petrovic');
});

test('playerScoutSlot uses CSV axes and compareFilterFromPlayer expands families', () => {
  const saka = player({
    position: 'FWD',
    season_stats: {
      minutes: 0,
      stats: {
        npg: 10,
        npxg_xa: 20,
        assists: 30,
        key_passes: 40,
        crosses_cmp: 50,
        prog_carries: 60,
        dribbles_cmp: 70,
      },
      features: [],
      provider: 'scout-csv',
      model_version: 'scout-v1',
    },
  });
  const raya = player({
    position: 'GK',
    season_stats: {
      minutes: 0,
      stats: {
        save_pct: 1,
        aerials: 2,
        int_padj: 3,
        passes_cmp: 4,
        long_pct: 5,
        short_pct: 6,
        psxg_ga: 7,
      },
      features: [],
      provider: 'scout-csv',
      model_version: 'scout-v1',
    },
  });
  assert.equal(playerScoutSlot(saka), 'WG');
  assert.deepEqual(compareFilterFromPlayer(saka), { position: 'WG', expanded: 'ATT' });
  assert.equal(playerScoutSlot(raya), 'GK');
  assert.deepEqual(compareFilterFromPlayer(raya), { position: 'GK', expanded: null });
  assert.equal(playerScoutSlot(player({ position: 'MID' })), null);
});
