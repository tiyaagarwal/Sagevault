const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../config/langchain', () => ({ createDocumentChunks: jest.fn() }));
jest.mock('../config/vectorStore', () => ({ addDocumentChunks: jest.fn() }));
jest.mock('../models/Document', () => {
  const Document = jest.fn(function (fields) {
    Object.assign(this, fields, { _id: 'doc-1' });
    this.save = jest.fn();
  });
  Document.deleteOne = jest.fn();
  return { Document, DocumentChunk: { insertMany: jest.fn(), deleteMany: jest.fn() } };
});

const { createDocumentChunks } = require('../config/langchain');
const { addDocumentChunks } = require('../config/vectorStore');
const { Document, DocumentChunk } = require('../models/Document');
const { uploadDocument } = require('../controllers/documentController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let tmpFile;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'upload-')), 'file-1.txt');
  fs.writeFileSync(tmpFile, 'some notes');
});

const req = () => ({
  file: { path: tmpFile, originalname: 'notes.txt', size: 10 },
  user: { _id: 'user-1' },
});

describe('uploadDocument', () => {
  it('indexes chunks with the filename and removes the temp file', async () => {
    createDocumentChunks.mockResolvedValue([{ pageContent: 'some notes' }]);
    DocumentChunk.insertMany.mockImplementation(async (chunks) => chunks);

    const res = mockRes();
    await uploadDocument(req(), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(addDocumentChunks).toHaveBeenCalledWith(expect.any(Array), 'notes.txt');
    expect(fs.existsSync(tmpFile)).toBe(false);
  });

  it('removes the temp file and the half-saved document when indexing fails', async () => {
    createDocumentChunks.mockResolvedValue([{ pageContent: 'some notes' }]);
    DocumentChunk.insertMany.mockImplementation(async (chunks) => chunks);
    addDocumentChunks.mockRejectedValue(new Error('embedding API down'));

    const res = mockRes();
    await uploadDocument(req(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(Document.deleteOne).toHaveBeenCalledWith({ _id: 'doc-1' });
    expect(DocumentChunk.deleteMany).toHaveBeenCalledWith({ documentId: 'doc-1' });
    expect(fs.existsSync(tmpFile)).toBe(false);
  });
});
