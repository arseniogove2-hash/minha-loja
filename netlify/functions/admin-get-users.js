// netlify/functions/admin-get-users.js
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(MONGODB_URI);
  cachedDb = client.db();
  return cachedDb;
}

async function verifyAdmin(authHeader, db) {
  if (!authHeader) throw new Error('Token não fornecido');
  const token = authHeader.replace('Bearer ', '');
  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
  if (!user || !user.isAdmin) throw new Error('Acesso negado');
  return decoded;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const db = await connectToDatabase();
    await verifyAdmin(event.headers.authorization, db);

    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ users, total: users.length })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: error.message === 'Acesso negado' ? 403 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
