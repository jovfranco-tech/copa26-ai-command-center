import { put } from '@vercel/blob';

function passwordOk(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided = request.headers.get('x-admin-password') ?? '';
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request): Promise<Response> {
  if (!passwordOk(request)) return Response.json({ ok: false, error: 'auth' }, { status: 401 });
  
  const filename = request.headers.get('x-filename');
  if (!filename) return Response.json({ ok: false, error: 'missing-filename' }, { status: 400 });

  if (!request.body) return Response.json({ ok: false, error: 'missing-body' }, { status: 400 });

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
      addRandomSuffix: false, // Prevents duplicate photos and keeps URLs predictable
      allowOverwrite: true,
    });
    return Response.json({ ok: true, url: blob.url });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
