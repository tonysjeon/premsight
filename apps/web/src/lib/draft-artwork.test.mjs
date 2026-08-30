import assert from 'node:assert/strict';
import test from 'node:test';
import { nationalityFlagUrl, playerArtworkSrcs } from './draft-artwork.ts';

test('nationalityFlagUrl maps home nations and rejects junk codes', () => {
  assert.equal(nationalityFlagUrl('EN'), 'https://flagcdn.com/w80/gb-eng.png');
  assert.equal(nationalityFlagUrl('BR'), 'https://flagcdn.com/w80/br.png');
  assert.equal(nationalityFlagUrl(null), null);
  assert.equal(nationalityFlagUrl('????'), null);
});

test('playerArtworkSrcs lists crest and flag URLs for a player', () => {
  assert.deepEqual(
    playerArtworkSrcs({
      nationalityCode: 'EN',
      teamCrestUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/9825.png',
    }),
    [
      'https://images.fotmob.com/image_resources/logo/teamlogo/9825.png',
      'https://flagcdn.com/w80/gb-eng.png',
    ],
  );
  assert.deepEqual(playerArtworkSrcs({ nationalityCode: null, teamCrestUrl: null }), []);
});
