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

import { BaseConnection } from '@elastic/elasticsearch'

declare class ClientMock {
  constructor()
  add(pattern: MockPattern, resolver: ResolverFn): ClientMock
  get(pattern: MockPattern): ResolverFn | null
  clear(pattern: Pick<MockPattern, 'method' | 'path'>): ClientMock
  clearAll(): ClientMock
  getConnection(): typeof BaseConnection
}

export declare type ResolverFn = (params: MockPattern) => Record<string, any> | string

export interface MockPattern {
  method: string | string[]
  path: string | string[]
  querystring?: Record<string, string>
  body?: Record<string, any> | Record<string, any>[]
}

export default ClientMock
