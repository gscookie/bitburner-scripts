/* eslint-disable @typescript-eslint/no-explicit-any */
declare let React: any

// colorPrint("green","This message ","white","can ","cyan","have ","#f39c12","Colors!")
export function colorPrint(args: string[]): void {
    //if (arguments.length % 2 != 0) throw("colorPrint arguments must come in pairs. Color,Text")
    const findProp = (propName: string) => {
        for (const div of eval("document").querySelectorAll("div")) {
            const propKey = Object.keys(div)[1];
            if (!propKey) continue;
            const props = div[propKey];
            if (props.children?.props && props.children.props[propName]) return props.children.props[propName];
            if (props.children instanceof Array) for (const child of props.children) if (child?.props && child.props[propName]) return child.props[propName];
        }
    };
    const term = findProp("terminal");

    const out = [];
    for (let i = 0; i < args.length; i += 2) {
        out.push(React.createElement("span", { style: { color: `${args[i]}` } }, args[i + 1]))
    }
    term.printRaw(out);
}