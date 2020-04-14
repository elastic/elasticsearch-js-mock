// Licensed to Elasticsearch B.V under one or more agreements.
// Elasticsearch B.V licenses this file to you under the Apache 2.0 License.
// See the LICENSE file in the project root for more information

import { Connection } from '@elastic/elasticsearch'

declare class ClientMock {
  constructor()
  add(pattern: MockPattern, resolver: ResolverFn): ClientMock
  get(pattern: MockPatternHTTP): ResolverFn | null
  getConnection(): typeof Connection
}

export declare type ResolverFn = (params: MockPatternHTTP) => Record<string, any> | string

export interface MockPatternHTTP {
  method: string | string[]
  path: string | string[]
  querystring?: Record<string, string>
  body?: Record<string, any>
}

export interface MockPatternAPI {
  api: string
  querystring?: Record<string, string>
  body?: Record<string, any>
}

export type MockPattern = MockPatternHTTP | MockPatternAPI

export default ClientMock