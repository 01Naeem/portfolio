import { z } from 'zod';

const protocolOk = (allowed) => (v) => {
  try {
    return allowed.includes(new URL(v).protocol);
  } catch {
    return false;
  }
};

// URLs end up in href/src attributes, so javascript:/data: schemes must never be accepted.
export const httpUrl = z.string().trim().max(500).refine(protocolOk(['http:', 'https:']), 'Must be an http(s) URL');
export const optionalHttpUrl = z.union([httpUrl, z.literal('')]).optional();
export const socialUrl = z.string().trim().max(500).refine(protocolOk(['http:', 'https:', 'mailto:']), 'Must be an http(s) or mailto URL');

export const image = z.object({
  url: httpUrl,
  publicId: z.string().max(200).optional(),
  alt: z.string().max(200).optional(),
});

export const tagList = (max = 40, len = 60) => z.array(z.string().trim().min(1).max(len)).max(max);
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const order = z.number().int().min(0).max(100000);
export const date = z.coerce.date().nullable();

export const reorderSchema = z.object({ ids: z.array(objectId).min(1).max(500) });
