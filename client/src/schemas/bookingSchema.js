import { z } from 'zod';

/**
 * Zod validation schema for individual consignment parcel items
 */
export const parcelItemSchema = z.object({
  parcelType: z
    .string()
    .trim()
    .min(1, 'Parcel type is required'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
  weight: z.coerce
    .number({ invalid_type_error: 'Weight must be a number' })
    .min(0, 'Weight must be 0 or greater')
    .optional()
    .default(0),
  charge: z.coerce
    .number({ invalid_type_error: 'Charge must be a number' })
    .min(0, 'Charge must be 0 or greater'),
  notes: z
    .string()
    .optional()
    .default(''),
});

/**
 * Zod validation schema for the entire parcel booking form
 */
export const bookingFormSchema = z.object({
  fromCity: z
    .string()
    .trim()
    .min(1, 'Origin city is required'),
  toCity: z
    .string()
    .trim()
    .min(1, 'Destination city is required'),
  deliveryAddress: z
    .string()
    .trim()
    .min(2, 'Delivery address / collection stop is required'),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Must be a valid 10-digit mobile number'),
  customerName: z
    .string()
    .trim()
    .min(1, 'Sender name is required'),
  receiverPhone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), {
      message: 'Must be a valid 10-digit mobile number',
    }),
  receiverName: z
    .string()
    .trim()
    .optional(),
  paymentStatus: z
    .string()
    .default('PAID'),
  items: z
    .array(parcelItemSchema)
    .min(1, 'Please add at least one parcel item'),
  totalAmount: z.coerce
    .number({ invalid_type_error: 'Total amount must be a number' })
    .positive('Total LR freight charge must be greater than ₹0'),
});
