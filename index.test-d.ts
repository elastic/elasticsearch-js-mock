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

import { expectType, expectError } from 'tsd'
import { Client } from '@elastic/elasticsearch'
import Mock, { MockPattern } from './'

const mock = new Mock()
const client = new Client({
  node: 'http://localhost:9200',
  Connection: mock.getConnection()
})

mock.add({
  method: 'GET',
  path: '/'
}, params => {
  expectType<MockPattern>(params)
  return { status: 'ok' }
})

mock.add({
  method: ['GET', 'POST'],
  path: ['/_search', '/:index/_search']
}, params => {
  expectType<MockPattern>(params)
  return { status: 'ok' }
})

mock.add({
  method: 'GET',
  path: '/',
  querystring: { pretty: 'true' }
}, params => {
  expectType<MockPattern>(params)
  return { status: 'ok' }
})

mock.add({
  method: 'POST',
  path: '/',
  querystring: { pretty: 'true' },
  body: { foo: 'bar' }
}, params => {
  expectType<MockPattern>(params)
  return { status: 'ok' }
})

mock.add({
  method: 'POST',
  path: '/_bulk',
  body: [{ foo: 'bar' }]
}, params => {
  expectType<MockPattern>(params)
  return { status: 'ok' }
})

mock.add({
  method: 'GET',
  path: '/'
}, params => {
  expectType<MockPattern>(params)
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
