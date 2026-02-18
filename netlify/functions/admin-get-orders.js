// netlify/functions/admin-get-orders.js
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  cachedDb = db;
  return db;
}

async function verifyAdmin(authHeader, db) {
  if (!authHeader) {
    throw new Error('Token não fornecido');
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = jwt.verify(token, JWT_SECRET);
  
  const { ObjectId } = require('mongodb');
  const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
  
  if (!user || !user.isAdmin) {
    throw new Error('Acesso negado');
  }

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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const db = await connectToDatabase();
    
    // Verify admin
    await verifyAdmin(event.headers.authorization, db);

    // Get all orders with user info
    const orders = await db.collection('orders')
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            'user.password': 0
          }
        },
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ orders, total: orders.length })
    };

  } catch (error) {
    console.error('Error in admin-get-orders:', error);
    
    if (error.message === 'Token não fornecido' || error.message === 'Acesso negado') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao buscar pedidos' })
    };
  }
};
