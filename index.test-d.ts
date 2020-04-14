// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

import { expectType, expectError } from 'tsd'
import { Client } from '@elastic/elasticsearch'
import Mock, { MockPatternHTTP } from './'

const mock = new Mock()
const client = new Client({
  node: 'http://localhost:9200',
  Connection: mock.getConnection()
})

mock.add({
  method: 'GET',
  path: '/'
}, params => {
  expectType<MockPatternHTTP>(params)
  return { status: 'ok' }
})

mock.add({
  method: ['GET', 'POST'],
  path: ['/_search', '/:index/_search']
}, params => {
  expectType<MockPatternHTTP>(params)
  return { status: 'ok' }
})

mock.add({
  method: 'GET',
  path: '/',
  querystring: { pretty: 'true' }
}, params => {
  expectType<MockPatternHTTP>(params)
  return { status: 'ok' }
})

mock.add({
  method: 'POST',
  path: '/',
  querystring: { pretty: 'true' },
  body: { foo: 'bar' }
}, params => {
  expectType<MockPatternHTTP>(params)
  return { status: 'ok' }
})

mock.add({
  method: 'POST',
  path: '/_bulk',
  body: [{ foo: 'bar' }]
}, params => {
  expectType<MockPatternHTTP>(params)
  return { status: 'ok' }
})

mock.add({
  method: 'GET',
  path: '/'
}, params => {
  expectType<MockPatternHTTP>(params)
  return 'ok'
})

mock.add({
  api: 'info'
}, params => {
  expectType<MockPatternHTTP>(params)
  return 'ok'
})

mock.add({
  api: 'info',
  querystring: { pretty: 'true' }
}, params => {
  expectType<MockPatternHTTP>(params)
  return 'ok'
})

mock.add({
  api: 'search',
  body: { query: { match: { foo: 'bar' } } }
}, params => {
  expectType<MockPatternHTTP>(params)
  return 'ok'
})

// querystring should only have string values
expectError(
  mock.add({
    method: 'GET',
    path: '/',
    querystring: { pretty: true }
  }, () => {
    return { status: 'ok' }
  })
)

// missing resolver function
expectError(
  mock.add({
    method: 'GET',
    path: '/'
  })
)