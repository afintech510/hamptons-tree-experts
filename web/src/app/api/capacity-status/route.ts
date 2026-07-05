import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = process.env.HTE_DATA_DIR || join(process.cwd(), ".data");
const STATUS_FILE = join(DATA_DIR, "capacity-status.json");

interface CapacityStatus {
  paused: boolean;
  message: string;
  updatedAt: string;
}

const DEFAULT_STATUS: CapacityStatus = {
  paused: false,
  message: "",
  updatedAt: new Date().toISOString(),
};

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readStatus(): Promise<CapacityStatus> {
  try {
    const data = await readFile(STATUS_FILE, "utf-8");
    return JSON.parse(data) as CapacityStatus;
  } catch {
    return DEFAULT_STATUS;
  }
}

async function writeStatus(status: CapacityStatus) {
  await ensureDataDir();
  await writeFile(STATUS_FILE, JSON.stringify(status, null, 2));
}

export async function GET() {
  const status = await readStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const adminKey = request.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_PAUSE_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<CapacityStatus>;
  const current = await readStatus();

  const updated: CapacityStatus = {
    paused: body.paused ?? current.paused,
    message:
      body.message ??
      (body.paused
        ? "We're currently booked to capacity this week. Leave your details and we'll reach out when a slot opens."
        : ""),
    updatedAt: new Date().toISOString(),
  };

  await writeStatus(updated);
  return NextResponse.json(updated);
}
