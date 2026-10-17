const { FaissStore } = require('@langchain/community/vectorstores/faiss');
 const fs = require('fs');
const {Document} = require('../models/Document');
const { embeddingsModel } = require('./langchain');
require('dotenv').config();

// Initialize ChromaDB client with Langchain's Chroma
const getVectorStore = async () => {
  const directory = process.env.FAISS_DB_PATH || './faissdb';
  // Ensure the directory exists
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  try {
     const faissIndexPath = `${directory}/faiss.index`;
      if (!fs.existsSync(faissIndexPath)) {
        console.log("FAISS index file not found, returning null.");
        return null; // Indicate that no store exists yet
      }
     const vectorStore = await FaissStore.load(directory, embeddingsModel);
      return vectorStore;
    } catch (error) {
     console.log("Error loading FAISS store, likely not found:", error.message);
     return null; // Indicate that no store exists yet
   }
};

// Add document chunks to faiss db
const addDocumentChunks = async (chunks, filename) => {
  let vectorStore = await getVectorStore();

  const documents = chunks.map(chunk => chunk.content);

  const metadatas = chunks.map(chunk => ({
    documentId: chunk.documentId.toString(),
    position: chunk.position,
    filename // Shown as the source of an answer
  }));

  // Prepare documents in Langchain format
  const langchainDocuments = documents.map((doc, index) => ({
    pageContent: doc,
    metadata: metadatas[index],
  }));

  // Ensure the directory exists for saving
  const directory = process.env.FAISS_DB_PATH || './faissdb';
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!vectorStore) {
    // If no existing store, create a new one from documents
    vectorStore = await FaissStore.fromDocuments(langchainDocuments, embeddingsModel);
  } else {
    // Otherwise, add documents to the existing store
    await vectorStore.addDocuments(langchainDocuments);
  }

  await vectorStore.save(directory);
};

// Query the n chunks most similar to the query among the user's own documents
const querySimilarChunks = async (query, userId, n = 5) => {
  const userDocuments = await Document.find({ userId: userId }).select('_id');
  if (userDocuments.length === 0) {
    return [];
  }
  const userDocumentIds = new Set(userDocuments.map(doc => doc._id.toString()));

  const vectorStore = await getVectorStore();
  if (!vectorStore) {
    return []; // Nothing has been uploaded yet
  }

  // The index is shared by every user and still holds embeddings of deleted
  // documents, so search all of it and then keep the user's top n. Taking the
  // global top n first would return nothing whenever other users' chunks rank higher.
  const total = vectorStore.index.ntotal();
  const resultsWithScore = await vectorStore.similaritySearchWithScore(query, total);

  return resultsWithScore
    .filter(([doc]) => userDocumentIds.has(doc.metadata.documentId))
    .slice(0, n)
    .map(([doc, score]) => {
      doc.score = score; // Attach score to the document object
      return doc;
    });
};



module.exports = {
  getVectorStore,
  addDocumentChunks,
  querySimilarChunks,
};