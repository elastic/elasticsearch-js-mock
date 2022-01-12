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

const { Client } = require('@elastic/elasticsearch')
const Mock = require('./')

const mock = new Mock()
const client = new Client({
  node: 'http://localhost:9200',
  Connection: mock.getConnection()
})

mock.add({
  method: 'GET',
  path: '/_cat/health'
}, () => {
  return { status: 'ok' }
})

mock.add({
  method: 'HEAD',
  path: '*'
}, () => {
  return { ping: 'ok' }
})

mock.add({
  method: 'POST',
  path: '/test/_search'
}, () => {
  return {
    hits: {
      total: {
        value: 1,
        relation: 'eq'
      },
      hits: [
        { _source: { foo: 'bar' } }
      ]
    }
  }
})

mock.add({
  method: 'POST',
  path: '/test/_search',
  body: {
    query: {
      match: { foo: 'bar' }
    }
  }
}, () => {
  return {
    hits: {
      total: {
        value: 0,
        relation: 'eq'
      },
      hits: []
    }
  }
})

client.cat.health(console.log)

client.ping(console.log)

client.search({
  index: 'test',
  body: {
    query: { match_all: {} }
  }
}, console.log)

client.search({
  index: 'test',
  body: {
    query: {
      match: { foo: 'bar' }
    }
  }
}, console.log)
