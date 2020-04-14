'use strict'

const {
  existsSync,
  readdirSync,
  renameSync,
  createReadStream,
  createWriteStream,
  writeFileSync
} = require('fs')
const { pipeline } = require('stream')
const { join } = require('path')
const get = require('simple-get')
const minimist = require('minimist')
const tar = require('tar')
const gunzip = require('gunzip-maybe')

const esFolder = join(__dirname, 'elasticsearch')
const apiFolder = join(esFolder, 'rest-api-spec', 'src', 'main', 'resources', 'rest-api-spec', 'api')
const xPackFolder = join(esFolder, 'x-pack', 'plugin', 'src', 'test', 'resources', 'rest-api-spec', 'api')

async function generate (opts) {
  if (!existsSync(esFolder)) {
    await downloadElasticsearch(opts.tag || opts.branch)
    await unTarElasticsearch()
  }

  const oss = buildPaths(apiFolder)
  const xpack = buildPaths(xPackFolder)
  const pathsDb = { ...oss, ...xpack }

  writeFileSync(
    join(__dirname, '..', 'paths.json'),
    opts.pretty ? JSON.stringify(pathsDb, null, 2) : JSON.stringify(pathsDb),
    'utf8'
  )
}

function buildPaths (folder) {
  const pathsDb = {}
  const folderContents = readdirSync(folder)
  for (const file of folderContents) {
    if (file === '_common.json') continue
    const spec = require(join(folder, file))
    const api = Object.keys(spec)[0]
    const { paths } = spec[api].url
    pathsDb[api] = {
      path: paths.map(p => formatPath(p.path)),
      method: [...new Set(paths.flatMap(p => p.methods))]
    }
  }
  return pathsDb
}

function downloadElasticsearch (ref = 'master') {
  console.log('starting download of Elasticsearch ..')
  return new Promise((resolve, reject) => {
    const opts = {
      url: `https://api.github.com/repos/elastic/elasticsearch/tarball/${ref}`,
      headers: {
        'user-agent': 'elastic/elasticsearch-js-mock'
      }
    }
    get(opts, (err, res) => {
      if (err) return reject(err)
      if (res.statusCode >= 400) {
        return reject(new Error(`Something went wrong: ${res.statusCode}`))
      }
      const stream = createWriteStream(join(__dirname, 'elasticsearch.tar.gz'))
      pipeline(res, stream, err => {
        console.log('download of Elasticsearch completed.')
        if (err) return reject(err)
        resolve()
      })
    })
  })
}

function unTarElasticsearch () {
  console.log('starting untar of Elasticsearch ..')
  return new Promise((resolve, reject) => {
    const stream = createReadStream(join(__dirname, 'elasticsearch.tar.gz'))
    pipeline(stream, gunzip(), tar.extract(), err => {
      if (err) return reject(err)
      for (const dir of readdirSync(join(__dirname, '..'))) {
        if (dir.startsWith('elastic-elasticsearch-')) {
          renameSync(dir, esFolder)
          break
        }
      }
      console.log('Elasticsearch completely unpacked.')
      resolve()
    })
  })
}

function formatPath (path) {
  return path
    .split('/')
    .map(p => p.startsWith('{') ? `:${p.slice(1, -1)}` : p)
    .join('/')
}

if (require.main === module) {
  generate(minimist(process.argv.slice(2), {
    string: ['tag', 'branch'],
    boolean: ['pretty']
  })).catch(console.log)
}
