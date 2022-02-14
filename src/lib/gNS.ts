import { NS } from '@ns'

let _ns: NS | undefined = undefined

export function ns(): NS {
    if(_ns === undefined) throw 'ns() called before nsInit(ns)!'
    return _ns as NS
}

export function nsInit(ns: NS): void {
    _ns = ns
}