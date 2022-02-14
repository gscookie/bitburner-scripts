function padLeft(value: string, len: number): string {
    if (value.length >= len) { return value }

    return " ".repeat(len - value.length) + value
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatCell(val: string | number | boolean | any): string {
    const valType = typeof val
    if (valType === 'string') {
        return val as string
    } else if (valType === 'number') {
        return (val as number).toLocaleString()
    } else if (valType === 'boolean') {
        return (val as boolean) ? 'true' : 'false'
    } else {
        return asStr(val)
    }
}

export function formatTable(table: (string | number)[][], headers: (string | number)[] | undefined = undefined, sep = " | "): string[] {
    const combinedTable = (headers === undefined) ? table : [headers].concat(table)
    const strTable = combinedTable.map(row => row.map(c => formatCell(c)))
    const numCols = Math.max(...strTable.map(row => row.length))
    const colWidths = [...Array(numCols)].map((_, i) => Math.max(...strTable.map(row => row[i]?.length || 0)))
    return strTable.map(row => row.map((c, i) => padLeft(c, colWidths[i])).join(sep))
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function asStr(value: any): string {
    return `${value}`
}

export function indexesUntil(endExclusive: number): number[] {
    return [...Array(endExclusive)].map((_, i) => i)
}

export function msToTime(ms: number): string {
    const seconds = (ms / 1000).toFixed(1);
    const minutes = (ms / (1000 * 60)).toFixed(1);
    const hours = (ms / (1000 * 60 * 60)).toFixed(1);
    const days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
    if (parseFloat(seconds) < 60) return seconds + " Sec";
    else if (parseFloat(minutes) < 60) return minutes + " Min";
    else if (parseFloat(hours) < 24) return hours + " Hrs";
    else return days + " Days"
}

export function generateRandomUUID(): string {
    // UUIDs have 16 byte values
    const bytes = new Uint8Array(16);
    // Seed bytes with cryptographically random values
    crypto.getRandomValues(bytes);
    // Set required fields for an RFC 4122 random UUID
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    // Convert bytes to hex and format appropriately
    const uuid = Array.prototype.map.call(bytes, (b, i) => {
        // Left-pad single-character values with 0,
        // Convert to hexadecimal,
        // Add dashes
        return ((b < 16) ? "0" : "") +
            b.toString(16) +
            (((i % 2) && (i < 10) && (i > 2)) ? "-" : "");
    }).join("");
    // Return the string
    return uuid;
}

const GB = Math.pow(2, 30)

export function moneyStr(ns: NS, amount: number): string { return ns.nFormat(amount, '$0.00a') }
export function ramStr(ns: NS, amount: number): string { return ns.nFormat(amount * GB, '$0.00a') }
export function timeStr(ns: NS, ms: number): string { return msToTime(ms) }