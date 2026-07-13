import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

/**
 * Validates request bodies against a zod schema imported from
 * @sitetrack/shared-types -- the same schema React Hook Form uses on the
 * frontend, so validation rules only ever live in one place.
 *
 * Usage: @Body(new ZodValidationPipe(createVendorSchema)) dto: CreateVendorInput
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Validation failed",
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
