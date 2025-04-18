/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

'use strict'

const test = require('ava')
const { Client, errors } = require('@elastic/elasticsearch')
const { AbortController } = require('node-abort-controller')
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
    path: '/_cat/indices'
  }, () => {
    return { status: 'ok' }
  })

  const response = await client.cat.indices({}, { meta: true })
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
    query: { match_all: {} }
  })

  t.deepEqual(response, {
    hits: {
      total: { value: 1, relation: 'eq' },
      hits: [{ _source: { baz: 'faz' } }]
    }
  })

  response = await client.search({
    index: 'test',
    query: { match: { foo: 'bar' } }
  })

  t.deepEqual(response, {
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
  t.deepEqual(response, { count: 42 })

  response = await client.count({ index: 'bar' })
  t.deepEqual(response, { count: 42 })
})

test('If an API has not been mocked, it should return a 404', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  try {
    await client.cat.indices()
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
    compression: true,
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
    query: { match_all: {} }
  })

  t.deepEqual(response, {
    hits: {
      total: { value: 1, relation: 'eq' },
      hits: [{ _source: { baz: 'faz' } }]
    }
  })
})

test('Should handle streaming body with transport.request', async t => {
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

  const response = await client.transport.request({
    method: 'POST',
    path: '/test/_search',
    body: intoStream(JSON.stringify({ query: { match: { foo: 'bar' } } }))
  })

  t.deepEqual(response, {
    hits: {
      total: { value: 0, relation: 'eq' },
      hits: []
    }
  })
})

test('Should handle compressed streaming body with transport.request', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    compression: true,
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

  const response = await client.transport.request({
    method: 'POST',
    path: '/test/_search',
    body: intoStream(JSON.stringify({ query: { match: { foo: 'bar' } } }))
  })

  t.deepEqual(response, {
    hits: {
      total: { value: 0, relation: 'eq' },
      hits: []
    }
  })
})

test('Abort a request', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  const ac = new AbortController()
  const p = client.cat.indices({}, { signal: ac.signal })
  ac.abort()

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
    path: '/_cat/indices'
  }, () => {
    return new errors.ResponseError({
      body: { errors: {}, status: 500 },
      statusCode: 500
    })
  })

  try {
    await client.cat.indices()
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
    path: '/_cat/indices'
  }, () => {
    return new errors.TimeoutError()
  })

  try {
    await client.cat.indices()
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.TimeoutError)
  }
})

