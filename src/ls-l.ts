import { NS } from '@ns'
import { formatTable, asStr } from '/lib/util'

export async function main(ns : NS) : Promise<void> {
    
    const files = ns.ls(ns.getHostname()).filter(f => f.endsWith('.js') || f.endsWith('.txt'))
    const fileData = files.map(filename => {
        const contents = ns.read(filename)
        return {
            name: filename,
            size: contents.length,
            mem: ns.getScriptRam(filename),
            isGitControlled: contents.includes('//# sourceMappingURL'),
        }
    }).map(file => [file.name, ns.nFormat(file.size, '0.00 b'), ns.nFormat(file.mem * Math.pow(2,30), '0.00 b'), asStr(file.isGitControlled)])

    const table = formatTable(fileData, ["filename", "size", "mem", "git?"])
    ns.tprint("\n"+table.join("\n"))
}