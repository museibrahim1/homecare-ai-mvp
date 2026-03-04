export interface Env {
  TASKS: KVNamespace;
  API_SECRET: string;
}

interface EmailMessage {
  readonly from: string;
  readonly to: string;
  readonly headers: Headers;
  readonly raw: ReadableStream;
  readonly rawSize: number;
  setReject(reason: string): void;
  forward(rcptTo: string, headers?: Headers): Promise<void>;
}

async function streamToText(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(combined);
}

function parseEmailBody(rawEmail: string): { subject: string; textBody: string } {
  const headerEnd = rawEmail.indexOf("\r\n\r\n");
  const headers = headerEnd > 0 ? rawEmail.substring(0, headerEnd) : rawEmail;
  const body = headerEnd > 0 ? rawEmail.substring(headerEnd + 4) : "";

  const subjectMatch = headers.match(/^Subject:\s*(.+?)$/im);
  const subject = subjectMatch ? subjectMatch[1].trim() : "(no subject)";

  const contentTypeMatch = headers.match(/^Content-Type:\s*(.+?)$/im);
  const contentType = contentTypeMatch ? contentTypeMatch[1].toLowerCase() : "text/plain";

  let textBody = body;

  if (contentType.includes("multipart")) {
    const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const parts = body.split(`--${boundary}`);
      for (const part of parts) {
        if (part.toLowerCase().includes("content-type: text/plain")) {
          const partBodyStart = part.indexOf("\r\n\r\n");
          if (partBodyStart > 0) {
            textBody = part.substring(partBodyStart + 4).trim();
            break;
          }
        }
      }
    }
  }

  textBody = textBody.replace(/--[^\r\n]+--\s*$/, "").trim();

  if (textBody.length > 5000) {
    textBody = textBody.substring(0, 5000) + "\n...(truncated)";
  }

  return { subject, textBody };
}

export default {
  async email(message: EmailMessage, env: Env): Promise<void> {
    const from = message.from;
    const to = message.to;

    const rawText = await streamToText(message.raw);
    const { subject, textBody } = parseEmailBody(rawText);

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const task = {
      id: taskId,
      from,
      to,
      subject,
      body: textBody,
      received_at: new Date().toISOString(),
      status: "pending",
    };

    await env.TASKS.put(taskId, JSON.stringify(task), {
      expirationTtl: 86400 * 7,
    });

    const index = await env.TASKS.get("__task_index");
    const taskIds: string[] = index ? JSON.parse(index) : [];
    taskIds.push(taskId);
    if (taskIds.length > 200) taskIds.splice(0, taskIds.length - 200);
    await env.TASKS.put("__task_index", JSON.stringify(taskIds));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const auth = request.headers.get("Authorization");

    if (auth !== `Bearer ${env.API_SECRET}`) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/tasks" && request.method === "GET") {
      const index = await env.TASKS.get("__task_index");
      const taskIds: string[] = index ? JSON.parse(index) : [];

      const pendingTasks = [];
      for (const id of taskIds) {
        const raw = await env.TASKS.get(id);
        if (!raw) continue;
        const task = JSON.parse(raw);
        if (task.status === "pending") {
          pendingTasks.push(task);
        }
      }

      return new Response(JSON.stringify({ tasks: pendingTasks }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/tasks/ack" && request.method === "POST") {
      const body = await request.json() as { task_id: string };
      const raw = await env.TASKS.get(body.task_id);
      if (raw) {
        const task = JSON.parse(raw);
        task.status = "acknowledged";
        task.acknowledged_at = new Date().toISOString();
        await env.TASKS.put(body.task_id, JSON.stringify(task), {
          expirationTtl: 86400 * 7,
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", time: new Date().toISOString() }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};
