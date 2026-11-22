// How typed lyrics are split into songs, verses, keys and refrains.
const { test, expect } = require('@playwright/test');
const { openTool, parse } = require('./helpers');

test.beforeEach(async ({ page }) => { await openTool(page); });

test('two blank lines start a new song, one blank line starts a new verse', async ({ page }) => {
  const songs = await parse(page, [
    'First Song', '', 'a one', 'a two', '', 'b one', '', '',
    'Second Song', '', 'c one',
  ].join('\n'));
  expect(songs.map(s => s.title)).toEqual(['First Song', 'Second Song']);
  expect(songs[0].blocks).toEqual([
    { type: 'verse', lines: ['a one', 'a two'] },
    { type: 'verse', lines: ['b one'] },
  ]);
  expect(songs[1].blocks).toEqual([{ type: 'verse', lines: ['c one'] }]);
});

test('extra blank lines between songs still make just one new song', async ({ page }) => {
  const songs = await parse(page, 'One\n\nx\n\n\n\n\nTwo\n\ny');
  expect(songs.map(s => s.title)).toEqual(['One', 'Two']);
});

test('the first line is the title', async ({ page }) => {
  const [song] = await parse(page, 'My Title\n\nfirst verse line');
  expect(song.title).toBe('My Title');
  expect(song.blocks[0].lines).toEqual(['first verse line']);
});

test('a line starting with "Key" right under the title becomes the key box', async ({ page }) => {
  const [song] = await parse(page, 'Song\nKey of C · Start on G\n\nla la');
  expect(song.key).toBe('Key of C · Start on G');
  expect(song.blocks).toEqual([{ type: 'verse', lines: ['la la'] }]);
});

test('the key is optional', async ({ page }) => {
  const [song] = await parse(page, 'Song\n\nla la');
  expect(song.key).toBe('');
});

test('a verse repeated word for word is a refrain: full once, then a one-line cue', async ({ page }) => {
  const [song] = await parse(page, [
    'Song', '',
    'verse one line', '',
    'Ring the bells, ring out', 'all the night', '',
    'verse two line', '',
    'ring the BELLS ring out!', 'All the night.',
  ].join('\n'));
  expect(song.blocks.map(b => b.type)).toEqual(['verse', 'ref', 'verse', 'cue']);
  expect(song.blocks[1].lines).toEqual(['Ring the bells, ring out', 'all the night']);
  expect(song.blocks[3].text).toBe('ring the BELLS ring out!');
  expect(song.refrains).toBe(1);
  expect(song.verses).toBe(2);
});

test('a verse labeled Refrain: or Chorus: is a refrain even if it appears once', async ({ page }) => {
  for (const label of ['Refrain:', 'Chorus:', 'refrain:']) {
    const [song] = await parse(page, `Song\n\nfirst line\n\n${label} Sing it loud\nand clear`);
    expect(song.blocks[1]).toEqual({ type: 'ref', lines: ['Sing it loud', 'and clear'] });
  }
});

test('a verse that is only "Refrain" prints as a cue for the last refrain', async ({ page }) => {
  const [song] = await parse(page, 'Song\n\nRefrain: Hey ho, away\nwe go\n\nmiddle line\n\nRefrain');
  expect(song.blocks.map(b => b.type)).toEqual(['ref', 'verse', 'cue']);
  expect(song.blocks[2].text).toBe('Hey ho, away');
});

test('lines like "Verse 2" are dropped', async ({ page }) => {
  const [song] = await parse(page, 'Song\n\nVerse 1\nfirst\n\nVerse 2:\nsecond');
  expect(song.blocks).toEqual([
    { type: 'verse', lines: ['first'] },
    { type: 'verse', lines: ['second'] },
  ]);
});

test('Binder: and Contents: header lines are not treated as a song', async ({ page }) => {
  const songs = await parse(page, 'Binder: Test Binder\nContents: yes\n\n\nOnly Song\n\nla');
  expect(songs.map(s => s.title)).toEqual(['Only Song']);
});

test('Windows line endings and tabs work the same as plain text', async ({ page }) => {
  const songs = await parse(page, 'One\r\n\r\nla\tla\r\n\r\n\r\nTwo\r\n\r\nx');
  expect(songs.map(s => s.title)).toEqual(['One', 'Two']);
  expect(songs[0].blocks[0].lines).toEqual(['la la']);
});
