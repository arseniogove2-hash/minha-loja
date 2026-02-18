// netlify/functions/get-user-profile.js
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

function verifyToken(authHeader) {
  if (!authHeader) {
    throw new Error('Token não fornecido');
  }
  const token = authHeader.replace('Bearer ', '');
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido');
  }
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const decoded = verifyToken(event.headers.authorization);
    const db = await connectToDatabase();

    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Usuário não encontrado' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin || false,
          createdAt: user.createdAt
        }
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: error.message === 'Token inválido' ? 401 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
