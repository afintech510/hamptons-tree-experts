import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = process.env.HTE_DATA_DIR || join(process.cwd(), ".data");
const LEADS_FILE = join(DATA_DIR, "leads.json");

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  createdAt: string;
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readLeads(): Promise<Lead[]> {
  try {
    const data = await readFile(LEADS_FILE, "utf-8");
    return JSON.parse(data) as Lead[];
  } catch {
    return [];
  }
}

async function appendLead(lead: Lead) {
  await ensureDataDir();
  const leads = await readLeads();
  leads.push(lead);
  await writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
}

export async function POST(request: Request) {
  const body = await request.json();

  const { name, email, phone, service, message } = body as {
    name?: string;
    email?: string;
    phone?: string;
    service?: string;
    message?: string;
  };

  if (!name || !email || !phone) {
    return NextResponse.json(
      { error: "Name, email, and phone are required." },
      { status: 400 }
    );
  }

  const lead: Lead = {
    id: crypto.randomUUID(),
    name,
    email,
    phone,
    service: service || "",
    message: message || "",
    createdAt: new Date().toISOString(),
  };

  await appendLead(lead);

  return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
}
