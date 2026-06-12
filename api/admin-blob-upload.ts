import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: Request) {
  // Simple auth to prevent abuse
  const auth = request.headers.get('authorization');
  if (auth !== 'Bearer temp-admin-upload-secret') {
    return new Response('Unauthorized', { status: 401 });
  }

  const filename = request.headers.get('x-filename');
  if (!filename) {
    return new Response('Missing filename', { status: 400 });
  }

  try {
    const blob = await put(`players/${filename}`, request.body as ReadableStream, {
      access: 'public',
      addRandomSuffix: false, // We want the deterministic filename like MEX-4.jpg
    });
    
    return Response.json({ url: blob.url });
  } catch (error: any) {
    console.error('Blob upload failed:', error);
    return new Response(error.message, { status: 500 });
  }
}
