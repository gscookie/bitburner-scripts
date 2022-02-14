import { NS } from '@ns'
import { generateRandomUUID } from '/lib/util'


export async function main(ns: NS): Promise<void> {
  const findProp = (propName: string) => {
    for (const div of eval("document").querySelectorAll("div")) {
      const propKey = Object.keys(div)[1];
      if (!propKey) continue;
      const props = div[propKey];
      if (props.children?.props && props.children.props[propName]) return props.children.props[propName];
      if (props.children instanceof Array) for (const child of props.children) if (child?.props && child.props[propName]) return child.props[propName];
    }
  };

  const findAllProps = () => {
    const propNames: Set<string> = new Set()
    for (const div of eval("document").querySelectorAll("div")) {
      const propKey = Object.keys(div)[1];
      if (!propKey) continue;
      const props = div[propKey];
      if (props.children?.props) Object.keys(props.children.props).forEach(k => propNames.add(k))
      if (props.children instanceof Array) for (const child of props.children) if (child?.props) Object.keys(child.props).forEach(k => propNames.add(k))
    }
    return propNames
  };

  const propNames = findAllProps()
  ns.tprint(`Found ${propNames.size} props: [${[...propNames.values()].sort((a, b) => a.localeCompare(b))}]`)
  ns.tprint(`Player.moneySourceA.toJSON().data:\n${JSON.stringify(findProp("player")["moneySourceA"].toJSON().data, undefined, 2)}`)

  const p = findProp("player")

  if (ns.args[0] == 'devmenu') {
    findProp('router')["toDevMenu"]()
  }

  const ascentIdSeed = ns.scan("home").map(s => ns.getServer(s)).filter(s => !s.purchasedByPlayer && !["darkweb"].includes(s.hostname)).sort((a, b) => a.ip.localeCompare(b.ip)).map(s => s.ip.replaceAll('.', '')).join('')
  const nSeed = parseInt(ascentIdSeed)
  ns.tprint("Seed: " + ascentIdSeed)
  ns.tprint("nSeed: " + nSeed)

  const bc = new BroadcastChannel("test-channel")
  const channelID = `${ns.getScriptName()}-${generateRandomUUID()}`

  bc.onmessage = (ev) => { ns.tprint(`[Sandbox.js] BCMSG: "${JSON.stringify(ev)}"`) }

  bc.postMessage([channelID, "test from sandbox"])
  ns.tprint(Object.keys(bc))

  await ns.sleep(10000)
  bc.close()
}