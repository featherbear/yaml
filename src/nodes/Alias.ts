import { StringifyContext } from '../stringify/stringify.js'
import { ALIAS, isAlias, isCollection, isPair, Node, NodeBase } from './Node.js'
import { toJS, ToJSContext } from './toJS.js'

export declare namespace Alias {
  interface Parsed extends Alias {
    range: [number, number]
  }
}

export class Alias<T extends Node = Node> extends NodeBase {
  source: T

  constructor(source: T) {
    super(ALIAS)
    this.source = source
    Object.defineProperty(this, 'tag', {
      set() {
        throw new Error('Alias nodes cannot have tags')
      }
    })
  }

  toJSON(arg?: unknown, ctx?: ToJSContext) {
    if (!ctx)
      return toJS(this.source, typeof arg === 'string' ? arg : null, ctx)
    const { anchors, maxAliasCount } = ctx
    const anchor = anchors && anchors.get(this.source)
    /* istanbul ignore if */
    if (!anchor || anchor.res === undefined) {
      const msg = 'This should not happen: Alias anchor was not resolved?'
      throw new ReferenceError(msg)
    }
    if (maxAliasCount >= 0) {
      anchor.count += 1
      if (anchor.aliasCount === 0)
        anchor.aliasCount = getAliasCount(this.source, anchors)
      if (anchor.count * anchor.aliasCount > maxAliasCount) {
        const msg =
          'Excessive alias count indicates a resource exhaustion attack'
        throw new ReferenceError(msg)
      }
    }
    return anchor.res
  }

  // Only called when stringifying an alias mapping key while constructing
  // Object output.
  toString(
    { anchors, doc, implicitKey, inStringifyKey }: StringifyContext,
    _onComment?: () => void,
    _onChompKeep?: () => void
  ) {
    let anchor = Object.keys(anchors).find(a => anchors[a] === this.source)
    if (!anchor && inStringifyKey)
      anchor = doc.anchors.getName(this.source) || doc.anchors.newName()
    if (anchor) return `*${anchor}${implicitKey ? ' ' : ''}`
    const msg = doc.anchors.getName(this.source)
      ? 'Alias node must be after source node'
      : 'Source node not found for alias node'
    throw new Error(`${msg} [${this.range}]`)
  }
}

function getAliasCount(node: unknown, anchors: ToJSContext['anchors']): number {
  if (isAlias(node)) {
    const anchor = anchors && anchors.get(node.source)
    return anchor ? anchor.count * anchor.aliasCount : 0
  } else if (isCollection(node)) {
    let count = 0
    for (const item of node.items) {
      const c = getAliasCount(item, anchors)
      if (c > count) count = c
    }
    return count
  } else if (isPair(node)) {
    const kc = getAliasCount(node.key, anchors)
    const vc = getAliasCount(node.value, anchors)
    return Math.max(kc, vc)
  }
  return 1
}