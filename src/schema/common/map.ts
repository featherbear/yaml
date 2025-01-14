import type { CreateNodeContext } from '../../doc/createNode.js'
import { isMap } from '../../nodes/identity.js'
import { createPair } from '../../nodes/Pair.js'
import { YAMLMap } from '../../nodes/YAMLMap.js'
import type { CollectionTag } from '../types.js'
import type { Schema } from '../Schema.js'

function createMap(schema: Schema, obj: unknown, ctx: CreateNodeContext) {
  const { keepUndefined, replacer } = ctx
  const map = new YAMLMap(schema)
  const add = (key: unknown, value: unknown) => {
    if (typeof replacer === 'function') value = replacer.call(obj, key, value)
    else if (Array.isArray(replacer) && !replacer.includes(key)) return
    if (value !== undefined || keepUndefined)
      map.items.push(createPair(key, value, ctx))
  }
  if (obj instanceof Map) {
    for (const [key, value] of obj) add(key, value)
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) add(key, (obj as any)[key])
  }
  if (typeof schema.sortMapEntries === 'function') {
    map.items.sort(schema.sortMapEntries)
  }
  return map
}

export const map: CollectionTag = {
  collection: 'map',
  createNode: createMap,
  default: true,
  nodeClass: YAMLMap,
  tag: 'tag:yaml.org,2002:map',
  resolve(map, onError) {
    if (!isMap(map)) onError('Expected a mapping for this tag')
    return map
  }
}
