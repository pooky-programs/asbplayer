import 'fake-indexeddb/auto';
import CopyHistoryRepository from './CopyHistoryRepository';

it('saves and fetches', async () => {
    const repository = new CopyHistoryRepository(1);
    const item = {
        text: 'text',
        start: 0,
        end: 1,
        originalStart: 0,
        originalEnd: 1,
        track: 0,
        name: 'name',
        id: 'id',
        timestamp: 1234,
        surroundingSubtitles: [],
        subtitleFileName: 'subtitle-file',
    };
    await repository.save(item);
    const records = await repository.fetch(1);
    expect(records.length).toEqual(1);
    expect(records[0]).toMatchObject(item);
});

it('respects table size limit', async () => {
    const repository = new CopyHistoryRepository(1);
    const item = {
        text: 'text',
        start: 0,
        end: 1,
        originalStart: 0,
        originalEnd: 1,
        track: 0,
        name: 'name',
        id: 'id',
        timestamp: 1234,
        surroundingSubtitles: [],
        subtitleFileName: 'subtitle-file',
    };
    await repository.save({ ...item, id: 'id1' });
    await repository.save({ ...item, id: 'id2' });
    const records = await repository.fetch(2);
    expect(records.length).toEqual(1);
    expect(records[0]).toMatchObject({ ...item, id: 'id2' });
});

it('respects fetch limit', async () => {
    const repository = new CopyHistoryRepository(3);
    const item = {
        text: 'text',
        start: 0,
        end: 1,
        originalStart: 0,
        originalEnd: 1,
        track: 0,
        name: 'name',
        id: 'id',
        timestamp: 1234,
        surroundingSubtitles: [],
        subtitleFileName: 'subtitle-file',
    };
    await repository.save({ ...item, id: 'id1' });
    await repository.save({ ...item, id: 'id2' });
    await repository.save({ ...item, id: 'id3' });
    const records = await repository.fetch(2);
    expect(records.length).toEqual(2);
    expect(records[0]).toMatchObject({ ...item, id: 'id2' });
    expect(records[1]).toMatchObject({ ...item, id: 'id3' });
});