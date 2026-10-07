import { z } from 'zod';

const oneLine = (s) => /^[^\r\n]+$/.test(s); // blocks email header injection via name/subject

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80).refine(oneLine, 'No line breaks allowed'),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  subject: z.string().trim().min(3, 'Subject is too short').max(150).refine(oneLine, 'No line breaks allowed'),
  message: z.string().trim().min(10, 'Message is too short').max(3000),
  website: z.string().max(200).optional(), // honeypot: real users never see or fill this
});
