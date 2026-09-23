import { BlockList, isIP } from "node:net";

/**
 * Ranges the server must never fetch from on a user's behalf: loopback,
 * private networks (Railway's private network is IPv6 ULA), link-local (cloud
 * metadata lives at 169.254.169.254), and reserved/special-purpose blocks.
 */
const IPV4_BLOCKED: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const IPV6_BLOCKED: Array<[string, number]> = [
  // Unspecified, loopback, and deprecated IPv4-compatible addresses.
  ["::", 96],
  // IPv4-mapped (::ffff:127.0.0.1). DNS hands back plain IPv4 for real hosts,
  // so nothing legitimate needs these, and they'd smuggle blocked IPv4 through.
  ["::ffff:0:0", 96],
  // NAT64, which also embeds IPv4.
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  // 6to4, which embeds IPv4.
  ["2002::", 16],
  // Unique local: Railway's private network.
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
];

// One list per family: BlockList also checks IPv4 addresses against IPv6
// rules (as IPv4-mapped), so a shared list would let ::ffff:0:0/96 block all of IPv4.
const blockedV4 = new BlockList();
for (const [address, prefix] of IPV4_BLOCKED) blockedV4.addSubnet(address, prefix, "ipv4");
const blockedV6 = new BlockList();
for (const [address, prefix] of IPV6_BLOCKED) blockedV6.addSubnet(address, prefix, "ipv6");

/** True only for a literal IP on the public internet. Anything unparseable is refused. */
export function isPublicAddress(ip: string): boolean {
  const address = ip.replace(/^\[|\]$/g, "");
  const family = isIP(address);
  if (family === 0) return false;
  try {
    return family === 4 ? !blockedV4.check(address, "ipv4") : !blockedV6.check(address, "ipv6");
  } catch {
    // e.g. a zone id ("fe80::1%eth0") BlockList can't parse.
    return false;
  }
}
