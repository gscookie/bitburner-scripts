import { NS } from '@ns'
import { formatTable } from '/lib/util'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return [...data.servers]
}

export async function main(ns : NS) : Promise<void> {
    const target = ns.args.length > 0 ? ""+ns.args[0] : "home"
    const files = ns.ls(target).filter(f => f.endsWith('.js'))
    const fileSizes = files.map(f => [f.split(".")[0], ns.nFormat(ns.getScriptRam(f), '0.0B')]).sort((a,b) => a[0].localeCompare(b[0]))
    const table = formatTable(fileSizes, ["script", "RAM"]).join("\n")
    ns.tprint("Script Requirements for "+target+":\n"+table)
}