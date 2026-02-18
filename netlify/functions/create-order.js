// netlify/functions/create-order.js
const { MongoClient, ObjectId } = require('mongodb');
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify authentication
    const user = verifyToken(event.headers.authorization);

    const { product, total, customerInfo } = JSON.parse(event.body);

    const db = await connectToDatabase();

    // Create order
    const newOrder = {
      userId: new ObjectId(user.userId),
      product,
      total,
      customerInfo,
      status: 'pending',
      createdAt: new Date()
    };

    const result = await db.collection('orders').insertOne(newOrder);

    // Add order to user's history
    await db.collection('users').updateOne(
      { _id: new ObjectId(user.userId) },
      { $push: { orders: result.insertedId } }
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Pedido criado com sucesso!',
        orderId: result.insertedId
      })
    };

  } catch (error) {
    console.error('Error in create-order:', error);
    
    if (error.message === 'Token não fornecido' || error.message === 'Token inválido') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao criar pedido' })
    };
  }
};
