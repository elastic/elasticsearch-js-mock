// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

'use strict'

const test = require('ava')
const { Client, errors } = require('@elastic/elasticsearch')
const intoStream = require('into-stream')
const Mock = require('./')

test('Should mock an API', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'GET',
    path: '/'
  }, () => {
    return { status: 'ok' }
  })

  const response = await client.info()
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('Mock granularity', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'POST',
    path: '/test/_search'
  }, () => {
    return {
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _source: { baz: 'faz' } }]
      }
    }
  })

  mock.add({
    method: 'POST',
    path: '/test/_search',
    body: { query: { match: { foo: 'bar' } } }
  }, () => {
    return {
      hits: {
        total: { value: 0, relation: 'eq' },
        hits: []
      }
    }
  })

  let response = await client.search({
    index: 'test',
    body: { query: { match_all: {} } }
  })

  t.deepEqual(response.body, {
    hits: {
      total: { value: 1, relation: 'eq' },
      hits: [{ _source: { baz: 'faz' } }]
    }
  })

  response = await client.search({
    index: 'test',
    body: { query: { match: { foo: 'bar' } } }
  })

  t.deepEqual(response.body, {
    hits: {
      total: { value: 0, relation: 'eq' },
      hits: []
    }
  })
})

test('Dynamic paths', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'GET',
    path: '/:index/_count'
  }, () => {
    return { count: 42 }
  })

  let response = await client.count({ index: 'foo' })
  t.deepEqual(response.body, { count: 42 })

  response = await client.count({ index: 'bar' })
  t.deepEqual(response.body, { count: 42 })
})

test('If an API has not been mocked, it should return a 404', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  try {
    await client.info()
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ResponseError)
    t.deepEqual(err.body, { error: 'Mock not found' })
    t.is(err.statusCode, 404)
  }
})

test('Should handle compressed request', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    compression: 'gzip',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'POST',
    path: '/test/_search'
  }, () => {
    return {
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _source: { baz: 'faz' } }]
      }
    }
  })

  mock.add({
    method: 'POST',
    path: '/test/_search',
    body: { query: { match: { foo: 'bar' } } }
  }, () => {
    return {
      hits: {
        total: { value: 0, relation: 'eq' },
        hits: []
      }
    }
  })

  const response = await client.search({
    index: 'test',
    body: { query: { match_all: {} } }
  })

  t.deepEqual(response.body, {
    hits: {
      total: { value: 1, relation: 'eq' },
      hits: [{ _source: { baz: 'faz' } }]
    }
  })
})

test('Should handle streaming body', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'POST',
    path: '/test/_search'
  }, () => {
    return {
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _source: { baz: 'faz' } }]
      }
    }
  })

  mock.add({
    method: 'POST',
    path: '/test/_search',
    body: { query: { match: { foo: 'bar' } } }
  }, () => {
    return {
      hits: {
        total: { value: 0, relation: 'eq' },
        hits: []
      }
    }
  })

  const response = await client.search({
    index: 'test',
    body: intoStream(JSON.stringify({ query: { match: { foo: 'bar' } } }))
  })

  t.deepEqual(response.body, {
    hits: {
      total: { value: 0, relation: 'eq' },
      hits: []
    }
  })
})

test('Should handle compressed streaming body', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    compression: 'gzip',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'POST',
    path: '/test/_search'
  }, () => {
    return {
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _source: { baz: 'faz' } }]
      }
    }
  })

  mock.add({
    method: 'POST',
    path: '/test/_search',
    body: { query: { match: { foo: 'bar' } } }
  }, () => {
    return {
      hits: {
        total: { value: 0, relation: 'eq' },
        hits: []
      }
    }
  })

  const response = await client.search({
    index: 'test',
    body: intoStream(JSON.stringify({ query: { match: { foo: 'bar' } } }))
  })

  t.deepEqual(response.body, {
    hits: {
      total: { value: 0, relation: 'eq' },
      hits: []
    }
  })
})

test.cb('Abort a request (with callbacks)', t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  const r = client.info((err, result) => {
    t.true(err instanceof errors.RequestAbortedError)
    t.end()
  })

  r.abort()
})

test('Abort a request (with promises)', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  const p = client.info()
  p.abort()

  try {
    await p
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.RequestAbortedError)
  }
})

test('Return a response error', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'GET',
    path: '/'
  }, () => {
    return new errors.ResponseError({
      body: { errors: {}, status: 500 },
      statusCode: 500
    })
  })

  try {
    await client.info()
    t.fail('Should throw')
  } catch (err) {
    t.deepEqual(err.body, { errors: {}, status: 500 })
    t.is(err.statusCode, 500)
  }
})

test('Return a timeout error', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'GET',
    path: '/'
  }, () => {
    return new errors.TimeoutError()
  })

  try {
    await client.info()
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.TimeoutError)
  }
})

test('The mock function should receive the request parameters', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    compression: 'gzip',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'POST',
    path: '/test/_search'
  }, params => params)

  const response = await client.search({
    index: 'test',
    body: { query: { match_all: {} } }
  })

  t.deepEqual(response.body, {
    method: 'POST',
    path: '/test/_search',
    querystring: {},
    body: {
      query: { match_all: {} }
    }
  })
})

