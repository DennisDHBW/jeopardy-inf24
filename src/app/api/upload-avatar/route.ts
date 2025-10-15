import { NextRequest } from 'next/server';
import { db } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

async function uploadToCloudinaryOrLocal(file: File) {
  const cloudinaryUrl = process.env.CLOUDINARY_API_URL || process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    const form = new FormData();
    form.append('file', file as unknown as Blob);
    const res = await fetch(cloudinaryUrl, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Failed to upload image to cloudinary');
    const json = await res.json();
    return json.secure_url ?? json.url;
  }

  const arrayBuffer = await (file as any).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const originalName = (file as any).name ?? 'avatar';
  const ext = path.extname(originalName) || '.png';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${fileName}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = String(formData.get('userId') ?? '');
    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });

    const file = formData.get('avatar') as File | null;
    if (!file) return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });

    const url = await uploadToCloudinaryOrLocal(file);

    await db.update(user).set({ image: url }).where(eq(user.id, userId));

    revalidatePath('/', 'layout');

    return new Response(JSON.stringify({ success: true, url }), { status: 200 });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('upload-avatar route error', err);
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Upload failed' }), { status: 500 });
  }
}