test('The mock function should receive the request parameters', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    compression: true,
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'POST',
    path: '/test/_search'
  }, params => params)

  const response = await client.search({
    index: 'test',
    query: { match_all: {} }
  })

  t.deepEqual(response, {
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
    query: { match_all: {} }
  })

  t.deepEqual(response, {
    hits: {
      total: { value: 1, relation: 'eq' },
      hits: [{ _source: { baz: 'faz' } }]
    }
  })

  response = await client.search({
    index: 'test',
    pretty: true,
    query: { match: { foo: 'bar' } }
  })

  t.deepEqual(response, {
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
    path: '/_cat/indices'
  }, () => {
    return { querystring: false }
  })

  mock.add({
    method: 'GET',
    path: '/_cat/indices',
    querystring: { pretty: 'true' }
  }, () => {
    return { querystring: true }
  })

  const response = await client.cat.indices({ pretty: true }, { meta: true })
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
    path: '/_cat/indices',
    querystring: { human: 'true' }
  }, () => {
    return { status: 'ok' }
  })

  mock.add({
    method: 'GET',
    path: '/_cat/indices',
    querystring: { pretty: 'true' }
  }, () => {
    return { status: 'ok' }
  })

  try {
    await client.cat.indices()
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
    path: '/_cat/indices'
  }, () => {
    return 'ok'
  })

  const response = await client.cat.indices({}, { meta: true })
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

  const response = await client.cat.indices({}, { meta: true })
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
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  response = await client.search({
    index: 'test',
    query: { match: { foo: 'bar' } }
  }, { meta: true })
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
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  response = await client.search({
    index: 'test2',
    q: 'foo:bar'
  }, { meta: true })
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
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  response = await client.search({
    index: 'test2',
    q: 'foo:bar'
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  response = await client.search({
    index: 'test1',
    query: { match: { foo: 'bar' } }
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  response = await client.search({
    index: 'test2',
    query: { match: { foo: 'bar' } }
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('ndjson API support', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'POST',
    path: '/_bulk'
  }, params => {
    t.deepEqual(params.body, [
      { foo: 'bar' },
      { baz: 'fa\nz' }
    ])
    return { status: 'ok' }
  })

  const response = await client.bulk({
    operations: [
      { foo: 'bar' },
      { baz: 'fa\nz' }
    ]
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('ndjson API support (with compression)', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection(),
    compression: true
  })

  mock.add({
    method: 'POST',
    path: '/_bulk'
  }, params => {
    t.deepEqual(params.body, [
      { foo: 'bar' },
      { baz: 'fa\nz' }
    ])
    return { status: 'ok' }
  })

  const response = await client.bulk({
    operations: [
      { foo: 'bar' },
      { baz: 'fa\nz' }
    ]
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('ndjson API support (as stream) with transport.request', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  mock.add({
    method: 'POST',
    path: '/_bulk'
  }, params => {
    t.deepEqual(params.body, [
      { foo: 'bar' },
      { baz: 'fa\nz' }
    ])
    return { status: 'ok' }
  })

  const response = await client.transport.request({
    method: 'POST',
    path: '/_bulk',
    bulkBody: intoStream(client.serializer.ndserialize([
      { foo: 'bar' },
      { baz: 'fa\nz' }
    ]))
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('ndjson API support (as stream with compression) with transport.request', async t => {
  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection(),
    compression: true
  })

  mock.add({
    method: 'POST',
    path: '/_bulk'
  }, params => {
    t.deepEqual(params.body, [
      { foo: 'bar' },
      { baz: 'fa\nz' }
    ])
    return { status: 'ok' }
  })

  const response = await client.transport.request({
    method: 'POST',
    path: '/_bulk',
    bulkBody: intoStream(client.serializer.ndserialize([
      { foo: 'bar' },
      { baz: 'fa\nz' }
    ]))
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)
})

test('Should clear individual mocks', async t => {
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

  // Clear test1 but not test2
  mock.clear({ method: 'GET', path: ['/test1/_search'] })

  // test2 still works
  const response = await client.search({
    index: 'test2',
    q: 'foo:bar'
  }, { meta: true })
  t.deepEqual(response.body, { status: 'ok' })
  t.is(response.statusCode, 200)

  // test1 does not
  try {
    await client.search({
      index: 'test1',
      q: 'foo:bar'
    })
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ResponseError)
    t.deepEqual(err.body, { error: 'Mock not found' })
    t.is(err.statusCode, 404)
  }
})

test('.mock should throw if method and path are not defined', async t => {
  const mock = new Mock()

  try {
    mock.clear({ path: '/' }, () => {})
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ConfigurationError)
    t.is(err.message, 'The method is not defined')
  }

  try {
    mock.clear({ method: 'GET' }, () => {})
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ConfigurationError)
    t.is(err.message, 'The path is not defined')
  }
})

test('Should clear all mocks', async t => {
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

  // Clear mocks
  mock.clearAll()

  try {
    await client.search({
      index: 'test1',
      q: 'foo:bar'
    })
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ResponseError)
    t.deepEqual(err.body, { error: 'Mock not found' })
    t.is(err.statusCode, 404)
  }
  try {
    await client.search({
      index: 'test2',
      q: 'foo:bar'
    })
    t.fail('Should throw')
  } catch (err) {
    t.true(err instanceof errors.ResponseError)
    t.deepEqual(err.body, { error: 'Mock not found' })
    t.is(err.statusCode, 404)
  }
})

test('Path should match URL-encoded characters for e.g. comma in multi-index operations', async t => {
  t.plan(1)

  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  const spy = (_req, _res, _params, _store, _searchParams) => {
    t.pass('Callback function was called')
    return {}
  }

  mock.add(
    {
      method: 'DELETE',
      path: '/some-type-index-123tobedeleted%2Csome-type-index-456tobedeleted'
    },
    spy
  )

  await client.indices.delete({
    index: [
      'some-type-index-123tobedeleted',
      'some-type-index-456tobedeleted'
    ]
  })
})

test('Path should match unencoded comma in path', async t => {
  t.plan(1)

  const mock = new Mock()
  const client = new Client({
    node: 'http://localhost:9200',
    Connection: mock.getConnection()
  })

  const spy = (_req, _res, _params, _store, _searchParams) => {
    t.pass('Callback function was called')
    return {}
  }

  mock.add(
    {
      method: 'DELETE',
      path: '/some-type-index-123tobedeleted,some-type-index-456tobedeleted'
    },
    spy
  )

  await client.indices.delete({
    index: [
      'some-type-index-123tobedeleted',
      'some-type-index-456tobedeleted'
    ]
  })
})
