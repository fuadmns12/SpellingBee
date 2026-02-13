import { NextResponse } from "next/server";
import { networkInterfaces } from "os";

function getLanIPv4() {
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    const list = nets[name] ?? [];
    for (const net of list) {
      if (net.family !== "IPv4" || net.internal) continue;

      const ip = net.address;
      const isPrivate =
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);

      if (isPrivate) {
        return ip;
      }
    }
  }

  return null;
}

export async function GET() {
  const ip = getLanIPv4();
  return NextResponse.json({ ip });
}