test('Should handle the same mock with different body/querystring', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'POST',
    path: '/test/_search',
    querystring: { pretty: 'true' },
    body: { query: { match_all: {} } }
  }, () => {
    return {
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _source: { baz: 'faz' } }]
      }
    }
  })

  mock.add({
    method: 'POST',
    path: '/test/_search',
    querystring: { pretty: 'true' },
    body: { query: { match: { foo: 'bar' } } }
  }, () => {
    return {
      hits: {
        total: { value: 0, relation: 'eq' },
        hits: []
      }
    }
  })

  let response = await client.search({
    index: 'test',
    pretty: true,
    body: { query: { match_all: {} } }
  })

  t.deepEqual(response.body, {
    hits: {
      total: { value: 1, relation: 'eq' },
      hits: [{ _source: { baz: 'faz' } }]
    }
  })

  response = await client.search({
    index: 'test',
    pretty: true,
    body: { query: { match: { foo: 'bar' } } }
  })

  t.deepEqual(response.body, {
    hits: {
      total: { value: 0, relation: 'eq' },
      hits: []
    }
  })
})

test('Discriminate on the querystring', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'GET',
    path: '/'
  }, () => {
    return { querystring: false }
  })

  mock.add({
    method: 'GET',
    path: '/',
    querystring: { pretty: 'true' }
  }, () => {
    return { querystring: true }
  })

  const response = await client.info({ pretty: true })
  t.deepEqual(response.body, { querystring: true })
  t.is(response.statusCode, 200)
})

test('The handler for the route exists, but the request is not enough precise', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'GET',
    path: '/',
    querystring: { human: 'true' }
  }, () => {
    return { status: 'ok' }
  })

  mock.add({
    method: 'GET',
    path: '/',
    querystring: { pretty: 'true' }
  }, () => {
    return { status: 'ok' }
  })

  try {
    await client.info()
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ResponseError)
    t.deepEqual(err.body, { error: 'Mock not found' })
    t.is(err.statusCode, 404)
  }
})

test('Send back a plain string', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'GET',
    path: '/'
  }, () => {
    return 'ok'
  })

  const response = await client.info()
  t.is(response.body, 'ok')
  t.is(response.statusCode, 200)
  t.is(response.headers['content-type'], 'text/plain;utf=8')
})

test('Should ignore trailing slashes', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'GET',
    path: '/_cat/indices/'
  }, () => {
    return { status: 'ok' }
  })

  const response = await client.cat.indices()
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('.add should throw if method and path are not defined', async t => {
  const mock = new Mock()

  try {
    mock.add({ path: '/' }, () => {})
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ConfigurationError)
    t.is(err.message, 'The method is not defined')
  }

  try {
    mock.add({ method: 'GET' }, () => {})
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ConfigurationError)
    t.is(err.message, 'The path is not defined')
  }

  try {
    mock.add({ method: 'GET', path: '/' })
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ConfigurationError)
    t.is(err.message, 'The resolver function is not defined')
  }

  try {
    mock.add({ api: 'ifno' })
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ConfigurationError)
    t.is(err.message, "The api 'ifno' does not exist")
  }
})

test('Define multiple methods at once', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: ['GET', 'POST'],
    path: '/:index/_search'
  }, () => {
    return { status: 'ok' }
  })

  let response = await client.search({
    index: 'test',
    q: 'foo:bar'
  })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  response = await client.search({
    index: 'test',
    body: {
      query: { match: { foo: 'bar' } }
    }
  })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('Define multiple paths at once', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'GET',
    path: ['/test1/_search', '/test2/_search']
  }, () => {
    return { status: 'ok' }
  })

  let response = await client.search({
    index: 'test1',
    q: 'foo:bar'
  })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  response = await client.search({
    index: 'test2',
    q: 'foo:bar'
  })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('Define multiple paths and method at once', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: ['GET', 'POST'],
    path: ['/test1/_search', '/test2/_search']
  }, () => {
    return { status: 'ok' }
  })

  let response = await client.search({
    index: 'test1',
    q: 'foo:bar'
  })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  response = await client.search({
    index: 'test2',
    q: 'foo:bar'
  })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  response = await client.search({
    index: 'test1',
    body: {
      query: { match: { foo: 'bar' } }
    }
  })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  response = await client.search({
    index: 'test2',
    body: {
      query: { match: { foo: 'bar' } }
    }
  })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('High level mock', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    api: 'info'
  }, () => {
    return { status: 'ok' }
  })

  const response = await client.info()
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('High level mock with dynamic url', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    api: 'search'
  }, () => {
    return {
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _source: { baz: 'faz' } }]
      }
    }
  })

  const response = await client.search({
    index: 'test',
    body: { query: { match_all: {} } }
  })

  t.deepEqual(response.body, {
    hits: {
      total: { value: 1, relation: 'eq' },
      hits: [{ _source: { baz: 'faz' } }]
    }
  })
  t.is(response.statusCode, 200)
})

test('High level mock granularity', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    api: 'search'
  }, () => {
    return {
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _source: { baz: 'faz' } }]
      }
    }
  })

  mock.add({
    api: 'search',
    body: { query: { match: { foo: 'bar' } } }
  }, () => {
    return {
      hits: {
        total: { value: 0, relation: 'eq' },
        hits: []
      }
    }
  })

  let response = await client.search({
    index: 'test',
    body: { query: { match_all: {} } }
  })

  t.deepEqual(response.body, {
    hits: {
      total: { value: 1, relation: 'eq' },
      hits: [{ _source: { baz: 'faz' } }]
    }
  })

  response = await client.search({
    index: 'test',
    body: { query: { match: { foo: 'bar' } } }
  })

  t.deepEqual(response.body, {
    hits: {
      total: { value: 0, relation: 'eq' },
      hits: []
    }
  })
})

test('High level mock, discriminate by querystring', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    api: 'info',
    querystring: { pretty: 'true' }
  }, () => {
    return { status: 'not ok' }
  })

  mock.add({
    api: 'info',
    querystring: { human: 'true' }
  }, () => {
    return { status: 'ok' }
  })

  const response = await client.info({ human: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})
