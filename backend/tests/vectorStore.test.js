const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../config/langchain', () => ({ embeddingsModel: {} }));
jest.mock('../models/Document', () => ({ Document: { find: jest.fn() } }));
jest.mock('@langchain/community/vectorstores/faiss', () => ({
  FaissStore: { load: jest.fn(), fromDocuments: jest.fn() },
}));

const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { Document } = require('../models/Document');
const { querySimilarChunks, addDocumentChunks } = require('../config/vectorStore');

const chunk = (documentId, text) => ({ pageContent: text, metadata: { documentId } });

const userHasDocuments = (ids) => {
  Document.find.mockReturnValue({
    select: jest.fn().mockResolvedValue(ids.map((id) => ({ _id: id }))),
  });
};

let faissDir;

beforeEach(() => {
  jest.clearAllMocks();
  faissDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faiss-'));
  process.env.FAISS_DB_PATH = faissDir;
});

afterEach(() => {
  fs.rmSync(faissDir, { recursive: true, force: true });
});

describe('querySimilarChunks', () => {
  it('returns no chunks instead of crashing when nothing has been indexed yet', async () => {
    userHasDocuments(['mine']);
    await expect(querySimilarChunks('hello', 'user-1')).resolves.toEqual([]);
    expect(FaissStore.load).not.toHaveBeenCalled();
  });

  it("returns the user's best chunks even when other users' chunks rank higher", async () => {
    fs.writeFileSync(path.join(faissDir, 'faiss.index'), '');
    userHasDocuments(['mine']);
    const ranked = [
      ...Array.from({ length: 6 }, (_, i) => [chunk('theirs', `other ${i}`), 0.1 * i]),
      [chunk('mine', 'my first'), 0.8],
      [chunk('mine', 'my second'), 0.9],
    ];
    const store = {
      index: { ntotal: () => ranked.length },
      similaritySearchWithScore: jest.fn().mockResolvedValue(ranked),
    };
    FaissStore.load.mockResolvedValue(store);

    const results = await querySimilarChunks('question', 'user-1', 5);

    expect(store.similaritySearchWithScore).toHaveBeenCalledWith('question', ranked.length);
    expect(results.map((d) => d.pageContent)).toEqual(['my first', 'my second']);
    expect(results.map((d) => d.score)).toEqual([0.8, 0.9]);
  });

  it('returns at most n chunks', async () => {
    fs.writeFileSync(path.join(faissDir, 'faiss.index'), '');
    userHasDocuments(['mine']);
    const ranked = Array.from({ length: 8 }, (_, i) => [chunk('mine', `c${i}`), i]);
    FaissStore.load.mockResolvedValue({
      index: { ntotal: () => ranked.length },
      similaritySearchWithScore: jest.fn().mockResolvedValue(ranked),
    });

    const results = await querySimilarChunks('question', 'user-1', 3);
    expect(results.map((d) => d.pageContent)).toEqual(['c0', 'c1', 'c2']);
  });

  it('skips the search for a user with no documents', async () => {
    userHasDocuments([]);
    await expect(querySimilarChunks('question', 'user-1')).resolves.toEqual([]);
    expect(FaissStore.load).not.toHaveBeenCalled();
  });
});

describe('addDocumentChunks', () => {
  it('stores the filename in each chunk so answers can cite it', async () => {
    const store = { save: jest.fn() };
    FaissStore.fromDocuments.mockResolvedValue(store);

    await addDocumentChunks(
      [{ documentId: 'doc-1', content: 'hello', position: 0 }],
      'notes.pdf'
    );

    const [docs] = FaissStore.fromDocuments.mock.calls[0];
    expect(docs[0].metadata).toEqual({ documentId: 'doc-1', position: 0, filename: 'notes.pdf' });
    expect(store.save).toHaveBeenCalledWith(faissDir);
  });
});
